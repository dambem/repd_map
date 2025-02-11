<script>
    import { onMount } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import { nonpassive } from 'svelte/legacy';
    
    export let points = []; // GeoJSON features
    let mapContainer;
    let map;
    let selectedFeature = false;
  

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
        // Add points source with clustering
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
  
        // Add cluster circles
        // <!-- map.addLayer({
        //   id: 'clusters',
        //   type: 'circle',
        //   source: 'points',
        //   filter: ['has', 'point_count'],
        //   paint: {
        //     'circle-color': '#a8323a',
        //     'circle-radius': [
        //       'step',
        //       ['get', 'point_count'],
        //       20,
        //       100,
        //       30,
        //       750,
        //       40
        //     ]
        //   }
        // }); -->
  
        // Add cluster count labels
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'points',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12
          },
          paint: {
            'text-color': '#ffffff'
          }
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
          // Highlight selected point
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

        map.setFeatureState(
          { source: 'unclustered-point', id: selectedFeature.id },
          { selected: true }
        );
        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters']
          });
          
          if (!features.length) return;

          const clusterId = features[0].properties.cluster_id;
          const pointCount = features[0].properties.point_count;
          const clusterSource = map.getSource('points');
          clusterSource.getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;

            // Ensure we don't zoom too far in
            const maxZoom = Math.min(zoom + 1, map.getMaxZoom());
            
            // Get cluster coordinates
            const coordinates = features[0].geometry.coordinates.slice();

            // Handle coordinate wrapping
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            // Animate to the cluster
            map.easeTo({
              center: coordinates,
              zoom: maxZoom,
              duration: 500
            });
          }
        );
        })

        const feature = e.features[0];
        selectedFeature = feature;

        // Set new selection state
        map.setFeatureState(
          { source: 'points', id: feature.id },
          { selected: true }
        );

        
          });

        // Change cursor on hover
        map.on('mouseenter', 'unclustered-point', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseenter', 'clusters', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
      
      });


    });
  </script>
  <div class="container">
    
      <div class="sidebar" transition:slide>
        <div class="sidebar-header">
          {#if selectedFeature}
          <h2 class="text-3xl font-bold">{selectedFeature.properties.title || 'Grave Details'}</h2>          
          {:else}
          <h2 class="text-3xl font-bold">Select A Grave</h2>
          {/if}
          <p>Total Capacity Lost: <b>6584.59 MW Yearly of Generation</b> since <b>January 2022</b></p>
        </div>
        
        {#if selectedFeature}
        <div class="sidebar-content">
          {#each Object.entries(selectedFeature.properties).filter(([key]) => allowedProperties.includes(key)) as [key, value]}
            {#if key !== 'title'}
              <div class="property-row">
                <strong>{key.replace(/_/g, ' ')}:</strong>
                <span>{value}</span>
              </div>
            {/if}
          {/each}
        </div>
        {/if}

      </div>
      <div class="map-container" bind:this={mapContainer} />

    </div>
  
  <style>
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
    background: white;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
    padding: 20px;
    overflow-y: auto;
    }
  </style>