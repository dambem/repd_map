// Map sources, layers and paint expressions.
// Replaces utils/mapUtils.js (whose addNimbyLayer / addRenewableProjectsSource
// referenced undefined variables and were never callable).

import { PROPS, COLORS, TECH, TECH_COLORS } from '$lib/config/constants.js';
import { STONES } from '$lib/map/headstones.js';

export const LAYER = {
  PROJECTS: 'projects-layer',
  GRAVES: 'graves-layer',
  HALO: 'grave-halo',
  AUTHORITIES: 'authorities-layer',
  AUTHORITY_LINES: 'authorities-outline',
};

export const SOURCE = {
  PROJECTS: 'projects',
  AUTHORITIES: 'authorities',
};

/* ------------------------------------------------------------------ paint */

/** Circle colour by NIMBY tier (with selection state on top). */
export function nimbyColorExpression(nimbyIndex) {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false], COLORS.selected,
    ['in', ['get', PROPS.REF_ID], ['literal', nimbyIndex.confirmedIds]], COLORS.vermillion,
    ['in', ['get', PROPS.REF_ID], ['literal', nimbyIndex.potentialIds]], COLORS.ember,
    COLORS.ash,
  ];
}

/** Circle colour by technology type (with selection state on top). */
export function typeColorExpression() {
  return [
    'case',
    ['boolean', ['feature-state', 'selected'], false], COLORS.selected,
    [
      'match',
      ['get', PROPS.TECH_TYPE],
      TECH.SOLAR, TECH_COLORS[TECH.SOLAR],
      TECH.WIND, TECH_COLORS[TECH.WIND],
      TECH.BATTERY, TECH_COLORS[TECH.BATTERY],
      TECH_COLORS.other,
    ],
  ];
}

/** Headstone icon by NIMBY tier. */
export function nimbyStoneExpression(nimbyIndex) {
  return [
    'case',
    ['in', ['get', PROPS.REF_ID], ['literal', nimbyIndex.confirmedIds]], STONES.confirmed,
    ['in', ['get', PROPS.REF_ID], ['literal', nimbyIndex.potentialIds]], STONES.potential,
    STONES.none,
  ];
}

/** Headstone icon by technology type. */
export function typeStoneExpression() {
  return [
    'match',
    ['get', PROPS.TECH_TYPE],
    TECH.SOLAR, STONES.solar,
    TECH.WIND, STONES.wind,
    TECH.BATTERY, STONES.battery,
    STONES.other,
  ];
}

/** Authority fill by project count (warm scale on dark base). */
function countFillExpression() {
  return [
    'interpolate', ['linear'], ['get', 'project_count'],
    0, '#2a2d33',
    1, '#5c4a2e',
    3, '#8a5d2a',
    5, '#b06a26',
    10, '#c85122',
    15, '#c8401f',
  ];
}

/** Authority fill by estimated investment lost (£m). */
function investmentFillExpression() {
  return [
    'interpolate', ['linear'], ['get', 'capex_lost_m'],
    0, '#2a2d33',
    5, '#3d4a45',
    25, '#3f6e5d',
    75, '#4f9c6e',
    150, '#86c232',
    300, '#d9c832',
  ];
}

/* ----------------------------------------------------------------- layers */

export function addProjectsSource(map, features) {
  map.addSource(SOURCE.PROJECTS, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features },
    // Required for feature-state (hover/selected) to work — GeoJSON features
    // in this dataset carry no top-level `id`, so promote the REPD ref.
    promoteId: PROPS.REF_ID,
  });
}

export function addProjectsLayer(map, nimbyIndex) {
  // Selection / hover halo — a ring that works at every zoom, and the only
  // way to highlight headstones (icon-image is layout, so it can't react to
  // feature-state).
  map.addLayer({
    id: LAYER.HALO,
    type: 'circle',
    source: SOURCE.PROJECTS,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'],
        ['coalesce', ['to-number', ['get', PROPS.CAPACITY]], 0],
        0, 8, 50, 15, 200, 22,
      ],
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-color': COLORS.selected,
      'circle-stroke-width': 2.5,
      'circle-stroke-opacity': [
        'case',
        ['boolean', ['feature-state', 'selected'], false], 1,
        ['boolean', ['feature-state', 'hover'], false], 0.45,
        0,
      ],
    },
  });

  // Plot view (low zoom): capacity-sized circles.
  map.addLayer({
    id: LAYER.PROJECTS,
    type: 'circle',
    source: SOURCE.PROJECTS,
    paint: {
      'circle-radius': [
        'interpolate', ['linear'],
        ['coalesce', ['to-number', ['get', PROPS.CAPACITY]], 0],
        0, 4, 50, 11, 200, 18,
      ],
      'circle-color': nimbyColorExpression(nimbyIndex),
      'circle-stroke-color': [
        'case',
        ['boolean', ['feature-state', 'hover'], false], COLORS.bone,
        'rgba(232, 228, 218, 0.45)',
      ],
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false], 2,
        0.75,
      ],
      'circle-opacity': 0,
    },
  });

  // Cemetery view (high zoom): headstones standing on their plots.
  map.addLayer({
    id: LAYER.GRAVES,
    type: 'symbol',
    source: SOURCE.PROJECTS,
    layout: {
      'icon-image': nimbyStoneExpression(nimbyIndex),
      'icon-size': [
        'interpolate', ['linear'],
        ['coalesce', ['to-number', ['get', PROPS.CAPACITY]], 0],
        0, 0.55, 50, 0.85, 200, 1.2,
      ],
      'icon-anchor': 'bottom',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
    paint: {
      'icon-opacity': ['interpolate', ['linear'], ['zoom'], 8.2, 0, 9, 1],
    },
  });

  // Fade circles in, then hand over to headstones past zoom ~8.5.
  requestAnimationFrame(() => {
    map.setPaintProperty(LAYER.PROJECTS, 'circle-opacity-transition', {
      duration: 800,
      delay: 100,
    });
    map.setPaintProperty(LAYER.PROJECTS, 'circle-opacity', [
      'interpolate', ['linear'], ['zoom'],
      8.2, 0.88,
      9, 0,
    ]);
  });
}

