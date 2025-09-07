<script>
    import { onMount, onDestroy } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import Chart from 'chart.js/auto';
    import { cubicIn, cubicOut } from "svelte/easing";
    import { slide } from 'svelte/transition';
    import gsap from 'gsap';
    import DelayTimesVisualization from '$lib/components/DelayTimesVisualization.svelte'
    import Cards from '$lib/components/Cards.svelte'
    import { PUBLIC_MAPTILER_API_KEY } from '$env/static/public';
    import Timeline from '$lib/components/Timeline.svelte'
    import { fly } from 'svelte/transition';
    import marker from '/src/icons/marker.svg'
    import { addMarkerLayer, addLocalAuthoritiesSource, addLocalAuthoritiesLayer, addRenewableProjectsSource } from '$lib/utils/mapUtils.js'
    let isCollapsed = false;
    let config

    export let points = []; // GeoJSON features
    export let nimby_score = [];
    export let councils = [];
    export let refused = [];
    export let sizeProperty = 'Installed Capacity (MWelec)';
    export let typeProperty = 'Technology Type';
    export let refProperty = 'Ref ID';

    export let minSize = 20;
    export let maxSize = 50;
    let coloringMode = 'nimby'; // Start with NIMBY coloring, options are 'nimby' or 'type'
    let showControlPanel = false
    // DOM elements 
    const NIMBY_TEST = "#b62121"
    const NIMBY_POTENTIAL = "#eb8e47"
    let mapContainer;
    let nimbyRadarCanvas;
    let sidebarContent;
    let typeItems2 = [
    { label: 'Battery', color: '#004C99' },
    { label: 'Solar', color: '#E6B800' },
    { label: 'Wind', color: '#00857D' },
    { label: 'Other', color: '#FFFFFF' }
    ];

    let typeItems = [
    { label: 'Not A NIMBY', color: '#d3d3d3' },
    { label: 'Nimby Potential', color: NIMBY_POTENTIAL },
    { label: 'NIMBY', color: NIMBY_TEST }
    ]
    let currentTypeLabel = typeItems

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
            NIMBY_TEST,  // Has nimby details - darker red
            [
                'case',
                ['in', ['get', refProperty], ['literal', [...nimbyRefIds3]]],
                NIMBY_POTENTIAL,  // Has nimby details - darker red
                [
                    'case',    
                    ['in', ['get', refProperty], ['literal', [...nimbyRefIds2]]],
                    NIMBY_POTENTIAL,
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
        currentTypeLabel = coloringMode === 'nimby' ? typeItems : typeItems2;
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
        if (technologyType == 'All') {
            filter.push(['==', ['get', 'Technology Type'], technologyType]);
        }
        map.setFilter('unclustered-point', filter);

        stats.forEach(stat => {
            const currentValue = stat.calculate(points);
            stat.value = currentValue;

        })
        stats = stats.map(stat => ({...stat}))
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
                    label: 'C.E.G',
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
            style: `https://api.maptiler.com/maps/landscape/style.json?key=${PUBLIC_MAPTILER_API_KEY}`,
            center: [-4, 55.20],
            zoom: 4.8
        });
        
        map.on('load', () => {
            // Add source
            addLocalAuthoritiesSource(map, config);
            map.addSource('points', {
                type: 'geojson',    
                data: {
                    type: 'FeatureCollection',
                    features: points
                }
            });
            addLocalAuthoritiesLayer(map);

            const popup = new maplibregl.Popup({
                closeButton: false,
                closeOnClick: false
            });
            let hoveredPointId = null;
            let hoveredAuthorityId = null;

            addMarkerLayer(map);

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
        map.on('mousemove', (e) => {
            // Use queryRenderedFeatures to check for features at the mouse position
            // The first argument is the point, and the second is an object specifying the layers to query.
            const features = map.queryRenderedFeatures(e.point, {
                layers: ['unclustered-point', 'local-authorities-layer']
            });
            console.log(features)
            // Reset cursor
            map.getCanvas().style.cursor = '';
            popup.remove();

            // Reset previous hover states
            if (hoveredPointId !== null) {
                map.setFeatureState({ source: 'points', id: hoveredPointId }, { hover: false });
                hoveredPointId = null;
            }
            if (hoveredAuthorityId !== null) {
                map.setFeatureState({ source: 'local-authorities', id: hoveredAuthorityId }, { hover: false });
                hoveredAuthorityId = null;
            }

            if (features.length > 0) {
                map.getCanvas().style.cursor = 'pointer';
                
                // Prioritize the point feature if it's present
                const pointFeature = features.find(f => f.layer.id === 'unclustered-point');
                
                if (pointFeature) {
                    hoveredPointId = pointFeature.id;
                    map.setFeatureState({ source: 'points', id: hoveredPointId }, { hover: true });
                    popup.setLngLat(e.lngLat)
                        .setHTML(`<h3>${pointFeature.properties["Planning Application Reference"]}</h3><p><b>Name:</b>${pointFeature.properties["Site Name"]}</p><p><b>Planning Authority:</b>${pointFeature.properties['Planning Authority']}</p>`)
                        .addTo(map);
                } else {
                    // If no point, check for an authority feature
                    const authorityFeature = features.find(f => f.layer.id === 'local-authorities-layer');
                    if (authorityFeature) {
                        hoveredAuthorityId = authorityFeature.id;
                        map.setFeatureState({ source: 'local-authorities', id: hoveredAuthorityId }, { hover: true });
                        popup.setLngLat(e.lngLat)
                            .setHTML(`<h3>${authorityFeature.properties.LAD24NM}</h3>`)
                            .addTo(map);
                    }
                }
            }
        });
        
        // Consolidated mouseleave event
        map.on('mouseleave', 'unclustered-point', () => {
             if (hoveredPointId !== null) {
                map.setFeatureState({ source: 'points', id: hoveredPointId }, { hover: false });
            }
            hoveredPointId = null;
            map.getCanvas().style.cursor = '';
            popup.remove();
        });

        map.on('mouseleave', 'local-authorities-layer', () => {
            if (hoveredAuthorityId !== null) {
                map.setFeatureState({ source: 'local-authorities', id: hoveredAuthorityId }, { hover: false });
            }
            hoveredAuthorityId = null;
            map.getCanvas().style.cursor = '';
            popup.remove();
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
    function toggleControlPanel() {
    showControlPanel = !showControlPanel;

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
      let buttonText = 'Copy Ref';

    const copyToClipboard = () => {
        let copy = selectedFeature.properties['Planning Application Reference']
        navigator.clipboard.writeText(copy).then(() => {
            buttonText = "Copied!"
            setTimeout(() => {
                buttonText = 'Copy Ref';
            }, 2000); // Revert the button text after 2 seconds

        })
    }
    // Lifecycle hooks
    onMount(async () => {
        console.log(councils)
        let response = await fetch('/localauth.json')
        config = await response.json();

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

<div class="font-sans scrollbar">

        <button on:click={() => isCollapsed = !isCollapsed} class="control-content toggle-sidebar-btn">
            {#if isCollapsed}
                <span>&gt;</span>
            {:else}
                <span>&lt;</span>
            {/if}
        </button>
    {#if !isCollapsed}

    <div class="glass3d-wrapper glass3d p-0 sidebar p-3 overflow-y-scroll scrollbar"transition:fly={{ x: -200, duration: 300 }} >

        <div class="sidebar-header justify-center items-center">
            <div class=" mb-2">
                {#if selectedFeature}
                    <div class="bg-white  rounded-xl p-4 shadow-md">
                    <button class="text-xs text-orange-500 mt-1" on:click={resetSelection}>Back to overview</button>
                    <h2 class="text-sm font-bold">{selectedFeature.properties['Site Name'] || 'C.E.G'}</h2>
                    <h3 class="text-sm">Planning Authority: <b>{selectedFeature.properties['Planning Authority']}</b></h3>
                    <p class='text-xs'>Submitted: {selectedFeature.properties['Planning Application Submitted']}</p>
                    <h3 class="text-xs font-italic">Reference:  <b>{selectedFeature.properties['Planning Application Reference']}</b></h3>
                    <button on:click={copyToClipboard} class="px-3 py-1 text-sm bg-orange-500 text-white rounded hover:bg-blue-600">
                        {buttonText}
                    </button>
                    <br>
                    <a class='text-sm text-orange-500' target="_blank" href={councils[selectedFeature.properties['Planning Authority']]}> Link To Planning Authority Database</a>

                    <br>
                    {#if selectedFeature.properties['Planning Permission Refused'] != 0}
                        <p class='text-xs'>Refused: {selectedFeature.properties['Planning Permission Refused']}</p>
                    {/if}

                    {#if selectedFeature.properties['Planning Permission Withdraw'] != 0}
                        <p class='text-xs'>Withdrawn: {selectedFeature.properties['Planning Permission Withdrawn']}</p>
                    {/if}
                    <p class="text-xs font-bold">Record Last Updated {selectedFeature.properties['Record Last Updated (dd/mm/yyyy)']}</p>

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
                    

                    {/if}

                {:else}
                <div class="glass3d2 flex bg-white rounded-xl p-4 shadow-md">
                    <div class='ml-1'>
                        <h1 class="text-xxl ">Clean Energy Graveyard (C.E.G)</h1>
                        <a href='https://www.bemben.co.uk'>Made by Damian Bemben</a>
                    </div>
                </div>

                {/if}
            </div>

            <div style="height: 300px" class='bg-white p-4 rounded-xl shadow-xl'    class:hidden={!selectedFeature}>
                <h3 class="text-md font-bold align-center">C.E.G Score</h3>
                <canvas bind:this={nimbyRadarCanvas}></canvas>
            </div>
            
            <div class="grid grid-cols-2 gap-2" class:hidden={selectedFeature}>
                {#each stats as stat}
                    <div class="bg-white stat place-items-center shadow bg-base-100 rounded-xl">
                        <div class=" stat-title">{stat.label}</div>
                        <span class="stat-detail stat-value">{stat.value}</span>
                        <span class="stat-desc">{stat.trend}</span>
                    </div>
                {/each}
            </div>
            <div class="bg-white rounded-xl p-4 shadow-md mt-2">
                <DelayTimesVisualization delayData={refused}/>
            </div>
            <article class:hidden={selectedFeature} class="prose text-xs mt-2 bg-white p-4 rounded-xl shadow-xl">
                <h2 class="text-sm">What's the C.E.G?</h2>
                <p>
                    The C.E.G is an experiment into analyzing issues plaguing UK renewables progress.
                    Gemini has been used in order to help identify potential news articles about sites.
                </p>

                <p>
                    The actual site information is factual and is using the governmental REPD dataset for cancelled renewable projects.
                    <b>The opinions themselves are made up, and the points don't matter.</b>
                </p>
                <p>
                    <b> On the map - Bright red denotes high certainty NIMBY-ness</b>
                </p>
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
                    <div class="chat-bubble bg-orange-400  shadow-xl">
                        {nimby_choice['Snide Commentary']}
                    </div>
                    <div class="chat-bubble bg-orange-400 shadow-xl mt-2">
                    <p class="text-sm">{nimby_choice['header']}</p>
                    </div>
                    <div class="chat-footer opacity-50">Sent By C.E.G - He may be wrong! </div>

                </div>
            </div>
            
            <div class="flex mt-5 justify-center items-center">
                {#if nimby_choice && nimby_choice['article_url']}
                    <a href="{nimby_choice['article_url']}" target="_blank" rel="noopener noreferrer" class="btn btn-primary bg-orange-500 text-white">
                        Potential Link/Article About This Project
                    </a>
                {:else}
                    <!-- <button class="btn btn-primary" on:click={() => showSubmitForm = true}>
                        Submit Information
                    </button> -->
                {/if}
            </div>
        {/if}
                    <div class="flex mt-5 justify-center items-center button">

                 <a class='btn', href='https://form.jotform.com/251386339530055'>Let's Talk!</a>
                </div>

                <div class="flex mt-5 justify-center items-center">

                    <a class="btn" href="https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract"> V1.0.5 - REPD January 2025</a>
                </div>
    </div>
    {/if}

    <div class="map-container" bind:this={mapContainer}></div>
    <!-- <Cards></Cards> -->
    <Timeline bind:startDate bind:endDate minDate='2019-01-01', maxDate='2025-01-01' on:change{updateMapData}></Timeline>
    <div class='glass3d-wrapper control-content expanded absolute top-2 right-2 transform bg-base-100 p-2 rounded-lg shadow-lg'>


        <div>
            <div>
                <button class="p-2 text-xs btn bg-orange-400 text-white" on:click={toggleColorMode}>
                    {coloringMode === 'nimby' ? 'NIMBY Level' : 'Renewable Type'}
                </button>
            </div>
            <br>
            
            <div class="legend-items">
                {#each currentTypeLabel as item}
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
    .stat-detail-r {
        background: -webkit-radial-gradient(#b62121, #eb8e47);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent; 
        -webkit-text-stroke: 1px red;

    }
    .stat-detail-l {
        background: -webkit-radial-gradient(#eb8e47, #b62121);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent; 

    }
    h1 {
        background: -webkit-radial-gradient(#b62121, #eb8e47);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent; 
    }
      .control-content {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 320px;
        overflow: hidden;
    }

    .control-content.collapsed {
        width: 48px;
        height: 48px;
    }

    .control-content.expanded {
        width: 200px;
    }
  .control-toggle {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  .control-toggle:hover {
    background: rgba(0, 0, 0, 0.1);
  }
  .sidebar {
        position: absolute;
        left: 0.5vw;
        top: 0.5vw;
        height: calc(100% - 1vw);
        background: rgba(90, 90, 90, 0.15);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        color: var(--navbar-light-primary);
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        overflow-y: auto;
        width: 33%;
        max-width: 500px;
        z-index: 50;
        overflow-x: hidden;
        padding-right: 5px;
    }

    .toggle-sidebar-btn {
        position: absolute;
        top: 1rem;
        left: 1vw;
        z-index: 100;
        background: rgba(45, 45, 45, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        color: white;

        width: 30px;
        height: 30px;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 1.5rem;
    }
  .toggle-sidebar-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
  }
    /* Mobile Landscape */
    @media (max-width: 768px) and (orientation: landscape) {
        .sidebar {
            width: 50%; /* Adjust as needed */
            max-width: 280px;
        }
    }

    /* Mobile Portrait */
    @media (max-width: 480px) {
        .sidebar {
            width: 80%;
            max-width: none;
            height: 100%;
            top: 0;
            left: 0;
            border-radius: 0;
        }
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