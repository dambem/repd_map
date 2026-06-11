<script>
    import { NIMBY_LEGEND, TYPE_LEGEND, TECH, TECH_COLORS } from '$lib/config/constants.js';

    export let colorMode = 'nimby'; // 'nimby' | 'type'
    export let choroplethMode = 'count'; // 'count' | 'investment'
    export let activeTechs = new Set(Object.values(TECH));
    export let includeOther = true;
    export let showAuthorities = true;
    export let showProjects = true;
    export let onChange = () => {};

    let open = true;

    $: legend = colorMode === 'nimby' ? NIMBY_LEGEND : TYPE_LEGEND;

    function setColorMode(mode) {
        colorMode = mode;
        onChange();
    }
    function setChoropleth(mode) {
        choroplethMode = mode;
        onChange();
    }
    function toggleTech(tech) {
        activeTechs.has(tech) ? activeTechs.delete(tech) : activeTechs.add(tech);
        activeTechs = new Set(activeTechs);
        onChange();
    }
    function toggleOther() {
        includeOther = !includeOther;
        onChange();
    }
</script>

<div class="panel" class:open>
    <button class="panel-head" on:click={() => (open = !open)} aria-expanded={open}>
        <span class="ceg-eyebrow head-label">Map controls</span>
        <span class="chev" class:flipped={open}>▾</span>
    </button>

    {#if open}
        <div class="panel-body">
            <fieldset>
                <legend class="ceg-eyebrow">Colour sites by</legend>
                <div class="seg">
                    <button class:active={colorMode === 'nimby'} on:click={() => setColorMode('nimby')}>
                        Opposition
                    </button>
                    <button class:active={colorMode === 'type'} on:click={() => setColorMode('type')}>
                        Technology
                    </button>
                </div>
                <ul class="legend">
                    {#each legend as item}
                        <li>
                            <span class="swatch" style="background: {item.color}"></span>
                            {item.label}
                        </li>
                    {/each}
                </ul>
            </fieldset>

            <fieldset>
                <legend class="ceg-eyebrow">Shade authorities by</legend>
                <div class="seg">
                    <button class:active={choroplethMode === 'count'} on:click={() => setChoropleth('count')}>
                        Projects
                    </button>
                    <button
                        class:active={choroplethMode === 'investment'}
                        on:click={() => setChoropleth('investment')}
                    >
                        Est. £ lost
                    </button>
                </div>
            </fieldset>

            <fieldset>
                <legend class="ceg-eyebrow">Technology filter</legend>
                <label>
                    <input type="checkbox" checked={activeTechs.has(TECH.SOLAR)} on:change={() => toggleTech(TECH.SOLAR)} />
                    <span class="swatch" style="background: {TECH_COLORS[TECH.SOLAR]}"></span> Solar
                </label>
                <label>
                    <input type="checkbox" checked={activeTechs.has(TECH.WIND)} on:change={() => toggleTech(TECH.WIND)} />
                    <span class="swatch" style="background: {TECH_COLORS[TECH.WIND]}"></span> Wind
                </label>
                <label>
                    <input type="checkbox" checked={activeTechs.has(TECH.BATTERY)} on:change={() => toggleTech(TECH.BATTERY)} />
                    <span class="swatch" style="background: {TECH_COLORS[TECH.BATTERY]}"></span> Battery
                </label>
                <label>
                    <input type="checkbox" checked={includeOther} on:change={toggleOther} />
                    <span class="swatch" style="background: {TECH_COLORS.other}"></span> Other
                </label>
            </fieldset>

            <fieldset>
                <legend class="ceg-eyebrow">Layers</legend>
                <label>
                    <input type="checkbox" bind:checked={showProjects} on:change={onChange} />
                    Project sites
                </label>
                <label>
                    <input type="checkbox" bind:checked={showAuthorities} on:change={onChange} />
                    Local authorities
                </label>
            </fieldset>
        </div>
    {/if}
</div>

<style>
    .panel {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        width: 200px;
        background: rgba(21, 23, 28, 0.88);
        backdrop-filter: blur(6px);
        border: 1px solid rgba(232, 228, 218, 0.2);
        border-radius: 4px;
        color: var(--ceg-bone);
        z-index: 40;
        font-size: 0.75rem;
    }
    .panel-head {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        padding: 0.6rem 0.75rem;
        cursor: pointer;
        background: none;
        border: none;
        color: inherit;
    }
    .head-label {
        color: var(--ceg-bone);
        opacity: 0.8;
    }
    .chev {
        transition: transform 0.2s ease;
        font-size: 0.7rem;
    }
    .chev.flipped {
        transform: rotate(180deg);
    }
    .panel-body {
        padding: 0 0.75rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
    }
    fieldset {
        border: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }
    fieldset > legend {
        color: var(--ceg-ash);
        margin-bottom: 0.35rem;
    }
    .seg {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border: 1px solid rgba(232, 228, 218, 0.25);
        border-radius: 3px;
        overflow: hidden;
    }
    .seg button {
        padding: 0.35rem 0.25rem;
        background: transparent;
        border: none;
        color: var(--ceg-ash);
        font-family: var(--font-mono);
        font-size: 0.68rem;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
    }
    .seg button.active {
        background: var(--ceg-vermillion);
        color: var(--ceg-bone);
    }
    .legend {
        list-style: none;
        padding: 0;
        margin: 0.2rem 0 0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    .legend li,
    label {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        cursor: default;
    }
    label {
        cursor: pointer;
    }
    .swatch {
        width: 11px;
        height: 11px;
        border-radius: 2px;
        border: 1px solid rgba(232, 228, 218, 0.3);
        flex-shrink: 0;
    }
    input[type='checkbox'] {
        accent-color: var(--ceg-vermillion);
        width: 13px;
        height: 13px;
    }
    @media (max-width: 640px) {
        .panel {
            width: 170px;
        }
    }
</style>