export function addAuthoritiesSource(map, geojson) {
  map.addSource(SOURCE.AUTHORITIES, { type: 'geojson', data: geojson, generateId: true });
}

export function addAuthoritiesLayer(map) {
  map.addLayer({
    id: LAYER.AUTHORITIES,
    source: SOURCE.AUTHORITIES,
    type: 'fill',
    paint: {
      'fill-color': countFillExpression(),
      'fill-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false], 0.85,
        ['interpolate', ['linear'], ['get', 'project_count'], 0, 0.04, 1, 0.35, 5, 0.55, 15, 0.7],
      ],
    },
  });
  map.addLayer({
    id: LAYER.AUTHORITY_LINES,
    source: SOURCE.AUTHORITIES,
    type: 'line',
    paint: { 'line-color': 'rgba(232, 228, 218, 0.18)', 'line-width': 0.5 },
  });
}

/** Switch the choropleth between project count and estimated £ lost. */
export function setChoroplethMode(map, mode) {
  if (!map.getLayer(LAYER.AUTHORITIES)) return;
  map.setPaintProperty(
    LAYER.AUTHORITIES,
    'fill-color',
    mode === 'investment' ? investmentFillExpression() : countFillExpression(),
  );
  const opacityField = mode === 'investment' ? 'capex_lost_m' : 'project_count';
  const stops = mode === 'investment' ? [0, 0.04, 5, 0.35, 75, 0.55, 300, 0.7] : [0, 0.04, 1, 0.35, 5, 0.55, 15, 0.7];
  map.setPaintProperty(LAYER.AUTHORITIES, 'fill-opacity', [
    'case',
    ['boolean', ['feature-state', 'hover'], false], 0.85,
    ['interpolate', ['linear'], ['get', opacityField],
      stops[0], stops[1], stops[2], stops[3], stops[4], stops[5], stops[6], stops[7]],
  ]);
}

const LAYER_GROUPS = {
  [LAYER.PROJECTS]: [LAYER.PROJECTS, LAYER.GRAVES, LAYER.HALO],
  [LAYER.AUTHORITIES]: [LAYER.AUTHORITIES, LAYER.AUTHORITY_LINES],
};

export function setLayerVisible(map, layerId, visible) {
  for (const id of LAYER_GROUPS[layerId] ?? [layerId]) {
    if (!map.getLayer(id)) continue;
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  }
}

/** Apply a filter to every project-marker layer (plots, stones, halo). */
export function setProjectFilter(map, filter) {
  for (const id of LAYER_GROUPS[LAYER.PROJECTS]) {
    if (map.getLayer(id)) map.setFilter(id, filter);
  }
}

/* ---------------------------------------------------------------- filters */

/**
 * Build the layer filter for the active tech types + date window.
 * `activeTypes` is a list of canonical TECH values; `includeOther` lets
 * unmatched technologies through.
 */
export function buildProjectFilter({ startDate, endDate, activeTypes, includeOther }) {
  const filter = [
    'all',
    ['>=', ['get', PROPS.SUBMITTED], startDate],
    ['<=', ['get', PROPS.SUBMITTED], endDate],
  ];

  const allOn = activeTypes.length === 3 && includeOther;
  if (!allOn) {
    const clauses = [];
    if (activeTypes.length > 0) {
      clauses.push(['in', ['get', PROPS.TECH_TYPE], ['literal', activeTypes]]);
    }
    if (includeOther) {
      clauses.push([
        'all',
        ...Object.values(TECH).map((t) => ['!=', ['get', PROPS.TECH_TYPE], t]),
      ]);
    }
    filter.push(clauses.length > 0 ? ['any', ...clauses] : ['literal', false]);
  }
  return filter;
}
