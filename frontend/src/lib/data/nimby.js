// NIMBY classification.
//
// Replaces the previous accuracy1/2/3/accuracy_bad Sets (which overlapped and
// relied on nested `case` ordering to behave) with one explicit tier per ref:
//
//   confirmed  — Accuracy Score ≥ 70: strong sourcing for community opposition
//   potential  — 30 ≤ score < 70:     some evidence, lower confidence
//   (absent)   — score < 30 or no entry: not enough to claim anything

export const NIMBY_TIERS = {
  CONFIRMED: 'confirmed',
  POTENTIAL: 'potential',
};

/**
 * Build a lookup from a nimby_score.json array.
 * @returns {{
 *   tierOf: (refId: string|number) => string|null,
 *   scoreOf: (refId: string|number) => object|null,
 *   confirmedIds: string[],
 *   potentialIds: string[],
 * }}
 */
export function buildNimbyIndex(nimbyScores = []) {
  const byRef = new Map();
  const confirmedIds = [];
  const potentialIds = [];

  for (const entry of nimbyScores) {
    const refId = entry?.refid;
    if (refId === undefined || refId === null || refId === '') continue;
    byRef.set(String(refId), entry);

    const accuracy = Number(entry['Accuracy Score']) || 0;
    if (accuracy >= 70) confirmedIds.push(refId);
    else if (accuracy >= 30) potentialIds.push(refId);
  }

  return {
    tierOf(refId) {
      const entry = byRef.get(String(refId));
      if (!entry) return null;
      const accuracy = Number(entry['Accuracy Score']) || 0;
      if (accuracy >= 70) return NIMBY_TIERS.CONFIRMED;
      if (accuracy >= 30) return NIMBY_TIERS.POTENTIAL;
      return null;
    },
    scoreOf(refId) {
      return byRef.get(String(refId)) ?? null;
    },
    confirmedIds,
    potentialIds,
  };
}
