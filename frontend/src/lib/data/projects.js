// Helpers for reading REPD project records.
// REPD mixes date formats: "Planning Application Submitted" is ISO
// (yyyy-mm-dd) while refusal/withdrawal dates are dd/mm/yyyy.

import { PROPS } from '$lib/config/constants.js';

function parseUkDate(value) {
  if (!value || value === 0 || value === '0') return null;
  const match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  // Already ISO, or unparseable — return as-is if it looks like a date.
  return /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? String(value) : null;
}

/**
 * The project's "vital record": when it was submitted, when and how it died.
 * @returns {{ born: string|null, died: string|null, cause: 'refused'|'withdrawn'|'cancelled' }}
 */
export function vitalRecord(properties) {
  const born = parseUkDate(properties[PROPS.SUBMITTED]);
  const refused = parseUkDate(properties[PROPS.REFUSED]);
  const withdrawn = parseUkDate(properties[PROPS.WITHDRAWN]);
  return {
    born,
    died: refused ?? withdrawn,
    cause: refused ? 'refused' : withdrawn ? 'withdrawn' : 'cancelled',
  };
}

/** "2020 – 2021" style lifespan for epitaphs; falls back to full dates. */
export function lifespanLabel(properties) {
  const { born, died } = vitalRecord(properties);
  const year = (iso) => (iso ? iso.slice(0, 4) : '?');
  return `${year(born)} – ${year(died)}`;
}
