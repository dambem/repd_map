<script>
    import Map from '$lib/Map.svelte';

    /** @type {import('./$types').PageData} */
    export let data;
</script>

<svelte:head>
    <title>Clean Energy Graveyard — Cancelled UK Renewables</title>
    <meta
        name="description"
        content="An interactive register of refused and withdrawn UK renewable energy projects, with estimated financial losses per planning authority."
    />
</svelte:head>

<Map
    points={data.points}
    nimby_score={data.nimby_score}
    refused={data.final_stats}
    councils={data.council}
/>
