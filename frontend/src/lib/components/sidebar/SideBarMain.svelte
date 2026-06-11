<script>
    import About from '$lib/components/About.svelte';
    import DelayTimesVisualization from '$lib/components/DelayTimesVisualization.svelte';
    import { PROPS } from '$lib/config/constants.js';
    import { estimateProjectFinancials, formatPoundsM } from '$lib/data/financials.js';
    import { vitalRecord, lifespanLabel } from '$lib/data/projects.js';

    export let refused = [];
    export let stats = [];
    export let points = [];
    export let onSelect = () => {};

    const PAGE = 10;
    let query = '';
    let sortBy = 'recent'; // 'recent' | 'capacity' | 'cost'
    let shown = PAGE;
    let registerOpen = false;

    const SORTS = {
        recent: (a, b) => (vitalRecord(b.properties).died ?? '').localeCompare(vitalRecord(a.properties).died ?? ''),
        capacity: (a, b) =>
            (parseFloat(b.properties[PROPS.CAPACITY]) || 0) - (parseFloat(a.properties[PROPS.CAPACITY]) || 0),
        cost: (a, b) =>
            estimateProjectFinancials(b.properties).capexLostM -
            estimateProjectFinancials(a.properties).capexLostM,
    };

    $: matches = points
        .filter((p) => {
            if (!query) return true;
            const q = query.toLowerCase();
            return (
                String(p.properties[PROPS.SITE_NAME]).toLowerCase().includes(q) ||
                String(p.properties[PROPS.AUTHORITY]).toLowerCase().includes(q) ||
                String(p.properties[PROPS.OPERATOR]).toLowerCase().includes(q)
            );
        })
        .sort(SORTS[sortBy]);

    $: visible = matches.slice(0, shown);

    // Reset paging when the search or sort changes.
    $: if (query !== undefined && sortBy) shown = PAGE;
</script>

<header class="masthead">
    <p class="ceg-eyebrow ornament">✦ &nbsp;a register of the departed&nbsp; ✦</p>
    <h1 class="font-display">Clean Energy<br />Graveyard</h1>
    <p class="motto font-display">Hic iacet potentia — here lies the power that never was</p>
    <a class="byline font-data" href="https://www.bemben.co.uk">kept by Damian Bemben</a>
</header>

