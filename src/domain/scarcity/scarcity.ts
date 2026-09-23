import type { StrategyConfig } from '../config/strategyConfig';
import { clamp, mean, safeDiv } from '../numeric/safe';
import { CATEGORIES, mapCategories, type CategoryRecord } from '../types/core';
import type { StaticPlayer } from '../types/evaluation';

/**
 * Scarcity (DESIGN §6.6, R2-4).
 *   Supply_c(X) = Σ_{i∈X} max(ẑ_ic − zRepl_c, 0)
 * POOL scarcity: ADP-free, BPV-ordered windows. Part of DDP.
 * NEXT-PICK scarcity: Yahoo-market-ordered windows. Market layer only.
 */

export function supply(
  players: readonly StaticPlayer[],
  zRepl: CategoryRecord<number>,
): CategoryRecord<number> {
  const out = mapCategories(() => 0);
  for (const p of players) for (const c of CATEGORIES) out[c] += Math.max(p.stats.cappedZ[c] - zRepl[c], 0);
  return out;
}

/**
 * Relative depletion: r_c = now/baseline (1 when baseline ≈ 0); q_c = clamp(1 − r_c/mean(r), 0, 1)
 * (0 when mean(r) ≈ 0). A category is scarce only if it depletes faster than the others.
 */
export function relativeScarcity(
  now: CategoryRecord<number>,
  baseline: CategoryRecord<number>,
  eps: number,
): { q: CategoryRecord<number>; r: CategoryRecord<number> } {
  const r = mapCategories((c) => (baseline[c] <= eps ? 1 : safeDiv(now[c], baseline[c], 1, eps)));
  const m = mean(CATEGORIES.map((c) => r[c]));
  const q = mapCategories((c) => (m <= eps ? 0 : clamp(1 - safeDiv(r[c], m, 1, eps), 0, 1)));
  return { q, r };
}

/** Pool scarcity: top Wp AVAILABLE players by BPV vs the static draft-start baseline. */
export function poolScarcity(
  availableByBpv: readonly StaticPlayer[],
  window: number,
  baseline: CategoryRecord<number>,
  zRepl: CategoryRecord<number>,
  eps: number,
) {
  return relativeScarcity(supply(availableByBpv.slice(0, window), zRepl), baseline, eps);
}

/** Next-pick scarcity: MarketOrder[g : g+Wn] vs MarketOrder[0 : Wn]. */
export function nextPickScarcity(
  marketOrder: readonly StaticPlayer[],
  gap: number,
  window: number,
  zRepl: CategoryRecord<number>,
  eps: number,
) {
  const now = supply(marketOrder.slice(0, window), zRepl);
  const reach = supply(marketOrder.slice(gap, gap + window), zRepl);
  return relativeScarcity(reach, now, eps);
}

/** Σ_c q_c · m_c · (base + needW·need_c) · max(ẑ_ic − zRepl_c, 0), times weight. */
export function scarcityAdjustment(
  cappedZ: CategoryRecord<number>,
  q: CategoryRecord<number>,
  m: CategoryRecord<number>,
  need: CategoryRecord<number>,
  zRepl: CategoryRecord<number>,
  weight: number,
  blend: { base: number; need: number },
): { total: number; perCategory: CategoryRecord<number> } {
  const perCategory = mapCategories(
    (c) => weight * q[c] * m[c] * (blend.base + blend.need * need[c]) * Math.max(cappedZ[c] - zRepl[c], 0),
  );
  let total = 0;
  for (const c of CATEGORIES) total += perCategory[c];
  return { total, perCategory };
}

export function gapFactor(gap: number, teams: number, config: StrategyConfig): number {
  return clamp(
    safeDiv(gap, teams, 0),
    config.nextPickScarcity.gapFactor.min,
    config.nextPickScarcity.gapFactor.max,
  );
}
