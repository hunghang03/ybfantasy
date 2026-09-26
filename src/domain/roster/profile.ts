import type { StrategyConfig } from '../config/strategyConfig';
import { byRosterSize } from '../config/defaults';
import { clamp, clamp01, safeDiv } from '../numeric/safe';
import { CATEGORIES, mapCategories, type Category, type CategoryRecord } from '../types/core';
import type {
  CategoryState,
  DisplayState,
  RosterTotals,
  StateMaturity,
  StaticPlayer,
} from '../types/evaluation';
import { teamPct } from '../stats/zscores';

/**
 * Current-roster category profile, need and redundancy (DESIGN §6.1, §6.3, §6.5).
 *   s_c = Σ ẑ_c over the roster;  B_c(k) = Σ_{j≤k} cohortMean_j;  σT_c(k) = √k · sdBase_c
 *   d_c = (s_c − B_c(k)) / σT_c(k)   (0 when k = 0 or σT ≈ 0)
 */

export interface Standing {
  s: CategoryRecord<number>;
  B: CategoryRecord<number>;
  sigmaT: CategoryRecord<number>;
  d: CategoryRecord<number>;
}

export function computeStanding(
  roster: readonly StaticPlayer[],
  cumulativeExpected: readonly CategoryRecord<number>[],
  teamSdBase: CategoryRecord<number>,
  eps: number,
): Standing {
  const k = roster.length;
  const idx = Math.min(k, cumulativeExpected.length - 1);
  const B = cumulativeExpected[idx]!;
  const s = mapCategories((c) => roster.reduce((acc, p) => acc + p.stats.cappedZ[c], 0));
  const sigmaT = mapCategories((c) => Math.sqrt(k) * teamSdBase[c]);
  const d = mapCategories((c) => (k === 0 ? 0 : safeDiv(s[c] - B[c], sigmaT[c], 0, eps)));
  return { s, B, sigmaT, d };
}

export function baseState(d: number, config: StrategyConfig): Exclude<CategoryState, 'SOFT_PUNT' | 'PUNT'> {
  const t = config.categoryStateThresholds;
  if (d >= t.elite) return 'ELITE';
  if (d >= t.strong) return 'STRONG';
  if (d >= t.competitive) return 'COMPETITIVE';
  if (d >= t.weak) return 'WEAK';
  return 'CRITICAL';
}

export function stateMaturity(k: number, config: StrategyConfig): StateMaturity {
  const m = config.categoryStateMaturity;
  return k <= m.tendencyMaxRoster ? 'TENDENCY' : k <= m.emergingMaxRoster ? 'EMERGING' : 'FULL';
}

/**
 * Sample-size-aware presentation of a category state (O1). Presentation only: `state`, d, need and DDP are
 * untouched. Punt states (auto or manual) are always shown as they are.
 *  - TENDENCY (roster ≤ 2): direction only — LEANING_STRONG / EVEN / LEANING_WEAK, never CRITICAL or WEAK.
 *  - EMERGING (roster 3–4): a weakness may be named (WEAK), but never CRITICAL.
 *  - FULL (roster ≥ 5): the calculated state.
 */
export function displayCategoryState(state: CategoryState, maturity: StateMaturity): DisplayState {
  if (state === 'PUNT' || state === 'SOFT_PUNT' || maturity === 'FULL') return state;
  if (maturity === 'EMERGING') return state === 'CRITICAL' ? 'WEAK' : state;
  if (state === 'ELITE' || state === 'STRONG') return 'LEANING_STRONG';
  if (state === 'WEAK' || state === 'CRITICAL') return 'LEANING_WEAK';
  return 'EVEN';
}

/** need_c = clamp((strong − d)/fullDeficit, 0, 1)·m_c + prior_c·max(0, 1 − k/decay) */
export function computeNeed(
  d: CategoryRecord<number>,
  m: CategoryRecord<number>,
  k: number,
  config: StrategyConfig,
): CategoryRecord<number> {
  const decay = Math.max(0, 1 - k / config.priorDecayRosterSize);
  return mapCategories(
    (c) =>
      clamp01((config.needStrongThreshold - d[c]) / config.needFullDeficit) * m[c] +
      (config.priorCategoryPreference[c] ?? 0) * decay,
  );
}

export function computeSurplus(d: CategoryRecord<number>, config: StrategyConfig): CategoryRecord<number> {
  const { start, full } = config.redundancySurplusRange;
  return mapCategories((c) => clamp01(safeDiv(d[c] - start, full - start, 0)));
}

export function fitPhaseWeight(k: number, config: StrategyConfig): number {
  return byRosterSize(config.fitPhaseWeightByRosterSize, k);
}

export function rosterTotals(roster: readonly StaticPlayer[]): RosterTotals {
  const t = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, threes: 0, to: 0 };
  let fgm = 0;
  let fga = 0;
  let ftm = 0;
  let fta = 0;
  for (const p of roster) {
    const l = p.player.proj!;
    t.pts += l.pts;
    t.reb += l.reb;
    t.ast += l.ast;
    t.stl += l.stl;
    t.blk += l.blk;
    t.threes += l.threes;
    t.to += l.to;
    fgm += l.fgm;
    fga += l.fga;
    ftm += l.ftm;
    fta += l.fta;
  }
  // Percentages are ALWAYS makes/attempts over the roster, never an average of player percentages.
  return { perGame: t, fgm, fga, ftm, fta, fgPct: teamPct(fgm, fga), ftPct: teamPct(ftm, fta) };
}

export function clampCategory(x: number): number {
  return clamp(x, -10, 10);
}

export const ALL_CATEGORIES: readonly Category[] = CATEGORIES;
