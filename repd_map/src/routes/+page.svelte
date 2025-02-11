<script>
    import Map from '$lib/Map.svelte';

    /** @type {import('./$types').PageData} */
    export let data;
    // Sample data - replace with your actual data
    // const samplePoints = [
    //   {
    //     type: 'Feature',
    //     geometry: {
    //       type: 'Point',
    //       coordinates: [-74.5, 40]
    //     },
    //     properties: {
    //       title: 'Point 1'
    //     }
    //   },
    //   {
    //     type: 'Feature',
    //     geometry: {
    //       type: 'Point',
    //       coordinates: [-75.5, 41]
    //     },
    //     properties: {
    //       title: 'Point 2'
    //     }
    //   }
    // ];
  </script>
  
  <svelte:head>
    <title>Broken Britain - Cancelled Renewables</title>
  </svelte:head>
  
  <div class="container">
    <Map points={data.points} />
  </div>
  
  <style>
    .container {
      max-width: 100%;
      max-height: 1000px;
      margin: 0;
      padding: 0;
    }
  

  </style>