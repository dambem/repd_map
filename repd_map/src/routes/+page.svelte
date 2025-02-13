
<script>
    import Map from '$lib/Map.svelte';

    /** @type {import('./$types').PageData} */
    export let data;

  </script>
  
  <svelte:head>
    <title>Broken Britain - Cancelled Renewables</title>
  </svelte:head>
  
  <div class="container">
    <Map points={data.points} />
  </div>
  
  <style global lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  </style>