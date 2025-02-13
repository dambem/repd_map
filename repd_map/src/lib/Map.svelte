<script>
    import { onMount } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import { nonpassive } from 'svelte/legacy';
    import gsap from 'gsap';

    export let points = []; // GeoJSON features
    let mapContainer;
    let map;
    let selectedFeature = false;
    let sidebarContent;

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

    onMount(() => {
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

      <div class="sidebar" transition:slide>
        <div class="sidebar-header">
          {#if selectedFeature}
          <h2 class="text-3xl font-bold">{selectedFeature.properties.title || 'Grave Details'}</h2>          
          {:else}
          <h2 class="text-3xl font-bold">Select A Grave</h2>
          {/if}
          <div class="stats shadow">
            <div class="stat">
              <div class="stat-title">Total Capacity Lost</div>
              <div class="stat-value">6584.59 MW</div>
              <div class="stat-desc">of Generation since <b>January 2022</b></div>
            </div>
          </div>

        </div>

        {#if selectedFeature}
        <div class="sidebar-content" bind:this={sidebarContent}>
          <div class="card ">
          {#each Object.entries(selectedFeature.properties).filter(([key]) => allowedProperties.includes(key)) as [key, value]}
            {#if key !== 'title'}
              <div class="property-row card p-1 mb-0">
                <strong>{key.replace(/_/g, ' ')}:</strong>
                <span>{value}</span>
              </div>
            {/if}
          {/each}
            </div>
        </div>
        {/if}

      </div>
      <div class="map-container" bind:this={mapContainer} />
    </div>
  
  <style>
        @tailwind base;
    @tailwind components;
    @tailwind utilities;
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