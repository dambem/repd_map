// Central place for property keys, technology types and the colour system.
// Everything that was previously hard-coded across Map.svelte / mapUtils.js lives here.

/** GeoJSON property keys used throughout the app (REPD column names). */
export const PROPS = {
  REF_ID: 'Ref ID',
  SITE_NAME: 'Site Name',
  OPERATOR: 'Operator (or Applicant)',
  TECH_TYPE: 'Technology Type',
  CAPACITY: 'Installed Capacity (MWelec)',
  STATUS: 'Development Status',
  AUTHORITY: 'Planning Authority',
  PLANNING_REF: 'Planning Application Reference',
  SUBMITTED: 'Planning Application Submitted',
  REFUSED: 'Planning Permission Refused',
  WITHDRAWN: 'Planning Application Withdrawn',
};

/** Theme palette — keep in sync with the CSS custom properties in app.css. */
export const COLORS = {
  ink: '#15171c',
  parchment: '#efeae0',
  bone: '#e8e4da',
  vermillion: '#c8401f', // confirmed NIMBY
  ember: '#d98e32', //      potential NIMBY
  ash: '#9aa0a8', //        no community data
  selected: '#f5c542',
};

/** Canonical technology buckets used for filtering + the legend. */
export const TECH = {
  SOLAR: 'Solar Photovoltaics',
  WIND: 'Wind Onshore',
  BATTERY: 'Battery',
};

export const TECH_COLORS = {
  [TECH.SOLAR]: '#dca528',
  [TECH.WIND]: '#2e9c8e',
  [TECH.BATTERY]: '#3e6fb0',
  other: '#b8b2a6',
};

export const NIMBY_LEGEND = [
  { label: 'Confirmed NIMBY', color: COLORS.vermillion },
  { label: 'NIMBY potential', color: COLORS.ember },
  { label: 'No community data', color: COLORS.ash },
];

export const TYPE_LEGEND = [
  { label: 'Solar', color: TECH_COLORS[TECH.SOLAR] },
  { label: 'Wind', color: TECH_COLORS[TECH.WIND] },
  { label: 'Battery', color: TECH_COLORS[TECH.BATTERY] },
  { label: 'Other', color: TECH_COLORS.other },
];

export const DATE_RANGE = { min: '2019-01-01', max: '2025-01-01' };
