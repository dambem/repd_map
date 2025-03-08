<script>
    import { onMount } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import chartjs from 'chart.js/auto';
    import { nonpassive } from 'svelte/legacy';
    import gsap from 'gsap';
    import { cubicIn, cubicOut } from "svelte/easing";

    export let points = []; // GeoJSON features
    export let nimby_score = [];
    let mapContainer;
    let map;
    let selectedFeature = false;
    let sidebarContent;
    let nimby_choice;
    let chartData;
    let chartValues = [20, 10, 5, 2, 20, 30, 45];
  	let chartLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

    let startDate = '2020-01-01';
    let endDate = '2025-01-01';

    let nimbyDarCanvas;
    let nimbyDialCanvas;
    let speed = 0;
    let rpm = 0;

    
  let stats = [
    { label: 'Total Capacity Lost', value: '6584 MW', trend: 'since January 2022' },
    { label: 'Groups', value: '23', trend: '+2' },
    { label: 'Projects', value: '12',  trend: '+3' },
    { label: 'Appeals', value: '156',  trend: '+22%' }
  ];

    const generateTitles = (step, count) =>
      Array.from({ length: count }, (_, i) => (i * step).toString());

    setInterval(() => {
      const timeFraction = (Date.now() % 6000) / 5000;
      speed = cubicIn(timeFraction) * 100;
      rpm = cubicOut(timeFraction) * 8000;
    }, 500);
    const typeColors = {
      restaurant: '#FF5733',
      shopping: '#33FF57',
      entertainment: '#3357FF',
      default: '#808080'  // fallback color
    };
    export let sizeProperty = 'Installed Capacity (MWelec)'; 
    export let minSize = 20;
    export let maxSize = 50;
    const allowedProperties = ['Operator (or Applicant)', 'Site Name', 'Technology Type', 'Installed Capacity (MWelec)', 'Development Status', 'Planning Permission Refused'];

    let chartCanvas
    let ctx
    function updateMapData() {
        if (!map) return; // Ensure map is initialized
        // Example: Filtering data based on year range (replace with your actual data logic)
        map.setFilter('unclustered-point', [
            'all',
            ['>=', ['get', 'Planning Application Submitted'], startDate],
            ['<=', ['get', 'Planning Application Submitted'], endDate]
        ]);
    }
    onMount(async (promise) => {
      const ctx2 = nimbyDarCanvas.getContext('2d');
      console.log(nimby_score)
      // console.log("nimby score!")
      nimby_choice = nimby_score[0]
      const Nchart = new chartjs(ctx2, {
        type: 'radar',
        data: {
          labels: ['NIMBY', 'Petty', 'Organized', 'Political'],
          datasets: [{
            label: 'NimbyDEX',
            data: [nimby_choice["Nimby Score"], nimby_choice["Petty Score"], nimby_choice["Organized Score"], nimby_choice["Political Leaning"]],
          }]
        },
          options: {
            responsive: true,
            legend: false,
           maintainAspectRatio: false,

            scales: {
              r: {
                angleLines: {
                  display: true
                },
                suggestedMin: 0,
                suggestedMax: 100
              }
            }
          }
        });

      map = new maplibregl.Map({
        container: mapContainer,
        style: 'https://api.maptiler.com/maps/toner-v2/style.json?key=xGVG9z8FJiMrvfFTWFgs',
        center: [-4, 55.20],
        zoom: 4.8
      });
  
      map.on('load', () => {
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
  
        // Add unclustered point circles
        map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 10,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'Installed Capacity (MWelec)'], 0],
            0, 5,  // minimum radius
            200, 20  // maximum radius at 1000 MWelec
          ],
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#fbb03b',  // Selected color
            '#a8323a'   // Default color
          ]
        }
      });

        map.on('click', 'unclustered-point', (e) => {
        if (!e.features.length) return;



        const feature = e.features[0];
        selectedFeature = feature;

        // Set new selection state
        map.setFeatureState(
          { source: 'points', id: selectedFeature.id },
          { selected: true }
        );
        animateProperties();

          });

        updateMapData();//initial data filter

      
      });



    });

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
  $: if (selectedFeature) {
    // Wait for next tick to ensure DOM is updated
    setTimeout(animateProperties, 0);
  }


  </script>


  <div class="container font-sans">

      <div class="w-2/3 p-5 overflow-y-auto shadow-lg" transition:slide>
        <div class="sidebar-header justify-center items-center">
          <div class="mb-4">
            {#if selectedFeature}
            <h2 class="text-md font-bold">{selectedFeature.properties['Site Name'] || 'NIMBYdex'}</h2>       
            <p class="text-sm">{nimby_choice['header']}</p>
            <p class="text-xs font-bold">Record Last Updated {selectedFeature.properties['Record Last Updated (dd/mm/yyyy)']}</p>
   
            {:else}
            <h1 class="text-xl font-bold">NIMBYdex</h1>
            <p>UK Cancelled Renewable Monitor</p>
            {/if}
          </div>

          <div style="height: 300px"  class:hidden={!selectedFeature}>
            <canvas bind:this={nimbyDarCanvas} ></canvas>
          </div>
          <div class="grid grid-cols-2 gap-4" class:hidden={selectedFeature}>
            {#each stats as stat (stat.label)}
            <div class="stat shadow">
              <div class="stat-title">{stat.label}</div>
              <span class="stat-value">{stat.value}</span>
              <span class="stat-desc">{stat.trend}</span>
            </div>
          {/each}
          </div>
          <article class:hidden={selectedFeature} class="prose mt-5">
          <h2 class="text-xl">Disclosure!</h2>
          <p>The NimbyDex is an experiment into analyzing the NIMBY menace plaguing  UK progress. 
            Gemini has been used in order to help identify potential news articles about sites. 
            The actual site information is factual and is using the governmental REPD dataset for cancelled renewable projects, 
            <b>the commentary may not always be - but attempts to find the most accurate site.</b> </p>
          <p>The opinions themselves are made up, and the points don't matter</p>
          <a href='https://www.bemben.co.uk'>Made by Damian Bemben</a>
        </article>
        </div>


        <div style="height: 100px" class:hidden={selectedFeature}>
        <canvas bind:this={chartCanvas}  id="myChart"></canvas>
        </div>

        {#if selectedFeature}
        <div class="sidebar-content" bind:this={sidebarContent}>
          <hr/>
          <div class="mt-2 mb-2">
          {#each nimby_choice['Interesting Tidbits'] as tidbit}
            <p class="text-sm mt-2">- {tidbit}</p>
          {/each}
          </div>
          <div class="collapse mb-2 bg-base-200">
            <input type="checkbox" />
            <div class="collapse-title text-medium font-medium">Site Details</div>
            <div class="collapse-content">
          
            <table class="w-full table">
              <thead> 
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>

          {#each Object.entries(selectedFeature.properties).filter(([key]) => allowedProperties.includes(key)) as [key, value]}
            {#if key !== 'title'}
                <tr>
                  <td>
                    {key.replace(/_/g, ' ')}
                  </td>
                  <td>
                    {value}
                  </td>
                </tr>
            {/if}
          {/each}
        </tbody>
      </table>  
    </div>
          </div>
          <div class="chat chat-start">
          <div class="chat-bubble">
            {nimby_choice['Snide Commentary']}
          </div>

          </div>

        </div>
        <div class="flex mt-5 justify-center items-center">
          <a href="{nimby_choice['article_url']}" class="link">Possible Article About This</a>
        </div>
        {/if}

      </div>
      <div class="map-container" bind:this={mapContainer} />
      
      <div class='absolute bottom-2 left-2/3 transform -translate-x-2/3 bg-base-100 p-2 rounded-lg shadow-lg'>
        <label class="mr-4"><b>From:</b>
            <input type="date" bind:value={startDate} on:input={updateMapData} />
        </label>
        <label><b>Til:</b>
            <input type="date" bind:value={endDate} on:input={updateMapData} />
        </label>
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
      .container {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow-y: hidden;
  }
    .map-container {
      width: 100%;
      height: 100%;
      padding: 0;
      flex-grow: 1;

    }
    .sidebar {
    width: 90em;
    /* background: white; */
    /* box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1); */
    padding: 20px;
    overflow-y: auto;
    
    }
  </style>