import { CATEGORIES } from '../types/core';
import type { PlayerEvaluation } from '../types/evaluation';

/**
 * "Why is A ranked above B?" — term-by-term difference (A − B) of every DDP component,
 * plus planning and market terms. Used by the Review/Debug screen and by QA tests.
 */
export interface CompareRow {
  term: string;
  a: number;
  b: number;
  diff: number;
}

export function compareEvaluations(a: PlayerEvaluation, b: PlayerEvaluation): { rows: CompareRow[]; summary: string } {
  const rows: CompareRow[] = [];
  const add = (term: string, x: number, y: number) => rows.push({ term, a: x, b: y, diff: x - y });
  add('BPV (base player value)', a.value.basePlayerValue, b.value.basePlayerValue);
  add('  per-game VAR', a.value.perGameVAR, b.value.perGameVAR);
  add('  expected-season VAR', a.value.expectedSeasonVAR, b.value.expectedSeasonVAR);
  add('Need', a.fit.need, b.fit.need);
  add('Punt synergy', a.fit.punt, b.fit.punt);
  add('Pool scarcity', a.fit.poolScarcity, b.fit.poolScarcity);
  add('Position', a.fit.position, b.fit.position);
  add('Multi-position', a.fit.multiPos, b.fit.multiPos);
  add('Redundancy', a.fit.redundancy, b.fit.redundancy);
  add('Playoff', a.adjustments.playoff, b.adjustments.playoff);
  add('Upside', a.adjustments.upside, b.adjustments.upside);
  add('Risk', a.adjustments.risk, b.adjustments.risk);
  add('User preference', a.adjustments.userPref, b.adjustments.userPref);
  add('= DDP raw', a.ddpRaw, b.ddpRaw);
  add('Next-pick scarcity (market)', a.market.nextPickScarcity, b.market.nextPickScarcity);
  add('Pair score (planning)', a.planning?.pairScore ?? a.ddpRaw, b.planning?.pairScore ?? b.ddpRaw);
  for (const c of CATEGORIES) add(`  capped z ${c}`, a.stats.cappedZ[c], b.stats.cappedZ[c]);
  const decisive = rows
    .filter((r) => !r.term.startsWith(' ') && !r.term.startsWith('=') && !r.term.startsWith('Pair') && !r.term.startsWith('Next'))
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
    .slice(0, 3)
    .map((r) => `${r.term} ${r.diff >= 0 ? '+' : ''}${r.diff.toFixed(2)}`);
  const summary = `${a.name} vs ${b.name}: DDP ${a.ddpRaw.toFixed(2)} vs ${b.ddpRaw.toFixed(2)}. Largest differences: ${decisive.join('; ')}.`;
  return { rows, summary };
}
