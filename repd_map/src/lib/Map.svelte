<script>
    import { onMount, onDestroy } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import Chart from 'chart.js/auto';
    import { cubicIn, cubicOut } from "svelte/easing";
    import { slide } from 'svelte/transition';
    import gsap from 'gsap';
    import DelayTimesVisualization from '$lib/components/DelayTimesVisualization.svelte'
    // Props
    export let points = []; // GeoJSON features
    export let nimby_score = [];
    export let refused = [];
    export let sizeProperty = 'Installed Capacity (MWelec)';
    export let typeProperty = 'Technology Type';

    export let refProperty = 'Ref ID';

    export let minSize = 20;
    export let maxSize = 50;
    let coloringMode = 'nimby'; // Start with NIMBY coloring, options are 'nimby' or 'type'

    // DOM elements 
    let mapContainer;
    let nimbyRadarCanvas;
    let sidebarContent;
    const typeItems = [
    { label: 'Battery', color: '#004C99' },
    { label: 'Solar', color: '#E6B800' },
    { label: 'Wind', color: '#00857D' },
    { label: 'Other', color: '#FFFFFF' }
  ];
    // State variables
    let map;
    let selectedFeature = null;
    let nimby_choice = null;
    let speed = 0;
    let rpm = 0;
    let radarChart = null;
    let showSubmitForm = false;
    let articleUrl = '';
    let articleNotes = '';
    
    // Date filter
    let startDate = '2020-01-01';
    let endDate = '2025-01-01';
    let technologyType = 'all';
    const accuracy2 = nimby_score.filter(item => item['Accuracy Score'] >= 30)
    const accuracy3 = nimby_score.filter(item => item['Accuracy Score'] < 70 && item['Accuracy Score'] >= 50 )
    const accuracy1 = nimby_score.filter(item => item['Accuracy Score'] >= 70)
    const accuracy_bad = nimby_score.filter(item => item['Accuracy Score'] < 30)
    const nimbyRefIds = new Set(accuracy1.map(item => item.refid || ''));
    const nimbyRefIds2 = new Set(accuracy_bad.map(item => item.refid || ''));
    const nimbyRefIds3 = new Set(accuracy2.map(item => item.refid || ''));
    const nimbyRefIds4 = new Set(accuracy3.map(item => item.refid || ''));
    let stats = [
        { label: 'Total Capacity Lost', value: '6584', calculate: calculateTotalCapacity, trend:'MW'},
        { label: 'Application Withdrawn', value: '23', calculate: calculateLengthW, trend:'Since January 2020'},
        { label: 'Permission Refused', value: '12', calculate: calculateLength, trend:'Since January 2020'},
        { label: 'Total Projects Cancelled', value: '156', calculate: calculateLengthA, trend:'Since January 2020'}
    ];
    
    const allowedProperties = ['Operator (or Applicant)', 'Site Name', 'Technology Type', 'Installed Capacity (MWelec)', 'Development Status', 'Planning Permission Refused', 'Planning Application Withdrawn', 'Planning Application Submitted'];

    // Animation timer
    let animationTimer;
    function updateCircleColors() {
    if (coloringMode === 'nimby') {
        // NIMBY-based coloring
        map.setPaintProperty('unclustered-point', 'circle-color', '#ffffff'); // Base color

        map.setPaintProperty('unclustered-point', 'circle-color', [
            'case',
            ['in', ['get', refProperty], ['literal', [...nimbyRefIds]]],
            '#97001b',  // Has nimby details - darker red
            [
                'case',
                ['in', ['get', refProperty], ['literal', [...nimbyRefIds3]]],
                '#FF446b',  // Has nimby details - darker red
                [
                    'case',    
                    ['in', ['get', refProperty], ['literal', [...nimbyRefIds2]]],
                    '#a698b8',
                    '#d3d3d3'   // No nimby details - gray
                ]
            ]
        ]);
        // Reset stroke to a simple style
        map.setPaintProperty('unclustered-point', 'circle-stroke-color', '#000000');
        map.setPaintProperty('unclustered-point', 'circle-stroke-width', 0.5);
    } else {
        // Type-based coloring
        map.setPaintProperty('unclustered-point', 'circle-color', '#ffffff'); // Base color
        // Use the type colors for the stroke
        map.setPaintProperty('unclustered-point', 'circle-color', [
                        'match',
                        ['get', typeProperty],  // Get the value of typeProperty
                        'Battery', '#004C99',   // Blue for battery
                        'Solar Photovoltaics', '#E6B800',     // Gold for solar
                        'Wind Onshore', '#00CC66',      // Green for wind
                        '#FFFFFF'              // Default color if none match
        ]);
        map.setPaintProperty('unclustered-point', 'circle-stroke-width', 2);
    }


}
function toggleColorMode() {
        coloringMode = coloringMode === 'nimby' ? 'type' : 'nimby';
        updateCircleColors();
    }
    function calculateTotalCapacity(points) {
        const total = points.reduce((sum, point) => {
            const capacity = parseFloat(point.properties['Installed Capacity (MWelec)']) || 0;
            return sum + capacity;
        }, 0);
        return `${Math.round(total)}`;
    }
    function calculateLength(points) {
        // Count points with appeal information
        const appealsCount = points.filter(point => 
            point.properties['Development Status'] === 'Planning Permission Refused'
        ).length;
        return appealsCount.toString();
    }
    function calculateLengthW(points) {
        // Count points with appeal information
        const appealsCount = points.filter(point => 
            point.properties['Development Status'] === 'Planning Application Withdrawn'
        ).length;
        return appealsCount.toString();
    }
    function calculateLengthA(points) {
        // Count points with appeal information
        const appealsCount = points.length;
        return appealsCount.toString();
    }
    
    function initAnimation() {
        clearInterval(animationTimer);
        animationTimer = setInterval(() => {
            const timeFraction = (Date.now() % 6000) / 5000;
            speed = cubicIn(timeFraction) * 100;
            rpm = cubicOut(timeFraction) * 8000;
        }, 500);
    }
    
    function updateMapData() {
        if (!map) return;
        var filter  =  [
            'all',
            ['>=', ['get', 'Planning Application Submitted'], startDate],
            ['<=', ['get', 'Planning Application Submitted'], endDate]
        ];
        console.log(technologyType)
        if (technologyType == 'All') {
            filter.push(['==', ['get', 'Technology Type'], technologyType]);
        }
        map.setFilter('unclustered-point', filter);

        stats.forEach(stat => {
            const currentValue = stat.calculate(points);
            stat.value = currentValue;

        })
        stats = stats.map(stat => ({...stat}))
        // console.log(stats)
    }
    

    
    function initNimbyRadarChart() {
        if (!nimbyRadarCanvas || !nimby_choice) return;
        
        if (radarChart) {
            radarChart.destroy();
        }
        
        const ctx = nimbyRadarCanvas.getContext('2d');
        radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['NIMBY', 'Accuracy', 'Petty', 'Organized', 'Political'],
                datasets: [{
                    label: 'NimbyDEX',
                    data: [
                        nimby_choice["Nimby Score"], 
                        nimby_choice["Accuracy Score"], 
                        nimby_choice["Petty Score"], 
                        nimby_choice["Organized Score"], 
                        nimby_choice["Political Leaning"]
                    ],
                    backgroundColor: 'rgba(168, 200, 58, 0.2)',
                    borderColor: '#fbb03b',
                    pointBackgroundColor: '#fbb03b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 100
                    }
                },
                plugins: {
                    legend: { display: false }
                    
                }
            }
        });
    }
    
    function initMap() {
        if (map) return;
        
        map = new maplibregl.Map({
            container: mapContainer,
            style: 'https://api.maptiler.com/maps/aquarelle/style.json?key=cyYG5tvmi6dhPXwxXQXr',
            center: [-4, 55.20],
            zoom: 4.8
        });
        
        map.on('load', () => {
            // Add source
            map.addSource('points', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: points
                },
                cluster: false,
                clusterMaxZoom: 14,
                clusterRadius: 50
            });
            
            // Create a Set of refids from nimby_score for quick lookup

            // console.log(nimbyRefIds3)
            // const nimbyRefIds2 = new Set(nimby_score.map(item => [item.refid, ]));
            // console.log(nimbyRefIds2)
            map.addLayer({ 
                id: 'unclustered-point',
                type: 'circle',
                source: 'points',
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['coalesce', ['get', sizeProperty], 0],
                        0, 5,
                        200, 20
                    ],
                    'circle-stroke-width': 0,
                    'circle-stroke-opacity':0.5,

                    'circle-color': [
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        '#fbb03b',  // Selected color
                        [
                            'case',
                            ['in', ['get', refProperty], ['literal', [...nimbyRefIds]]],
                            '#97001b',  // Has nimby details - darker red
                            [
                                'case',
                                ['in', ['get', refProperty], ['literal', [...nimbyRefIds3]]],
                                '#FF446b',  // Has nimby details - darker red
                                [
                                    'case',    
                                        ['in', ['get', refProperty], ['literal', [...nimbyRefIds2]]],
                                        '#a698b8',
                                        '#d3d3d3'   // No nimby details - gray
                                ]
                            ]
                        ]
                    ],
                    'circle-opacity': 0
                }
            });
            setTimeout(() => {

                map.setPaintProperty('unclustered-point', 'circle-opacity-transition', {
                    duration: 800,  
                    delay: 100  
                });
                map.setPaintProperty('unclustered-point', 'circle-stroke-width-transition', {
                    duration: 800,  
                    delay: 100  
                });
                map.setPaintProperty('unclustered-point', 'circle-stroke-width', 1);  // Final opacity

                map.setPaintProperty('unclustered-point', 'circle-opacity', 0.8);  // Final opacity
            }, 300);  // Wait 300ms after layer is added before starting animation
            // Add interactivity
            map.on('mouseenter', 'unclustered-point', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            
            map.on('mouseleave', 'unclustered-point', () => {
                map.getCanvas().style.cursor = '';
            });
            
            // Handle click events
            map.on('click', 'unclustered-point', (e) => {
                if (!e.features.length) return;
                
                // Clear previous selection
                if (selectedFeature) {
                    console.log(selectedFeature)
                    map.setFeatureState(
                        { source: 'points', id: selectedFeature.properties["Ref ID"]},
                        { selected: false }
                    );
                }
                
                const feature = e.features[0];
                selectedFeature = feature;
                
                // Find corresponding nimby score by refid
                const featureId = feature.properties["Ref ID"];
                console.log(featureId)
                nimby_choice = nimby_score.find(score => score.refid === featureId);
                
                // Set new selection state
                map.setFeatureState(
                    { source: 'points', id: selectedFeature.properties["Ref ID"]},
                    { selected: true }
                );
                
                // Initialize nimby radar chart if nimby_choice exists
                if (nimby_choice) {
                    setTimeout(() => {
                        initNimbyRadarChart();
                        animateProperties();
                    }, 10);
                } else {
                    // Show UI for submitting a new article
                    nimby_choice = {
                        header: "No community information available yet",
                        "Interesting Tidbits": ["No information has been added for this project yet."],
                        "Snide Commentary": "Help us build our database by submitting information about this project!"
                    };
                }
            });
            
            // Initialize map data filter
            updateMapData();
        });
    }
    
    function animateProperties() {
        if (!sidebarContent) return;
        
        // Get all property rows
        const rows = sidebarContent.querySelectorAll('.property-row');
        
        // Reset any existing animations
        gsap.set(rows, { opacity: 0, y: 20 });
        
        // Create stagger animation for the rows
        gsap.to(rows, {
            duration: 0.5,
            opacity: 1,
            y: 0,
            stagger: 0.1,
            ease: 'power2.out'
        });
    }
    
    function resetSelection() {
        if (selectedFeature && map) {
            map.setFeatureState(
                { source: 'points', id: selectedFeature.id },
                { selected: false }
            );
            selectedFeature = null;
            nimby_choice = null;
            showSubmitForm = false;
            articleUrl = '';
            articleNotes = '';
        }
    }
    
    function handleSubmitArticle() {
        // This function would handle the submission - in a real app, you'd send this to your backend
        console.log('Article submitted:', {
            refid: selectedFeature?.properties?.id || selectedFeature?.id,
            siteName: selectedFeature?.properties['Site Name'],
            articleUrl,
            articleNotes
        });
        
        // Show success message and reset form
        alert('Thank you for your submission! We will review it shortly.');
        showSubmitForm = false;
        articleUrl = '';
        articleNotes = '';
    }
    
    // Lifecycle hooks
    onMount(() => {


        gsap.from(mapContainer, {
            opacity: 0,
            duration: 2, // Animation duration in seconds
            ease: 'power2.out', // Easing function
            delay: 0.5 // Optional: if you want to delay the animation
        });
        initMap();
        initAnimation();
    });
    
    onDestroy(() => {
        // Clean up resources
        if (map) map.remove();
        if (radarChart) radarChart.destroy();
        clearInterval(animationTimer);
    });
    
    // Reactive statements
    $: if (selectedFeature) {
        setTimeout(animateProperties, 0);
    }
    
    $: if (startDate || endDate || technologyType) {
        updateMapData();
    }
