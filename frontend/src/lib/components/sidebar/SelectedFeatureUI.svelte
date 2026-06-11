<script>
    import ChatElement from '$lib/components/sidebar/ChatElement.svelte';
    import FinancialCard from '$lib/components/sidebar/FinancialCard.svelte';
    import { PROPS } from '$lib/config/constants.js';
    import { vitalRecord } from '$lib/data/projects.js';

    export let councils = {};
    export let selectedFeature;
    export let nimbyChoice = null;
    export let onBack = () => {};

    $: props = selectedFeature.properties;
    $: vital = vitalRecord(props);
    $: councilUrl = councils?.[props[PROPS.AUTHORITY]];
    $: articleUrl = nimbyChoice?.article_url;

    let copyLabel = 'Copy';
    function copyReference() {
        navigator.clipboard.writeText(props[PROPS.PLANNING_REF]).then(() => {
            copyLabel = 'Copied';
            setTimeout(() => (copyLabel = 'Copy'), 2000);
        });
    }

    const detailKeys = [
        PROPS.OPERATOR,
        PROPS.TECH_TYPE,
        PROPS.CAPACITY,
        PROPS.STATUS,
        PROPS.SUBMITTED,
        PROPS.REFUSED,
        PROPS.WITHDRAWN,
    ];
</script>
<br>
<button class="back font-data" on:click={onBack}>← Back to register</button>

<article class="entry">
    <header class="memorial">
        <span class="dagger font-display">†</span>
        <h2 class="font-display">{props[PROPS.SITE_NAME]}</h2>
        <p class="lifespan font-data">
            {vital.born ?? '?'} — {vital.died ?? 'unknown'}
            <span class="verb">({vital.cause})</span>
        </p>
        <p class="epitaph font-display">Requiescat in pace</p>
        <p class="resting font-data">{props[PROPS.AUTHORITY]}</p>
    </header>

    <FinancialCard properties={props} />

    <div class="ceg-card facts">
        <div class="fact">
            <span class="ceg-eyebrow">Capacity</span>
            <span class="font-data value">{props[PROPS.CAPACITY]} MW</span>
        </div>
        <div class="fact">
            <span class="ceg-eyebrow">Technology</span>
            <span class="font-data value">{props[PROPS.TECH_TYPE]}</span>
        </div>
        <div class="fact full">
            <span class="ceg-eyebrow">Planning reference</span>
            <span class="ref-line">
                <span class="font-data value">{props[PROPS.PLANNING_REF]}</span>
                <button class="copy font-data" on:click={copyReference}>{copyLabel}</button>
            </span>
        </div>
    </div>

    <div class="links">
        {#if councilUrl}
            <a class="link primary font-data" href={councilUrl} target="_blank" rel="noopener">
                Council planning portal ↗
            </a>
        {/if}
        {#if articleUrl}
            <a class="link font-data" href={articleUrl} target="_blank" rel="noopener">
                Related news article ↗
            </a>
        {/if}
    </div>

    <details class="ceg-card all-details">
        <summary class="ceg-eyebrow">All record fields</summary>
        <table class="font-data">
            <tbody>
                {#each detailKeys.filter((k) => props[k] !== undefined && props[k] !== 0) as key}
                    <tr>
                        <td class="key">{key}</td>
                        <td class="val">{props[key]}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </details>

    {#if nimbyChoice}
        <section class="community">
            <p class="ceg-eyebrow">Community opposition</p>
            {#if nimbyChoice['Interesting Tidbits']?.length}
                <ul class="tidbits">
                    {#each nimbyChoice['Interesting Tidbits'] as tidbit}
                        <li>{tidbit}</li>
                    {/each}
                </ul>
            {/if}
            <ChatElement chats={[nimbyChoice.header, nimbyChoice['Snide Commentary']].filter(Boolean)} />
        </section>
    {/if}
</article>

<style>
    .back {
        background: none;
        border: none;
        padding: 0.25rem 0;
        font-size: 0.7rem;
        color: var(--ceg-ink-soft);
        cursor: pointer;
        letter-spacing: 0.05em;
    }
    .back:hover {
        color: var(--ceg-vermillion);
    }
    .memorial {
        text-align: center;
        padding: 1.25rem 0.75rem 1rem;
        border-top: 2px solid var(--ceg-ink);
        border-bottom: 1px solid var(--ceg-rule);
        margin-bottom: 0.25rem;
    }
    .dagger {
        display: block;
        font-size: 1.5rem;
        color: var(--ceg-vermillion);
        line-height: 1;
    }
    .memorial h2 {
        font-size: 1.7rem;
        font-weight: 600;
        line-height: 1.15;
        color: var(--ceg-ink);
        margin: 0.25rem 0;
    }
    .lifespan {
        font-size: 0.75rem;
        color: var(--ceg-ink-soft);
    }
    .lifespan .verb {
        color: var(--ceg-vermillion);
    }
    .epitaph {
        font-style: italic;
        font-size: 0.78rem;
        color: var(--ceg-ink-soft);
        margin-top: 0.15rem;
    }
    .resting {
        margin-top: 0.2rem;
        font-size: 0.65rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ceg-ink-soft);
        opacity: 0.75;
    }
    .facts {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem 1rem;
        padding: 0.85rem 1rem;
        margin-top: 0.5rem;
    }
    .fact {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }
    .fact.full {
        grid-column: 1 / -1;
    }
    .value {
        font-size: 0.82rem;
        color: var(--ceg-ink);
    }
    .ref-line {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .copy {
        font-size: 0.62rem;
        padding: 0.1rem 0.45rem;
        border: 1px solid var(--ceg-rule);
        border-radius: 3px;
        background: transparent;
        color: var(--ceg-ink-soft);
        cursor: pointer;
    }
    .copy:hover {
        border-color: var(--ceg-vermillion);
        color: var(--ceg-vermillion);
    }
    .links {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        margin-top: 0.6rem;
    }
    .link {
        display: block;
        text-align: center;
        font-size: 0.72rem;
        padding: 0.55rem;
        border: 1px solid var(--ceg-ink);
        border-radius: 3px;
        color: var(--ceg-ink);
        text-decoration: none;
        transition: background 0.15s ease, color 0.15s ease;
    }
    .link:hover {
        background: var(--ceg-ink);
        color: var(--ceg-bone);
    }
    .link.primary {
        background: var(--ceg-vermillion);
        border-color: var(--ceg-vermillion);
        color: var(--ceg-bone);
    }
    .link.primary:hover {
        background: #a8351a;
    }
    .all-details {
        margin-top: 0.6rem;
        padding: 0.6rem 1rem;
    }
    .all-details summary {
        cursor: pointer;
        list-style: none;
    }
    .all-details summary::after {
        content: ' +';
    }
    .all-details[open] summary::after {
        content: ' −';
    }
    .all-details table {
        width: 100%;
        margin-top: 0.5rem;
        font-size: 0.68rem;
        border-collapse: collapse;
    }
    .all-details td {
        padding: 0.3rem 0;
        border-top: 1px solid var(--ceg-rule);
        vertical-align: top;
    }
    .all-details .key {
        color: var(--ceg-ink-soft);
        padding-right: 0.75rem;
    }
    .all-details .val {
        text-align: right;
        color: var(--ceg-ink);
    }
    .community {
        margin-top: 1rem;
    }
    .tidbits {
        list-style: none;
        padding: 0;
        margin: 0.4rem 0 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .tidbits li {
        font-size: 0.78rem;
        line-height: 1.45;
        color: var(--ceg-ink);
        padding-left: 0.75rem;
        border-left: 2px solid var(--ceg-ember);
    }
</style>
