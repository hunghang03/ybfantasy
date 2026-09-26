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
 * Durability-history anchor for a fantasy season: the immediately preceding NBA season.
 * "2026-27" → "2025-26" (so the window is 2025-26 · .5, 2024-25 · .3, 2023-24 · .2). Accepts "2026-27",
 * "2026/27", "2026-2027" or "2026". Anything else → null (history is then not used; never guessed from data).
 */
export function historyAnchorFor(fantasySeason: string): string | null {
  const m = /^(\d{4})(?:\s*[-/]\s*(\d{2}|\d{4}))?$/.exec(fantasySeason.trim());
  if (!m) return null;
  const start = Number(m[1]);
  if (m[2] !== undefined && Number(m[2]) % 100 !== (start + 1) % 100) return null;
  return `${start - 1}-${String(start % 100).padStart(2, '0')}`;
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
   * The NBA season immediately before the fantasy season (`historyAnchorFor(league.season)`, e.g. "2025-26" for
   * 2026-27). Slot i holds the season i years before it (weights .5/.3/.2); a slot with no row keeps its weight at
   * unknownHistoryRisk (shrinkage), so a newest row of 2024-25 stays in the .3 slot. Never derived from the rows
   * present. Null (fantasy season not recognised) → history is not used.
   */
  anchorSeason: string | null,
): AvailabilityBlock {
  const weights = config.historySeasonWeights;
  const anchor = anchorSeason ? seasonStartYear(anchorSeason) : null;
  const slots: (AvailabilitySeason | null)[] = weights.map(() => null);
  if (anchor !== null) {
    for (const s of history) {
      const y = seasonStartYear(s.season);
      if (y === null) continue;
      const i = anchor - y;
      if (i >= 0 && i < weights.length) slots[i] = s;
    }
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

/**
 * Risk band plus history coverage, as displayed (presentation only). The calculated band is always kept; history
 * coverage is shown independently: "NO HIST" when the band is LOW only because of the unknown default,
 * "MODERATE · NO HIST" when current status drives a worse band but no history season exists.
 */
export function riskDisplayText(
  a: Pick<AvailabilityBlock, 'risk' | 'displayRisk' | 'terms'>,
  text: (r: RiskLevel | 'UNKNOWN') => string = (r) => (r === 'UNKNOWN' ? 'NO HIST' : r),
): string {
  if (a.displayRisk === 'UNKNOWN') return text('UNKNOWN');
  return a.terms.historyKnown ? text(a.risk) : `${text(a.risk)} · ${text('UNKNOWN')}`;
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
  /**
   * UNWEIGHTED arithmetic mean of the qualifying seasons' GP rates (GP × seasonGames / Games Available) inside
   * the 3-season window. Unlike the durability calculation, the .5/.3/.2 weights are not applied.
   */
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
      anchor !== null &&
      anchor - y >= 0 &&
      anchor - y < config.historySeasonWeights.length
    );
  });
  if (anchor === null) return null;
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
