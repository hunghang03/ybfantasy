import type { StrategyConfig } from '../config/strategyConfig';
import { clamp, mean, safeDiv, safeSd } from '../numeric/safe';

/**
 * Playoff-schedule tiebreaker (DESIGN §6.10). Returns a fraction in [−playoffWeight, +playoffWeight]
 * which the DDP multiplies by U_i. Unknown team schedule → 0.
 */
export function playoffFractions(
  teamGames: ReadonlyMap<string, number>,
  config: StrategyConfig,
): { fractionFor: (games: number | null) => number; mean: number; sd: number } {
  const vals = [...teamGames.values()];
  const m = mean(vals);
  const sd = safeSd(vals, config.numeric.minSdSamples);
  const w = config.playoffWeight;
  return {
    mean: m,
    sd,
    fractionFor: (games) => {
      if (games === null || sd <= config.numeric.eps) return 0;
      return clamp(w * safeDiv(games - m, 2 * sd, 0), -w, w);
    },
  };
}
