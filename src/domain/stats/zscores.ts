import type { StrategyConfig } from '../config/strategyConfig';
import { clamp, mean, safeDiv, safeSd, zOrZero } from '../numeric/safe';
import { CATEGORIES, mapCategories, type Category, type CategoryRecord } from '../types/core';
import type { ProjectionLine } from '../types/data';

/**
 * Per-game z-scores (DESIGN §5.1–5.2).
 * - Counting categories: (x − μ)/σ over the fantasy population.
 * - TO: inverted, lower is better.
 * - FG% / FT%: volume-sensitive impact = makes − p·attempts, where p = ΣM/ΣA over the population
 *   (never a mean of percentages), then standardized.
 */

export const COUNTING_FIELD = {
  THREES: 'threes',
  PTS: 'pts',
  REB: 'reb',
  AST: 'ast',
  STL: 'stl',
  BLK: 'blk',
  TO: 'to',
} as const satisfies Partial<Record<Category, keyof ProjectionLine>>;

type CountingCat = keyof typeof COUNTING_FIELD;
const COUNTING_CATS = Object.keys(COUNTING_FIELD) as CountingCat[];

export interface PopulationStats {
  n: number;
  mu: Record<CountingCat, number>;
  sd: Record<CountingCat, number>;
  pFG: number;
  pFT: number;
  fgImpactMean: number;
  fgImpactSd: number;
  ftImpactMean: number;
  ftImpactSd: number;
  degenerate: Category[];
}

export function computePopulationStats(
  lines: readonly ProjectionLine[],
  config: StrategyConfig,
): PopulationStats {
  const eps = config.numeric.eps;
  const min = config.numeric.minSdSamples;
  const mu = {} as Record<CountingCat, number>;
  const sd = {} as Record<CountingCat, number>;
  const degenerate: Category[] = [];
  for (const c of COUNTING_CATS) {
    const vals = lines.map((l) => l[COUNTING_FIELD[c]]);
    mu[c] = mean(vals);
    sd[c] = safeSd(vals, min);
    if (sd[c] <= eps) degenerate.push(c);
  }
  let fgm = 0;
  let fga = 0;
  let ftm = 0;
  let fta = 0;
  for (const l of lines) {
    fgm += l.fgm;
    fga += l.fga;
    ftm += l.ftm;
    fta += l.fta;
  }
  const pFG = safeDiv(fgm, fga, 0, eps);
  const pFT = safeDiv(ftm, fta, 0, eps);
  const fgImp = lines.map((l) => l.fgm - pFG * l.fga);
  const ftImp = lines.map((l) => l.ftm - pFT * l.fta);
  const fgImpactSd = safeSd(fgImp, min);
  const ftImpactSd = safeSd(ftImp, min);
  if (fgImpactSd <= eps) degenerate.push('FG_PCT');
  if (ftImpactSd <= eps) degenerate.push('FT_PCT');
  return {
    n: lines.length,
    mu,
    sd,
    pFG,
    pFT,
    fgImpactMean: mean(fgImp),
    fgImpactSd,
    ftImpactMean: mean(ftImp),
    ftImpactSd,
    degenerate,
  };
}

export interface RawZResult {
  rawZ: CategoryRecord<number>;
  fgImpact: number;
  ftImpact: number;
}

export function computeRawZ(line: ProjectionLine, s: PopulationStats, eps: number): RawZResult {
  const fgImpact = line.fgm - s.pFG * line.fga;
  const ftImpact = line.ftm - s.pFT * line.fta;
  const rawZ = mapCategories((c) => {
    switch (c) {
      case 'FG_PCT':
        return zOrZero(fgImpact, s.fgImpactMean, s.fgImpactSd, eps);
      case 'FT_PCT':
        return zOrZero(ftImpact, s.ftImpactMean, s.ftImpactSd, eps);
      case 'TO':
        return -zOrZero(line.to, s.mu.TO, s.sd.TO, eps);
      default:
        return zOrZero(line[COUNTING_FIELD[c]], s.mu[c], s.sd[c], eps);
    }
  });
  // -0 → 0 for stable equality / display
  for (const c of CATEGORIES) if (Object.is(rawZ[c], -0)) rawZ[c] = 0;
  return { rawZ, fgImpact, ftImpact };
}

export function capZ(rawZ: CategoryRecord<number>, cap: number): CategoryRecord<number> {
  return mapCategories((c) => clamp(rawZ[c], -cap, cap));
}

/** Σ w_c · z_c with TO weight parameter; all other weights 1. */
export function weightedSum(z: CategoryRecord<number>, toWeight: number): number {
  let s = 0;
  for (const c of CATEGORIES) s += (c === 'TO' ? toWeight : 1) * z[c];
  return s;
}

/**
 * Team percentage from makes/attempts (never an average of player percentages).
 * Returns null when there are no attempts.
 */
export function teamPct(makes: number, attempts: number): number | null {
  return attempts > 0 ? makes / attempts : null;
}
