import type { StrategyConfig } from '../config/strategyConfig';
import { clamp01, mean, safeDiv } from '../numeric/safe';
import { COUNTING_POSITIVE, mapCategories, type CategoryRecord } from '../types/core';
import type { ProjectionLine } from '../types/data';
import type { ValueBlock } from '../types/evaluation';
import { COUNTING_FIELD, type PopulationStats } from '../stats/zscores';

/**
 * Value above replacement and availability (DESIGN §5.4–5.5, R2-2).
 *   PG   = Σ b_c ẑ_c                      (b_TO = initialTurnoverWeight)
 *   PGV  = PG − R                         (R = mean PG of replacement band)
 *   L    = Σ_{THREES,PTS,REB,AST,STL,BLK} μ^repl_c / σ_c      (TO and FG/FT deliberately excluded)
 *   LossPerMissedGame = max(PGV, 0) + (1 − r)·L   ≥ 0
 *   ESV  = PGV − (1 − a)·LossPerMissedGame               → ∂ESV/∂a ≥ 0 always
 *   BPV  = PGV + (1 − blend)·(ESV − PGV)
 *   U    = max(BPV, 1)
 */

export function baseWeights(config: StrategyConfig): CategoryRecord<number> {
  return mapCategories((c) => (c === 'TO' ? config.initialTurnoverWeight : 1));
}

export function perGameRaw(cappedZ: CategoryRecord<number>, b: CategoryRecord<number>): number {
  let s = 0;
  for (const c of Object.keys(b) as (keyof typeof b)[]) s += b[c] * cappedZ[c];
  return s;
}

export interface ReplacementLevel {
  /** R: mean PG of the replacement band. */
  perGame: number;
  /** zRepl_c: mean capped z per category of the replacement band. */
  zRepl: CategoryRecord<number>;
  /** L: counting-category production of a replacement player, in SD units. */
  missedGameLoss: number;
  bandIds: string[];
  usedFallback: boolean;
}

export function computeReplacement(
  ranked: readonly { id: string; pg: number; cappedZ: CategoryRecord<number>; proj: ProjectionLine }[],
  populationSize: number,
  stats: PopulationStats,
  config: StrategyConfig,
): ReplacementLevel {
  const band = config.replacementBandSize;
  let slice = ranked.slice(populationSize, populationSize + band);
  let usedFallback = false;
  let perGame: number;
  if (slice.length === 0) {
    // Guard: pool not larger than the population → conservative fallback (bottom of the population).
    usedFallback = true;
    slice = ranked.slice(Math.max(0, Math.min(populationSize, ranked.length) - band), Math.min(populationSize, ranked.length));
    perGame = slice.length ? Math.min(...slice.map((s) => s.pg)) : 0;
  } else {
    perGame = mean(slice.map((s) => s.pg));
  }
  const zRepl = mapCategories((c) => mean(slice.map((s) => s.cappedZ[c])));
  let L = 0;
  for (const c of COUNTING_POSITIVE) {
    const mu = mean(slice.map((s) => s.proj[COUNTING_FIELD[c]]));
    L += safeDiv(mu, stats.sd[c], 0, config.numeric.eps);
  }
  return { perGame, zRepl, missedGameLoss: Math.max(0, L), bandIds: slice.map((s) => s.id), usedFallback };
}

export function computeValue(
  pg: number,
  gp: number,
  replacement: ReplacementLevel,
  config: StrategyConfig,
): ValueBlock {
  const pgv = pg - replacement.perGame;
  const a = clamp01(safeDiv(gp, config.seasonGames, 0));
  const loss = Math.max(pgv, 0) + (1 - config.replacementCoefficient) * replacement.missedGameLoss;
  const esv = pgv - (1 - a) * loss;
  const bpv = pgv + (1 - config.perGameBlend) * (esv - pgv);
  return {
    perGameRaw: pg,
    perGameVAR: pgv,
    availabilityFraction: a,
    missedGameLoss: loss,
    expectedSeasonVAR: esv,
    basePlayerValue: bpv,
    scaleU: Math.max(bpv, 1),
  };
}
