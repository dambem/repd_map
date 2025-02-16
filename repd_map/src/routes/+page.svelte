
<script>
    import Map from '$lib/Map.svelte';

    /** @type {import('./$types').PageData} */
    export let data;

  </script>
  
  <svelte:head>
    <title>Broken Britain - Cancelled Renewables</title>
  </svelte:head>
  
  <Map points={data.points} />
  

  <style>
      /* .container {
      background:
        url(noise.svg);
        opacity: .90;  */
        /* mix-blend-mode: soft-light; */
      /* } */
  </style>
  <!-- <style global lang="postcss">
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
  </style> -->