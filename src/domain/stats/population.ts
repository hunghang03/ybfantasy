import type { StrategyConfig } from '../config/strategyConfig';
import { cmpId } from '../numeric/safe';
import type { EnginePlayer } from '../types/evaluation';
import { computePopulationStats, computeRawZ, weightedSum, type PopulationStats } from './zscores';

/**
 * Fantasy population (DESIGN §5.3).
 *   P = teams · rosterSize + buffer
 *   Eligible = players with a primary projection and GP ≥ populationMinGP
 *   iteration 0: stats over all Eligible; then repeat:
 *     rank Eligible by neutral 9-cat (Σ raw z, TO weight = neutralTurnoverWeight),
 *     take top min(P, |Eligible|), recompute stats; stop at a membership fixed point.
 */
export interface PopulationResult {
  size: number;
  targetSize: number;
  memberIds: string[];
  stats: PopulationStats;
  iterations: number;
  converged: boolean;
  eligibleCount: number;
}

export function buildPopulation(
  players: readonly EnginePlayer[],
  targetSize: number,
  config: StrategyConfig,
): PopulationResult {
  const eligible = players.filter((p) => p.proj !== null && p.proj.gp >= config.populationMinGP);
  const eps = config.numeric.eps;
  let members = eligible;
  let stats = computePopulationStats(
    members.map((p) => p.proj!),
    config,
  );
  let converged = eligible.length <= targetSize;
  let iterations = 0;
  if (!converged) {
    let prevKey = '';
    for (iterations = 1; iterations <= config.populationMaxIterations; iterations++) {
      const ranked = eligible
        .map((p) => ({ p, v: weightedSum(computeRawZ(p.proj!, stats, eps).rawZ, config.neutralTurnoverWeight) }))
        .sort((a, b) => b.v - a.v || cmpId(a.p.id, b.p.id));
      members = ranked.slice(0, targetSize).map((r) => r.p);
      const key = members
        .map((m) => m.id)
        .sort()
        .join(',');
      stats = computePopulationStats(
        members.map((p) => p.proj!),
        config,
      );
      if (key === prevKey) {
        converged = true;
        break;
      }
      prevKey = key;
    }
    iterations = Math.min(iterations, config.populationMaxIterations);
  }
  return {
    size: members.length,
    targetSize,
    memberIds: members.map((m) => m.id).sort(),
    stats,
    iterations,
    converged,
    eligibleCount: eligible.length,
  };
}
