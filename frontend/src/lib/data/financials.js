// Financial estimates for cancelled projects.
//
// These are *order-of-magnitude* estimates derived from published UK benchmarks
// (DESNZ "Electricity Generation Costs", BEIS capex assumptions, BloombergNEF
// BESS figures). Real project costs vary widely with scale, grid connection and
// land — treat every number here as indicative, not accounting.

import { PROPS, TECH } from '$lib/config/constants.js';

/** Estimated capital expenditure, £ million per MW installed. */
export const CAPEX_PER_MW = {
  [TECH.SOLAR]: 0.65,
  [TECH.WIND]: 1.4,
  [TECH.BATTERY]: 0.55,
  'Anaerobic Digestion': 4.0,
  'EfW Incineration': 7.0,
  'Biomass (dedicated)': 3.0,
  Hydrogen: 2.0,
  default: 1.0,
};

/** Typical UK load factors (share of the year running at full output). */
export const CAPACITY_FACTOR = {
  [TECH.SOLAR]: 0.11,
  [TECH.WIND]: 0.27,
  [TECH.BATTERY]: null, // storage — shifts energy rather than generating it
  'Anaerobic Digestion': 0.7,
  'EfW Incineration': 0.8,
  'Biomass (dedicated)': 0.65,
  Hydrogen: null,
  default: 0.3,
};

export const HOUSEHOLD_KWH_PER_YEAR = 2700; // Ofgem typical domestic consumption
const HOURS_PER_YEAR = 8760;

function capacityOf(properties) {
  return parseFloat(properties?.[PROPS.CAPACITY]) || 0;
}

/**
 * Estimate the financials of a single project from its GeoJSON properties.
 * @returns {{ capexLostM: number, annualGWh: number|null, homesEquivalent: number|null, isStorage: boolean }}
 */
export function estimateProjectFinancials(properties) {
  const mw = capacityOf(properties);
  const tech = properties?.[PROPS.TECH_TYPE];
  const capexRate = CAPEX_PER_MW[tech] ?? CAPEX_PER_MW.default;
  const cf = CAPACITY_FACTOR[tech] !== undefined ? CAPACITY_FACTOR[tech] : CAPACITY_FACTOR.default;

  const capexLostM = mw * capexRate;
  const annualGWh = cf === null ? null : (mw * cf * HOURS_PER_YEAR) / 1000;
  const homesEquivalent =
    annualGWh === null ? null : Math.round((annualGWh * 1e6) / HOUSEHOLD_KWH_PER_YEAR);

  return { capexLostM, annualGWh, homesEquivalent, isStorage: cf === null };
}

/** Total estimated capex lost across a set of features, in £ million. */
export function totalCapexLostM(features) {
  return features.reduce(
    (sum, f) => sum + estimateProjectFinancials(f.properties).capexLostM,
    0,
  );
}

/**
 * Aggregate counts, capacity and estimated investment per planning authority.
 * @returns {Map<string, { count: number, capacityMW: number, capexLostM: number }>}
 */
export function aggregateByAuthority(features) {
  const byAuthority = new Map();
  for (const feature of features) {
    const name = feature.properties?.[PROPS.AUTHORITY] || 'Unknown';
    const entry = byAuthority.get(name) ?? { count: 0, capacityMW: 0, capexLostM: 0 };
    entry.count += 1;
    entry.capacityMW += capacityOf(feature.properties);
    entry.capexLostM += estimateProjectFinancials(feature.properties).capexLostM;
    byAuthority.set(name, entry);
  }
  return byAuthority;
}

/** Format £ millions for display: "£840k", "£24m", "£1.2bn". */
export function formatPoundsM(millions) {
  if (millions >= 1000) return `£${(millions / 1000).toFixed(1)}bn`;
  if (millions >= 10) return `£${Math.round(millions)}m`;
  if (millions >= 1) return `£${millions.toFixed(1)}m`;
  return `£${Math.round(millions * 1000)}k`;
}
