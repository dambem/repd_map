<script>
    import { onMount, onDestroy } from 'svelte';
    import maplibregl from 'maplibre-gl';
    import 'maplibre-gl/dist/maplibre-gl.css';
    import { fly } from 'svelte/transition';
    import { PUBLIC_MAPTILER_API_KEY } from '$env/static/public';

    import Timeline from '$lib/components/Timeline.svelte';
    import ControlPanel from '$lib/components/ControlPanel.svelte';
    import SideBarMain from '$lib/components/sidebar/SideBarMain.svelte';
    import SelectedFeatureUI from '$lib/components/sidebar/SelectedFeatureUI.svelte';

    import { PROPS, TECH, DATE_RANGE } from '$lib/config/constants.js';
    import { buildNimbyIndex } from '$lib/data/nimby.js';
    import { vitalRecord, lifespanLabel } from '$lib/data/projects.js';
    import { registerHeadstoneImages } from '$lib/map/headstones.js';
    import {
        aggregateByAuthority,
        totalCapexLostM,
        formatPoundsM,
    } from '$lib/data/financials.js';
    import {
        LAYER,
        SOURCE,
        addProjectsSource,
        addProjectsLayer,
        addAuthoritiesSource,
        addAuthoritiesLayer,
        nimbyStoneExpression,
        typeStoneExpression,
        setChoroplethMode,
        setLayerVisible,
        setProjectFilter,
        buildProjectFilter,
    } from '$lib/map/layers.js';

    export let points = [];
    export let nimby_score = [];
    export let councils = {};
    export let refused = [];

    /* ----------------------------------------------------------- UI state */
    let sidebarOpen = true;
    let colorMode = 'nimby';
    let choroplethMode = 'count';
    let activeTechs = new Set(Object.values(TECH));
    let includeOther = true;
    let showAuthorities = true;
    let showProjects = true;
    let startDate = '2020-01-01';
    let endDate = DATE_RANGE.max;

    /* ---------------------------------------------------------- map state */
    let mapContainer;
    let map;
    let mapReady = false;
    let selectedFeature = null;
    let nimbyChoice = null;

    const nimbyIndex = buildNimbyIndex(nimby_score);

    /* -------------------------------------------------------------- stats */
    // Headline figures follow the active filters and timeline.
    $: filteredPoints = points.filter((p) => {
        const submitted = p.properties[PROPS.SUBMITTED];
        if (submitted < startDate || submitted > endDate) return false;
        const tech = p.properties[PROPS.TECH_TYPE];
        return Object.values(TECH).includes(tech) ? activeTechs.has(tech) : includeOther;
    });

    $: stats = [
        {
            label: 'Projects buried',
            value: filteredPoints.length.toLocaleString(),
            trend: 'in current view',
        },
        {
            label: 'Capacity interred',
            value: Math.round(
                filteredPoints.reduce(
                    (sum, p) => sum + (parseFloat(p.properties[PROPS.CAPACITY]) || 0),
                    0,
                ),
            ).toLocaleString(),
            trend: 'MW',
        },
        {
            label: 'Est. investment lost',
            value: formatPoundsM(totalCapexLostM(filteredPoints)),
            trend: 'capex, indicative',
            isMoney: true,
        },
    ];

    /* ----------------------------------------------------------- map init */
    function enrichAuthorities(authoritiesGeojson) {
        const byAuthority = aggregateByAuthority(points);
        for (const feature of authoritiesGeojson.features) {
            const entry = byAuthority.get(feature.properties.LAD24NM);
            feature.properties.project_count = entry?.count ?? 0;
            feature.properties.total_capacity = Math.round(entry?.capacityMW ?? 0);
            feature.properties.capex_lost_m = Math.round(entry?.capexLostM ?? 0);
        }
        return authoritiesGeojson;
    }

    function initMap(authoritiesGeojson) {
        map = new maplibregl.Map({
            container: mapContainer,
            style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${PUBLIC_MAPTILER_API_KEY}`,
            center: [-4, 55.2],
            zoom: 4.8,
            attributionControl: { compact: true },
        });

        map.on('load', () => {
            registerHeadstoneImages(map);
            addAuthoritiesSource(map, enrichAuthorities(authoritiesGeojson));
            addAuthoritiesLayer(map);
            addProjectsSource(map, points);
            addProjectsLayer(map, nimbyIndex);
            applyFilters();
            wireInteractions();
            mapReady = true;
            selectFromHash();
        });
    }

    /* -------------------------------------------------------- interaction */
    function wireInteractions() {
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
        let hoveredPointId = null;
        let hoveredAuthorityId = null;

        const clearHover = () => {
            if (hoveredPointId !== null) {
                map.setFeatureState({ source: SOURCE.PROJECTS, id: hoveredPointId }, { hover: false });
                hoveredPointId = null;
            }
            if (hoveredAuthorityId !== null) {
                map.setFeatureState(
                    { source: SOURCE.AUTHORITIES, id: hoveredAuthorityId },
                    { hover: false },
                );
                hoveredAuthorityId = null;
            }
        };

        map.on('mousemove', (e) => {
            const queryLayers = [LAYER.PROJECTS, LAYER.AUTHORITIES].filter((id) =>
                map.getLayer(id),
            );
            const features = map.queryRenderedFeatures(e.point, { layers: queryLayers });

            map.getCanvas().style.cursor = '';
            popup.remove();
            clearHover();
            if (!features.length) return;

            map.getCanvas().style.cursor = 'pointer';
            const point = features.find((f) => f.layer.id === LAYER.PROJECTS);

            if (point) {
                hoveredPointId = point.id;
                map.setFeatureState({ source: SOURCE.PROJECTS, id: hoveredPointId }, { hover: true });
                popup
                    .setLngLat(e.lngLat)
                    .setHTML(
                        `<div class="epitaph-eyebrow">Here lies</div>` +
                            `<h3>${point.properties[PROPS.SITE_NAME]}</h3>` +
                            `<div class="epitaph-dates">✝ ${lifespanLabel(point.properties)}</div>` +
                            `<div>${point.properties[PROPS.AUTHORITY]}</div>` +
                            `<div class="popup-figure">${point.properties[PROPS.CAPACITY]} MW never built</div>`,
                    )
                    .addTo(map);
                return;
            }

            const authority = features.find((f) => f.layer.id === LAYER.AUTHORITIES);
            if (authority) {
                hoveredAuthorityId = authority.id;
                map.setFeatureState(
                    { source: SOURCE.AUTHORITIES, id: hoveredAuthorityId },
                    { hover: true },
                );
                const { LAD24NM, project_count, total_capacity, capex_lost_m } = authority.properties;
                popup
                    .setLngLat(e.lngLat)
                    .setHTML(
                        `<h3>${LAD24NM}</h3>` +
                            (project_count > 0
                                ? `<div>${project_count} cancelled · ${total_capacity} MW</div>` +
                                  `<div class="popup-figure">≈ £${capex_lost_m}m est. investment lost</div>`
                                : `<div>No cancelled projects recorded</div>`),
                    )
                    .addTo(map);
            }
        });

        map.on('mouseleave', LAYER.PROJECTS, () => {
            clearHover();
            map.getCanvas().style.cursor = '';
            popup.remove();
        });

        map.on('click', LAYER.PROJECTS, (e) => {
            if (e.features.length) selectFeature(e.features[0]);
        });

        map.on('click', LAYER.AUTHORITIES, (e) => {
            // Only zoom when no project marker was under the cursor.
            const hits = map.queryRenderedFeatures(e.point, { layers: [LAYER.PROJECTS] });
            if (hits.length) return;
            zoomToAuthority(e.features[0]);
        });
    }

    function selectFeature(feature) {
        if (selectedFeature) {
            map.setFeatureState(
                { source: SOURCE.PROJECTS, id: selectedFeature.properties[PROPS.REF_ID] },
                { selected: false },
            );
        }
        selectedFeature = feature;
        map.setFeatureState(
            { source: SOURCE.PROJECTS, id: feature.properties[PROPS.REF_ID] },
            { selected: true },
        );
        history.replaceState(null, '', `#grave-${feature.properties[PROPS.REF_ID]}`);
        nimbyChoice = nimbyIndex.scoreOf(feature.properties[PROPS.REF_ID]) ?? {
            header: 'No community information available yet',
            'Interesting Tidbits': [],
            'Snide Commentary':
                'Nothing on record for this one. Either the locals were quiet, or nobody wrote it down.',
        };
        sidebarOpen = true;
    }

    function resetSelection() {
        if (selectedFeature && map) {
            map.setFeatureState(
                { source: SOURCE.PROJECTS, id: selectedFeature.properties[PROPS.REF_ID] },
                { selected: false },
            );
        }
        selectedFeature = null;
        nimbyChoice = null;
        history.replaceState(null, '', window.location.pathname);
    }

    /** Fly to a grave and open its record — used by the burial register and deep links. */
    function selectByRef(refId) {
        const feature = points.find((p) => String(p.properties[PROPS.REF_ID]) === String(refId));
        if (!feature || !map) return;
        map.flyTo({ center: feature.geometry.coordinates, zoom: 10.5, duration: 1600 });
        selectFeature(feature);
    }

    function selectFromHash() {
        const match = window.location.hash.match(/^#grave-(.+)$/);
        if (match) selectByRef(decodeURIComponent(match[1]));
    }

    function zoomToAuthority(feature) {
        const bounds = new maplibregl.LngLatBounds();
        const geometry = feature.geometry;
        const rings =
            geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.coordinates.map((p) => p[0]);
        rings.forEach((ring) => ring.forEach((coord) => bounds.extend(coord)));
        map.fitBounds(bounds, { padding: 40, maxZoom: 12 });
    }

    /* ------------------------------------------------------------ updates */
    function applyFilters() {
        if (!map?.getLayer(LAYER.PROJECTS)) return;
        setProjectFilter(
            map,
            buildProjectFilter({ startDate, endDate, activeTypes: [...activeTechs], includeOther }),
        );
    }

    function applyControls() {
        if (!mapReady) return;
        map.setLayoutProperty(
            LAYER.PROJECTS,
            'icon-image',
            colorMode === 'nimby' ? nimbyStoneExpression(nimbyIndex) : typeStoneExpression(),
        );
        setChoroplethMode(map, choroplethMode);
        setLayerVisible(map, LAYER.PROJECTS, showProjects);
        setLayerVisible(map, LAYER.AUTHORITIES, showAuthorities);
        applyFilters();
    }

    $: if (mapReady && (startDate || endDate)) applyFilters();

    /* ---------------------------------------------------------- lifecycle */
    onMount(async () => {
        const response = await fetch('/localauth.json');
        const authoritiesGeojson = await response.json();
        initMap(authoritiesGeojson);
    });

    onDestroy(() => map?.remove());
</script>

<div class="app">
    <button
        class="sidebar-toggle font-data"
        on:click={() => (sidebarOpen = !sidebarOpen)}
        aria-label={sidebarOpen ? 'Hide panel' : 'Show panel'}
    >
        {sidebarOpen ? '‹' : '›'}
    </button>

    {#if sidebarOpen}
        <aside class="sidebar ceg-scroll" transition:fly={{ x: -240, duration: 250 }}>
            {#if selectedFeature}
                <SelectedFeatureUI {councils} {selectedFeature} {nimbyChoice} onBack={resetSelection} />
            {:else}
                <SideBarMain {stats} {refused} points={filteredPoints} onSelect={selectByRef} />
            {/if}

            <footer class="sidebar-footer font-data">
                <a href="https://form.jotform.com/251386339530055">Suggest a correction</a>
                <a
                    href="https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract"
                >
                    REPD · Jan 2025 · v1.1
                </a>
            </footer>
        </aside>
    {/if}

    <div class="map-container" bind:this={mapContainer}></div>
    <div class="vignette" aria-hidden="true"></div>

    <ControlPanel
        bind:colorMode
        bind:choroplethMode
        bind:activeTechs
        bind:includeOther
        bind:showAuthorities
        bind:showProjects
        onChange={applyControls}
    />

    <Timeline bind:startDate bind:endDate minDate={DATE_RANGE.min} maxDate={DATE_RANGE.max} />
</div>

<style>
    .app {
        position: relative;
        height: 100vh;
        height: 100dvh;
        overflow: hidden;
        background: var(--ceg-ink);
    }
    .map-container {
        height: 100%;
    }
    .vignette {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 30;
        background: radial-gradient(ellipse at center, transparent 52%, rgba(8, 9, 12, 0.5) 100%);
    }
    .sidebar {
        position: absolute;
        inset: 0 auto 0 0;
        width: min(420px, 92vw);
        background: var(--ceg-parchment);
        border-right: 1px solid rgba(232, 228, 218, 0.2);
        box-shadow: 8px 0 32px rgba(0, 0, 0, 0.35);
        z-index: 50;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.9rem 1.1rem 1rem;
        color: var(--ceg-ink);
    }
    .sidebar-toggle {
        position: absolute;
        top: 0.75rem;
        left: 0.75rem;
        z-index: 60;
        width: 30px;
        height: 30px;
        border-radius: 3px;
        border: 1px solid rgba(232, 228, 218, 0.3);
        background: var(--ceg-ink);
        color: var(--ceg-bone);
        font-size: 1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .sidebar-toggle:hover {
        border-color: var(--ceg-vermillion);
        color: var(--ceg-vermillion);
    }
    .sidebar-footer {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-top: 1rem;
        padding-top: 0.75rem;
        border-top: 1px solid var(--ceg-rule);
        font-size: 0.62rem;
    }
    .sidebar-footer a {
        color: var(--ceg-ink-soft);
        text-decoration: none;
        letter-spacing: 0.05em;
    }
    .sidebar-footer a:hover {
        color: var(--ceg-vermillion);
    }
    @media (max-width: 640px) {
        .sidebar {
            width: 88vw;
        }
    }
</style>