</script>

<div class="font-sans">
    <div class="sidebar" transition:slide>
        <div class="sidebar-header justify-center items-center ">
            <div class=" mb-4">
                {#if selectedFeature}
                    <div class="bg-white rounded-xl p-4 shadow-md">
                    <h2 class="text-md font-bold">{selectedFeature.properties['Site Name'] || 'NIMBYdex'}</h2>
                    <p class='text-xs'>Submitted: {selectedFeature.properties['Planning Application Submitted']}</p>
                    {#if selectedFeature.properties['Planning Permission Refused'] != 0}
                        <p class='text-xs'>Refused: {selectedFeature.properties['Planning Permission Refused']}</p>
                    {/if}

                    {#if selectedFeature.properties['Planning Permission Withdraw'] != 0}
                        <p class='text-xs'>Withdrawn: {selectedFeature.properties['Planning Permission Withdrawn']}</p>
                    {/if}
                    <p class="text-xs font-bold">Record Last Updated {selectedFeature.properties['Record Last Updated (dd/mm/yyyy)']}</p>

                    <button class="text-xs text-blue-500 mt-1" on:click={resetSelection}>← Back to overview</button>
                    </div>
                    {#if nimby_choice}
                    <div class="collapse collapse-arrow border-base-300 mt-3 mb-2 border">
                        <input type="checkbox" />
                        <div class="collapse-title text-sm mb-0 pb-0 bg-white">{selectedFeature.properties['Development Status']}</div>
                        <div class="collapse-content bg-white">
                            <table class="w-full table rounded-box border border-base-content/5 bg-base-100">

                                <tbody>
                                    {#each Object.entries(selectedFeature.properties).filter(([key]) => allowedProperties.includes(key)) as [key, value]}
                                        {#if key !== 'title'}
                                            <tr class="property-row"  style="opacity: 1;">
                                                <td>{key.replace(/_/g, ' ')}</td>
                                                <td>{value}</td>
                                            </tr>
                                        {/if}
                                    {/each}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="chat chat-start">
                        <div class="chat-image avatar">
                            <div class="w-10 rounded-full ring-primary ring ring-offset-2">
                              <img
                                alt="A small butterfly, illustrated"
                                src="./gif.gif" />
                            </div>
                          </div>
                        
                        <div class="chat-bubble bg-primary shadow-xl">
                        <p class="text-sm">{nimby_choice['header']}</p>
                        </div>
                        <div class="chat-footer opacity-50">Sent By NimbyDar - He may be wrong!</div>

                    </div>
                    {/if}

                {:else}
                <div class="flex bg-white rounded-xl p-4 shadow-md">
                    <div class="avatar">
                        <div class="w-12 rounded-md">
                            <img class='h-48' src="./lamplight.gif"/>
                        </div>
                    </div>
                    <div class='ml-1'>
                        <h1 class="text-xl font-bold">NIMBYdex</h1>
                        <p>UK Cancelled Renewable Projects Radar</p>
                    </div>
                </div>

                {/if}
            </div>

            <div style="height: 300px" class='bg-white p-4 rounded-xl shadow-xl'    class:hidden={!selectedFeature}>
                <h3 class="text-md font-bold align-center">NimbyDex Score</h3>
                <canvas bind:this={nimbyRadarCanvas}></canvas>
            </div>
            
            <div class="grid grid-cols-2 gap-4" class:hidden={selectedFeature}>
                {#each stats as stat}
                    <div class="stat place-items-center shadow bg-base-100 rounded-xl">
                        <div class="stat-title">{stat.label}</div>
                        <span class="stat-value">{stat.value}</span>
                        <span class="stat-desc">{stat.trend}</span>
                    </div>
                {/each}
            </div>
            <div class="bg-white rounded-xl p-4 shadow-md mt-6">
                <DelayTimesVisualization delayData={refused}/>
            </div>
            <article class:hidden={selectedFeature} class="prose mt-5 bg-white p-4 rounded-xl shadow-xl">
                <h2 class="text-sm">What's the Nimbydex?</h2>
                <p>
                    The NimbyDex is an experiment into analyzing issues plaguing UK renewables progress.
                    Gemini has been used in order to help identify potential news articles about sites.
                </p>

                <p>
                    The actual site information is factual and is using the governmental REPD dataset for cancelled renewable projects.
                    <b>The opinions themselves are made up, and the points don't matter.</b>
                </p>
                <p>
                    <b> On the map - Bright red denotes high certainty NIMBY-ness</b>
                </p>
                <div class="flex mt-5 justify-center items-center">

                 <a class='link', href='https://form.jotform.com/251386339530055'>Let's Talk!</a>
                </div>
                <div class="flex mt-5 justify-center items-center">
                    <br>
                    <a class='link' href='https://www.bemben.co.uk'>Made by Damian Bemben</a>
                    <br>
                </div>
                <div class="flex mt-5 justify-center items-center">

                    <a class="link" href="https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract"> V1.0.5 - REPD January 2025</a>
                </div>
            </article>
        </div>



        {#if selectedFeature && nimby_choice}
            <div class="sidebar-content" bind:this={sidebarContent}>
                <hr/>
                <ul  class="list bg-base-100 rounded-box shadow-md mt-2 mb-2">
                    <li class="p-4 pb-2 text-xs opacity-60 tracking-wide">3 'Fun' Facts about this Failure</li>

                    {#each nimby_choice['Interesting Tidbits'] || [] as tidbit}
                        <li class="list-row p-4">
                            <div class='list-col-grow text-sm'>
                                {tidbit}
                            </div>
                        </li>
                    {/each}
                </ul>
                

                <div class="chat chat-start">
                    <div class="chat-image avatar">
                        <div class="w-10 rounded-full ring-primary ring ring-offset-2">
                          <img
                            alt="A small butterfly, illustrated"
                            src="./gif.gif" />
                        </div>
                      </div>
                    <div class="chat-bubble bg-primary  shadow-xl">
                        {nimby_choice['Snide Commentary']}
                    </div>
                    <div class="chat-footer opacity-50">Sent By NimbyDar - He may be wrong! </div>

                </div>
            </div>
            
            <div class="flex mt-5 justify-center items-center">
                {#if nimby_choice && nimby_choice['article_url']}
                    <a href="{nimby_choice['article_url']}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
                        Potential Link/Article About This Project
                    </a>
                {:else}
                    <button class="btn btn-primary" on:click={() => showSubmitForm = true}>
                        Submit Information
                    </button>
                {/if}
            </div>
        {/if}
    </div>
    
    <div class="map-container" bind:this={mapContainer}></div>
    


    <div class='absolute top-2 right-2 transform bg-base-100 p-2 rounded-lg shadow-lg'>
        <div class="mb-2">
            <label class="mr-4"><b>From:</b>
                <input type="date" bind:value={startDate} on:input={updateMapData} />
            </label>
            <label><b>To:</b>
                <input type="date" bind:value={endDate} on:input={updateMapData} />
            </label>
            <br>
            <div class="mt-4">
                <button class="btn-primary" on:click={toggleColorMode}>
                    {coloringMode === 'nimby' ? 'Switch to Type Coloring' : 'Switch to NIMBY Coloring'}
                </button>
            </div>

            <div class="legend-items">
                {#each typeItems as item}
                  <div class="legend-item">
                    <div class="color-swatch" style="background-color: {item.color}"></div>
                    <div class="label p-0">{item.label}</div>
                  </div>
                {/each}
              </div>
        </div>
        <div>

        </div>
        <br>

    </div>
</div>

<style>
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    @plugin "@tailwindcss/typography";
    
    .hidden {
        display: none;
    }
    h1 {
        background: -webkit-radial-gradient(#b62121, #eb8e47);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent; 
    }
    .sidebar {
        position: absolute;
        left: 2vw;
        top: 1vw;
        height: calc(100% - 2vw);
        background: var(--navbar-dark-primary);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        color: var(--navbar-light-primary);
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        overflow: scroll;
        user-select: none;
        max-width: 33%;
        z-index: 50;    
        overflow-x: hidden;
        padding-right: 5px;
    }
    .chat {
        padding-left: 0.5rem;
    }
    .container {
        height: 100vh;
    }
    .color-swatch {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }
    .map-container {
        height: 100vh;
    }
    /* .sidebar {
        padding: 20px;
        overflow-y: auto;
    } */
    
    .chat-bubble {
        max-width: 90%;
    }
    
    .property-row {
        opacity: 0;
    }
</style>