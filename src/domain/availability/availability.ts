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
/** Start year of a "YYYY-YY" season, or null. */
export function seasonStartYear(season: string): number | null {
  const m = /^(\d{4})-\d{2}$/.exec(season.trim());
  return m ? Number(m[1]) : null;
}

/**
 * Injury-weighted missed share of one season (DESIGN §6.8 + availability-history rules):
 * measured against Games Available (games he could have played; defaults to team games), with suspension and
 * other non-injury games excluded. Itemised injury absences use their recurrence weight; missed games nobody
 * accounted for are UNCLASSIFIED (never assumed to be injuries of a known recurrence). Null → no information.
 */
export function seasonMissShare(s: AvailabilitySeason, config: StrategyConfig): number | null {
  const available = s.gamesAvailable ?? s.teamGames;
  if (!(available > 0)) return null;
  const nonInjury = (s.suspensionGames ?? 0) + (s.otherNonInjuryGames ?? 0);
  const itemised = s.absences.reduce((acc, a) => acc + a.games, 0);
  const unexplained = Math.max(0, available - s.gamesPlayed - nonInjury - itemised);
  const weighted =
    s.absences.reduce((acc, a) => acc + a.games * config.recurrenceWeights[a.recurrence], 0) +
    unexplained * config.recurrenceWeights.UNCLASSIFIED;
  return clamp01(safeDiv(weighted, available, 0));
}

export function computeAvailability(
  history: readonly AvailabilitySeason[],
  context: PlayerContext | null,
  marketStatus: InjuryStatus | null,
  config: StrategyConfig,
  /**
   * Most recent history season in the dataset (e.g. "2025-26"). Seasons are weighted by their offset from it, and
   * seasons with no row count as unknown (shrinkage toward unknownHistoryRisk), so one or two seasons of history
   * (sophomores, returners) are not treated as a full three-season record. Null → newest-first order (legacy).
   */
  anchorSeason: string | null = null,
): AvailabilityBlock {
  const weights = config.historySeasonWeights;
  const anchor = anchorSeason ? seasonStartYear(anchorSeason) : null;
  // slot i ← the season i years before the anchor (or the i-th newest row when there is no anchor)
  const slots: (AvailabilitySeason | null)[] = weights.map(() => null);
  if (anchor !== null) {
    for (const s of history) {
      const y = seasonStartYear(s.season);
      if (y === null) continue;
      const i = anchor - y;
      if (i >= 0 && i < weights.length) slots[i] = s;
    }
  } else {
    [...history]
      .sort((a, b) => (a.season < b.season ? 1 : -1))
      .slice(0, weights.length)
      .forEach((s, i) => (slots[i] = s));
  }
  const shares = slots.map((s) => (s ? seasonMissShare(s, config) : null));
  const seasons = slots.filter((s, i): s is AvailabilitySeason => !!s && shares[i] !== null);
  const historyKnown = seasons.length > 0;
  let H: number;
  if (!historyKnown) {
    H = config.unknownHistoryRisk;
  } else {
    // Missing seasons keep their weight at the unknown default (sophomore shrinkage).
    let num = 0;
    let den = 0;
    weights.forEach((w, i) => {
      num += w * (shares[i] ?? config.unknownHistoryRisk);
      den += w;
    });
    H = safeDiv(num, den, config.unknownHistoryRisk);
  }
  const highSeasons = seasons.filter((s) =>
    s.absences.some((a) => a.recurrence === 'HIGH' && a.games > 0),
  ).length;
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
  const risk = riskLevel(score, config);
  const coverage = safeDiv(
    weights.reduce((acc, w, i) => acc + (shares[i] !== null && slots[i] ? w : 0), 0),
    weights.reduce((acc, w) => acc + w, 0),
    0,
  );
  return {
    score,
    risk,
    // Presentation: without any season of history, a LOW score only reflects the unknown default, so it is shown
    // as UNKNOWN (no history). A worse level (from current status) is still shown. Numbers are unchanged.
    displayRisk: !historyKnown && risk === 'LOW' ? 'UNKNOWN' : risk,
    rhoHist,
    rhoNow,
    rhoFull,
    rhoEff,
    terms: {
      history: H,
      chronic,
      age: ageTerm,
      status: statusTerm,
      manual,
      seasonsUsed: seasons.length,
      historyKnown,
      historyCoverage: coverage,
    },
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
export function riskAdjustment(
  rhoEff: number,
  scaleU: number,
  round: number,
  config: StrategyConfig,
): number {
  const w = weightForRound(config.riskWeightsByRound, round);
  const v = -w * clamp01(rhoEff) * scaleU;
  return v === 0 ? 0 : v;
}

export interface AvailabilityProjectionGap {
  projectedGp: number;
  /** Mean GP rate over the recent seasons, scaled to a full season: GP × seasonGames / Games Available. */
  historicalGpRate: number;
  seasons: number;
  difference: number;
}

/**
 * AVAILABILITY_PROJECTION_GAP (QA/display only — never changes BPV, DDP or risk): the projection's GP differs
 * materially from the player's recent games-played rate. Needs ≥ minSeasons seasons in the weighted window.
 */
export function availabilityProjectionGap(
  history: readonly AvailabilitySeason[],
  projectedGp: number,
  config: StrategyConfig,
  anchorSeason: string | null,
): AvailabilityProjectionGap | null {
  const anchor = anchorSeason ? seasonStartYear(anchorSeason) : null;
  const inWindow = history.filter((s) => {
    const y = seasonStartYear(s.season);
    const avail = s.gamesAvailable ?? s.teamGames;
    return (
      y !== null &&
      avail > 0 &&
      (anchor === null || (anchor - y >= 0 && anchor - y < config.historySeasonWeights.length))
    );
  });
  if (inWindow.length < config.availabilityGapFlag.minSeasons) return null;
  const rate =
    inWindow.reduce(
      (acc, s) => acc + (s.gamesPlayed * config.seasonGames) / (s.gamesAvailable ?? s.teamGames),
      0,
    ) / inWindow.length;
  const difference = projectedGp - rate;
  if (Math.abs(difference) < config.availabilityGapFlag.gpDifference) return null;
  return { projectedGp, historicalGpRate: rate, seasons: inWindow.length, difference };
}