<div class="stat-grid">
    {#each stats as stat}
        <div class="ceg-card stat" class:money={stat.isMoney}>
            <span class="ceg-eyebrow">{stat.label}</span>
            <span class="stat-value font-display">{stat.value}</span>
            <span class="stat-unit font-data">{stat.trend}</span>
        </div>
    {/each}
</div>

<section class="ceg-card register">
    <button
        class="register-toggle"
        on:click={() => (registerOpen = !registerOpen)}
        aria-expanded={registerOpen}
    >
        <span class="ceg-eyebrow">The burial register · {points.length}</span>
        <span class="chev font-data" class:flipped={registerOpen}>▾</span>
    </button>
    {#if registerOpen}
    <div class="register-controls">
        <input
            class="search font-data"
            type="search"
            placeholder="Search by site, authority or operator…"
            bind:value={query}
        />
        <select class="sort font-data" bind:value={sortBy} aria-label="Sort the register">
            <option value="recent">Most recent</option>
            <option value="capacity">Largest (MW)</option>
            <option value="cost">Costliest (£)</option>
        </select>
    </div>

    {#if visible.length === 0}
        <p class="empty font-data">No graves match "{query}". Try a broader search.</p>
    {:else}
        <ol class="entries">
            {#each visible as point (point.properties[PROPS.REF_ID])}
                {@const financials = estimateProjectFinancials(point.properties)}
                <li>
                    <button class="entry" on:click={() => onSelect(point.properties[PROPS.REF_ID])}>
                        <span class="entry-name">
                            <span class="dagger">†</span>
                            <span class="font-display name">{point.properties[PROPS.SITE_NAME]}</span>
                        </span>
                        <span class="entry-meta font-data">
                            {lifespanLabel(point.properties)} · {point.properties[PROPS.AUTHORITY]}
                        </span>
                        <span class="entry-figures font-data">
                            {point.properties[PROPS.CAPACITY]} MW
                            <span class="cost">{formatPoundsM(financials.capexLostM)} est. lost</span>
                        </span>
                    </button>
                </li>
            {/each}
        </ol>
        {#if matches.length > shown}
            <button class="more font-data" on:click={() => (shown += PAGE)}>
                Show {Math.min(PAGE, matches.length - shown)} more of {matches.length}
            </button>
        {/if}
    {/if}
    {/if}
</section>

<div class="ceg-card viz">
    <DelayTimesVisualization delayData={refused} />
</div>

<About />

<style>
    .masthead {
        text-align: center;
        padding: 1.1rem 0 0.9rem;
        border-bottom: 2px solid var(--ceg-ink);
        margin-bottom: 0.75rem;
    }
    .ornament {
        letter-spacing: 0.2em;
    }
    .masthead h1 {
        font-size: 2.3rem;
        font-weight: 700;
        line-height: 0.98;
        color: var(--ceg-ink);
        margin: 0.35rem 0 0.3rem;
        /* letterpress — pressed into the parchment */
        text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.55),
            0 -1px 0 rgba(21, 23, 28, 0.2);
    }
    .motto {
        font-style: italic;
        font-size: 0.85rem;
        color: var(--ceg-ink-soft);
        margin-bottom: 0.25rem;
    }
    .byline {
        font-size: 0.62rem;
        letter-spacing: 0.08em;
        color: var(--ceg-ink-soft);
        text-decoration: none;
    }
    .byline:hover {
        color: var(--ceg-vermillion);
    }
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }
    .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 0.1rem;
        padding: 0.7rem 0.4rem;
    }
    .stat-value {
        font-size: 1.55rem;
        font-weight: 700;
        line-height: 1.1;
        color: var(--ceg-ink);
    }
    .stat.money .stat-value {
        color: var(--ceg-vermillion);
    }
    .stat-unit {
        font-size: 0.6rem;
        color: var(--ceg-ink-soft);
    }

    /* ------------------------------------------------------- register */
    .register {
        padding: 0.85rem 1rem;
        margin-bottom: 0.75rem;
    }
    .register-toggle {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
    }
    .register-toggle:hover .ceg-eyebrow {
        color: var(--ceg-vermillion);
    }
    .chev {
        font-size: 0.7rem;
        color: var(--ceg-ink-soft);
        transition: transform 0.2s ease;
    }
    .chev.flipped {
        transform: rotate(180deg);
    }
    .register-controls {
        display: flex;
        gap: 0.4rem;
        margin: 0.5rem 0 0.6rem;
    }
    .search {
        flex: 1;
        min-width: 0;
        padding: 0.45rem 0.6rem;
        font-size: 0.7rem;
        background: var(--ceg-parchment);
        border: 1px solid var(--ceg-rule);
        border-radius: 3px;
        color: var(--ceg-ink);
    }
    .search:focus-visible {
        outline: 2px solid var(--ceg-vermillion);
        outline-offset: 1px;
    }
    .sort {
        padding: 0.45rem 0.4rem;
        font-size: 0.68rem;
        background: var(--ceg-parchment);
        border: 1px solid var(--ceg-rule);
        border-radius: 3px;
        color: var(--ceg-ink);
    }
    .entries {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    .entry {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        width: 100%;
        text-align: left;
        background: none;
        border: none;
        border-top: 1px solid var(--ceg-rule);
        padding: 0.55rem 0.2rem;
        cursor: pointer;
    }
    .entry:hover .name,
    .entry:focus-visible .name {
        color: var(--ceg-vermillion);
    }
    .entry:focus-visible {
        outline: 2px solid var(--ceg-vermillion);
        outline-offset: -2px;
    }
    .entry-name {
        display: flex;
        align-items: baseline;
        gap: 0.4rem;
    }
    .dagger {
        color: var(--ceg-vermillion);
        font-size: 0.8rem;
    }
    .name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ceg-ink);
        line-height: 1.2;
    }
    .entry-meta {
        font-size: 0.62rem;
        color: var(--ceg-ink-soft);
    }
    .entry-figures {
        font-size: 0.66rem;
        color: var(--ceg-ink);
        display: flex;
        justify-content: space-between;
    }
    .cost {
        color: var(--ceg-vermillion);
    }
    .empty {
        font-size: 0.7rem;
        color: var(--ceg-ink-soft);
        padding: 0.5rem 0;
    }
    .more {
        width: 100%;
        margin-top: 0.4rem;
        padding: 0.45rem;
        font-size: 0.66rem;
        background: transparent;
        border: 1px solid var(--ceg-rule);
        border-radius: 3px;
        color: var(--ceg-ink-soft);
        cursor: pointer;
    }
    .more:hover {
        border-color: var(--ceg-vermillion);
        color: var(--ceg-vermillion);
    }

    .viz {
        padding: 0.75rem;
        margin-bottom: 0.75rem;
    }
    @media (max-width: 480px) {
        .stat-grid {
            grid-template-columns: 1fr 1fr;
        }
    }
</style>
