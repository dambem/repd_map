<script>
    import { estimateProjectFinancials, formatPoundsM } from '$lib/data/financials.js';

    export let properties;

    $: financials = estimateProjectFinancials(properties);
</script>

<div class="ceg-card finance">
    <p class="ceg-eyebrow">Estimated cost of cancellation</p>

    <p class="headline font-display">{formatPoundsM(financials.capexLostM)}</p>
    <p class="sub">capital investment written off</p>

    {#if financials.annualGWh !== null}
        <div class="row font-data">
            <span>{financials.annualGWh.toFixed(1)} GWh</span>
            <span class="row-label">generation forgone, per year</span>
        </div>
        <div class="row font-data">
            <span>≈ {financials.homesEquivalent.toLocaleString()}</span>
            <span class="row-label">homes' annual electricity</span>
        </div>
    {:else if financials.isStorage}
        <div class="row font-data">
            <span class="row-label">storage project — shifts energy rather than generating it</span>
        </div>
    {/if}

    <p class="caveat">
        Indicative only — derived from published UK capex and load-factor benchmarks, not project
        accounts.
    </p>
</div>

<style>
    .finance {
        padding: 0.9rem 1rem;
        margin-top: 0.5rem;
    }
    .headline {
        font-size: 2rem;
        line-height: 1.1;
        font-weight: 700;
        color: var(--ceg-vermillion);
        margin-top: 0.3rem;
    }
    .sub {
        font-size: 0.72rem;
        color: var(--ceg-ink-soft);
        margin-bottom: 0.6rem;
    }
    .row {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        font-size: 0.78rem;
        color: var(--ceg-ink);
        padding: 0.2rem 0;
        border-top: 1px solid var(--ceg-rule);
    }
    .row-label {
        font-size: 0.68rem;
        color: var(--ceg-ink-soft);
    }
    .caveat {
        margin-top: 0.6rem;
        font-size: 0.62rem;
        font-style: italic;
        color: var(--ceg-ink-soft);
        opacity: 0.8;
    }
</style>
