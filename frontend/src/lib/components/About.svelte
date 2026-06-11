<script>
    import {
        CAPEX_PER_MW,
        CAPACITY_FACTOR,
        HOUSEHOLD_KWH_PER_YEAR,
    } from '$lib/data/financials.js';

    // Render the actual constants the app calculates with, so this note can
    // never drift out of sync with the numbers on the map.
    const techRows = Object.entries(CAPEX_PER_MW)
        .filter(([key]) => key !== 'default')
        .map(([tech, capex]) => ({
            tech,
            capex,
            loadFactor: CAPACITY_FACTOR[tech],
        }));
</script>

<article class="ceg-card about">
    <p class="ceg-eyebrow">About this register</p>
    <p>
        An experiment in analysing what's stalling UK renewables. Site records are factual, drawn
        from the government's
        <a
            href="https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract"
            >REPD dataset</a
        >
        of refused and withdrawn planning applications.
        <strong>The commentary is generated, and the points don't matter.</strong>
    </p>
    <p>
        Gemini was used to surface possible news coverage for each site. On the map,
        <span class="vermillion">vermillion</span> headstones mark high confidence in local
        opposition; stone size reflects installed capacity. Click any grave for its full record.
    </p>

    <details class="methods">
        <summary class="ceg-eyebrow">How the £ figures are worked out</summary>
        <div class="methods-body">
            <p>
                Every financial figure is an <strong>indicative estimate</strong> rather than true information. If you have an improved calculation - please contribute to the project!
            </p>
            <ol>
                <li>
                    <strong>Investment lost</strong> = capacity × a per-technology build cost
                    benchmark (£m per MW, from DESNZ/BEIS published generation cost figures).
                </li>
                <li>
                    <strong>Generation forgone</strong> = capacity × typical UK load factor ×
                    8,760 hours. Storage (battery, hydrogen) shifts energy rather than generating
                    it, so gets no generation figure.
                </li>
                <li>
                    <strong>Homes equivalent</strong> = generation ÷
                    {HOUSEHOLD_KWH_PER_YEAR.toLocaleString()} kWh, Ofgem's typical annual
                    household consumption.
                </li>
            </ol>
            <table class="font-data">
                <thead>
                    <tr>
                        <th>Technology</th>
                        <th>£m / MW</th>
                        <th>Load factor</th>
                    </tr>
                </thead>
                <tbody>
                    {#each techRows as row}
                        <tr>
                            <td>{row.tech}</td>
                            <td>£{row.capex}m</td>
                            <td>{row.loadFactor === null ? 'storage' : `${Math.round(row.loadFactor * 100)}%`}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </details>
</article>

<style>
    .about {
        padding: 0.9rem 1rem;
        font-size: 0.76rem;
        line-height: 1.55;
        color: var(--ceg-ink);
    }
    .about p + p {
        margin-top: 0.5rem;
    }
    .about a {
        color: var(--ceg-vermillion);
        text-decoration: underline;
        text-underline-offset: 2px;
    }
    .vermillion {
        color: var(--ceg-vermillion);
        font-weight: 600;
    }
    .methods {
        margin-top: 0.7rem;
        border-top: 1px solid var(--ceg-rule);
        padding-top: 0.6rem;
    }
    .methods summary {
        cursor: pointer;
        list-style: none;
    }
    .methods summary::after {
        content: ' +';
    }
    .methods[open] summary::after {
        content: ' −';
    }
    .methods summary:hover {
        color: var(--ceg-vermillion);
    }
    .methods-body {
        margin-top: 0.5rem;
    }
    .methods ol {
        margin: 0.4rem 0 0.6rem;
        padding-left: 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    .methods table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.64rem;
        margin: 0.3rem 0 0.5rem;
    }
    .methods th {
        text-align: left;
        font-weight: 500;
        color: var(--ceg-ink-soft);
        border-bottom: 1px solid var(--ceg-ink);
        padding: 0.25rem 0.4rem 0.25rem 0;
    }
    .methods td {
        border-bottom: 1px solid var(--ceg-rule);
        padding: 0.25rem 0.4rem 0.25rem 0;
    }
    .caveat {
        font-size: 0.66rem;
        font-style: italic;
        color: var(--ceg-ink-soft);
    }
</style>
