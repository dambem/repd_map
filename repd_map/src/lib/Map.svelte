<script>
    import { onMount } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import chartjs from 'chart.js/auto';
    import { nonpassive } from 'svelte/legacy';
    import gsap from 'gsap';
    import Gauge from "svelte-gauge";
    import { cubicIn, cubicOut } from "svelte/easing";

    export let points = []; // GeoJSON features
    let mapContainer;
    let map;
    let selectedFeature = false;
    let sidebarContent;

    let chartData;
    let chartValues = [20, 10, 5, 2, 20, 30, 45];
  	let chartLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

    let startDate = '2023-01-01';
    let endDate = '2024-01-01';

    let nimbyDarCanvas;
    let nimbyDialCanvas;
    let speed = 0;
    let rpm = 0;

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
    const allowedProperties = ['Operator (or Applicant)', 'Site Name', 'Technology Type', 'Installed Capacity (MWelec)', 'Development Status', 'Planning Authority', 'Planning Application Submitted', 'Planning Permission Refused'];

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
      const Nchart = new chartjs(ctx2, {
        type: 'radar',
        data: {
          labels: ['Organised', 'Governmental', 'Council', 'Suspicious', 'Valid'],
          datasets: [{
            label: 'NimbyDEX',
            data: [65, 90, 70, 30, 0],
          }]
        },
          options: {
            responsive: true,
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
            0, 3,  // minimum radius
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


  <div class="container">
      <div class="w-1/2 p-5 overflow-y-auto shadow-lg" transition:slide>
        <div class="sidebar-header justify-center items-center">
          <div class="mb-4">
            {#if selectedFeature}
            <h2 class="text-xl font-bold">{selectedFeature.properties.title || 'NIMBYdex'}</h2>          
            {:else}
            <h2 class="text-xl font-bold">NIMBYdex</h2>
            <p>UK Cancelled Renewable Monitor</p>
            {/if}
          </div>


          <div class="flex justify-center items-center">
          <div class="stats   shadow">
            <div class="stat">
              <div class="stat-title">Total Capacity Lost</div>
              <div class="stat-value">6584.59 MW</div>
              <div class="stat-desc">of Generation since <b>January 2022</b></div>
            </div>
          </div>
          <div class="stats  shadow">
            <div class="stat">
              <div class="stat-title">Nimby Rating</div>
              <div class="stat-value">4.5 NPA</div>
              <div class="stat-desc">of Storage since <b>January 2022</b></div>
            </div>
          </div>
        </div>

        </div>
        <Gauge
          width={300}
          stop={200}
          labels={generateTitles(20, 11)}
          startAngle={45}
          stopAngle={315}
          stroke={10}
          easing={cubicOut}
          value={speed}
          color={"#d43008"}
        >
        </Gauge>

        <div style="height: 100px" class:hidden={selectedFeature}>
        <canvas bind:this={chartCanvas}  id="myChart"></canvas>
        </div>

        {#if selectedFeature}
        <div class="sidebar-content" bind:this={sidebarContent}>
          <div class="card ">
            <table className="w-full">
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
        {/if}
        <div style="height: 400px" class:hidden={!selectedFeature}>
          <canvas bind:this={nimbyDarCanvas} ></canvas>
        </div>
        <div style="height: 400px" class:hidden={!selectedFeature}>
          <canvas bind:this={nimbyDialCanvas} ></canvas>
        </div>

      </div>
      <div class="map-container" bind:this={mapContainer} >
      
      </div>
      <div class='absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-secondary p-4 rounded-lg shadow-lg'>
        <label>Start Date:
            <input type="date" bind:value={startDate} on:input={updateMapData} />
        </label>
        <label>End Date:
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
    width: 70em;
    /* background: white; */
    /* box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1); */
    padding: 20px;
    overflow-y: auto;
    
    }
  </style>