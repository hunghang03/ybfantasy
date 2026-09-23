import type { StrategyConfig } from '../config/strategyConfig';
import { safeDiv } from '../numeric/safe';
import { mapCategories } from '../types/core';
import type { DataConfidence, DisagreementReport, EnginePlayer } from '../types/evaluation';
import { computeRawZ, weightedSum, type PopulationStats } from '../stats/zscores';

/**
 * Projection disagreement (DESIGN §10): each validation source is scored with the PRIMARY
 * population's μ/σ/p so values are comparable. Sources are never averaged.
 */
export function computeDisagreement(
  player: EnginePlayer,
  stats: PopulationStats,
  neutralSd: number,
  config: StrategyConfig,
): DisagreementReport[] {
  if (!player.proj) return [];
  const eps = config.numeric.eps;
  const primary = computeRawZ(player.proj, stats, eps).rawZ;
  const primaryN9 = weightedSum(primary, config.neutralTurnoverWeight);
  return player.validation.map((v) => {
    const z = computeRawZ(v, stats, eps).rawZ;
    const n9 = weightedSum(z, config.neutralTurnoverWeight);
    const delta = safeDiv(Math.abs(primaryN9 - n9), neutralSd, 0, eps);
    const gpDelta = Math.abs(player.proj!.gp - v.gp);
    return {
      provider: v.provider,
      delta,
      gpDelta,
      flagged: delta > config.disagreementThreshold || gpDelta > config.disagreementGpThreshold,
      perCategory: mapCategories((c) => z[c] - primary[c]),
    };
  });
}

/**
 * HIGH   = primary projection + market + availability history, no flagged disagreement
 * MEDIUM = primary projection + market, missing history
 * LOW    = missing projection/market or unresolved disagreement
 */
export function dataConfidence(player: EnginePlayer, disagreement: DisagreementReport[]): {
  confidence: DataConfidence;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!player.proj) warnings.push('No primary projection — not ranked.');
  if (!player.market) warnings.push('No Yahoo market data.');
  else if (player.market.yahooAdp7d === null) warnings.push('No Yahoo L7 ADP.');
  if (player.history.length === 0) warnings.push('No availability history (default risk applied).');
  if (player.positions.length === 0) warnings.push('No position eligibility.');
  if (player.positionsSource === 'PROVIDER') warnings.push('Positions from projection provider, not Yahoo.');
  const flagged = disagreement.filter((d) => d.flagged);
  if (flagged.length) warnings.push(`Projection disagreement vs ${flagged.map((d) => d.provider).join(', ')}.`);
  let confidence: DataConfidence;
  if (!player.proj || !player.market || flagged.length) confidence = 'LOW';
  else if (player.history.length === 0) confidence = 'MEDIUM';
  else confidence = 'HIGH';
  return { confidence, warnings };
}
