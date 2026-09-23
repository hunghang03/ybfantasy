import type { StrategyConfig } from '../config/strategyConfig';
import { weightForRound } from '../config/defaults';
import { clamp, clamp01, safeDiv } from '../numeric/safe';
import type { AvailabilitySeason, PlayerContext } from '../types/data';
import type { AvailabilityBlock, RiskLevel } from '../types/evaluation';
import type { InjuryStatus } from '../types/core';

/**
 * Availability / durability (DESIGN §6.8, rev 3).
 *   ρ_hist = H + Chronic + Age          (historical / structural)
 *   ρ_now  = statusRisk + manualRiskDelta
 *   ρ      = clamp(ρ_hist + ρ_now)      → Availability Score (display)
 *   ρ_eff  = clamp(durabilityResidualWeight · ρ_hist + ρ_now)  → used by RiskAdj (§6.9)
 * Projected GP is deliberately NOT part of ρ; it is priced in ESV.
 */
export function computeAvailability(
  history: readonly AvailabilitySeason[],
  context: PlayerContext | null,
  marketStatus: InjuryStatus | null,
  config: StrategyConfig,
): AvailabilityBlock {
  const weights = config.historySeasonWeights;
  const seasons = [...history].sort((a, b) => (a.season < b.season ? 1 : -1)).slice(0, weights.length);
  let H: number;
  let historyKnown = false;
  if (seasons.length === 0) {
    H = config.unknownHistoryRisk;
  } else {
    historyKnown = true;
    let num = 0;
    let den = 0;
    seasons.forEach((s, i) => {
      const w = weights[i] ?? 0;
      let wMiss: number;
      if (s.absences.length > 0) {
        const weighted = s.absences.reduce((acc, a) => acc + a.games * config.recurrenceWeights[a.recurrence], 0);
        wMiss = safeDiv(weighted, s.teamGames, 0);
      } else {
        wMiss = clamp01(1 - safeDiv(s.gamesPlayed, s.teamGames, 1)) * config.recurrenceWeights.UNCLASSIFIED;
      }
      num += w * wMiss;
      den += w;
    });
    H = safeDiv(num, den, config.unknownHistoryRisk);
  }
  const highSeasons = seasons.filter((s) => s.absences.some((a) => a.recurrence === 'HIGH' && a.games > 0)).length;
  const chronic = highSeasons >= 2 ? config.chronicPatternPenalty : 0;
  const age = context?.age ?? null;
  const ageTerm = age === null ? 0 : Math.max(0, age - config.ageRiskStart) * config.ageRiskPerYear;
  // Context status (manual/imported) wins over the Yahoo market marker.
  const status: InjuryStatus = context?.currentStatus ?? marketStatus ?? 'HEALTHY';
  const statusTerm = config.statusRisk[status];
  const manual = clamp(context?.manualRiskDelta ?? 0, -0.3, 0.3);

  const rhoHist = Math.max(0, H + chronic + ageTerm);
  const rhoNow = statusTerm + manual;
  const rhoFull = clamp01(rhoHist + rhoNow);
  const rhoEff = clamp01(config.durabilityResidualWeight * rhoHist + rhoNow);
  const score = Math.round(100 * (1 - rhoFull));
  return {
    score,
    risk: riskLevel(score, config),
    rhoHist,
    rhoNow,
    rhoFull,
    rhoEff,
    terms: { history: H, chronic, age: ageTerm, status: statusTerm, manual, seasonsUsed: seasons.length, historyKnown },
    status,
  };
}

export function riskLevel(score: number, config: StrategyConfig): RiskLevel {
  if (score >= config.riskBands.low) return 'LOW';
  if (score >= config.riskBands.moderate) return 'MODERATE';
  if (score >= config.riskBands.high) return 'HIGH';
  return 'VERY_HIGH';
}

/** RiskAdj_i = − riskWeight(round) · ρ_eff · U_i  (never positive). */
export function riskAdjustment(rhoEff: number, scaleU: number, round: number, config: StrategyConfig): number {
  const w = weightForRound(config.riskWeightsByRound, round);
  const v = -w * clamp01(rhoEff) * scaleU;
  return v === 0 ? 0 : v;
}
