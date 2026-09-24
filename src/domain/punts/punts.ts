import type { StrategyConfig } from '../config/strategyConfig';
import { byRosterSize } from '../config/defaults';
import { clamp01, interpolate, safeDiv } from '../numeric/safe';
import { CATEGORIES, mapCategories, type Category, type CategoryRecord } from '../types/core';
import type { EngineWarning, PuntEntry, StaticPlayer } from '../types/evaluation';
import type { PuntOverride } from '../types/league';
import type { Standing } from '../roster/profile';

/**
 * Punt confidence with recoverability (DESIGN §6.2, R2-3).
 *   D_c   deficit             = clamp((start − d_c)/(start − full), 0, 1)
 *   Coh_c build coherence     = Σ max(0,−ρ_cc')·clamp(d_c'/elite,0,1) / Σ max(0,−ρ_cc')
 *   Rec_c recoverability      = clamp(Gain_c / Required_c, 0, 1)   (1 when Required ≈ 0)
 *   score = D·(floor + (1−floor)·Irr)·(cohBase + (1−cohBase)·Coh) + affinity·[D > 0]
 *   π_auto = min(cap_k, S_k · clamp(score)); hard only if every gate passes, else ≤ hardGateCeiling
 *   multi-punt damping by rank; user override applied last.
 * π never feeds back into its own inputs (D, Coh and Rec ignore m_c).
 */

export interface PuntInputs {
  standing: Standing;
  k: number;
  totalRounds: number;
  /** cohortMean[j], j = 1..rounds */
  cohortMean: readonly CategoryRecord<number>[];
  teamSdBase: CategoryRecord<number>;
  correlations: CategoryRecord<CategoryRecord<number>>;
  /** AVAILABLE players sorted by BPV desc (ADP-free). */
  availableByBpv: readonly StaticPlayer[];
  teams: number;
  overrides: Partial<Record<Category, PuntOverride>>;
}

export interface PuntResult {
  entries: CategoryRecord<PuntEntry>;
  /** m_c: weight multiplier from the punt curve. */
  m: CategoryRecord<number>;
  warnings: EngineWarning[];
  hardCount: number;
  softOrHigherCount: number;
}

export function recoverability(
  c: Category,
  inputs: PuntInputs,
  config: StrategyConfig,
): { required: number; gain: number; rec: number } {
  const { standing, k, totalRounds, cohortMean, teamSdBase, availableByBpv, teams } = inputs;
  const eps = config.numeric.eps;
  const sigmaFinal = Math.sqrt(totalRounds) * teamSdBase[c];
  const required = Math.max(
    0,
    standing.B[c] + config.recoverability.competitiveTarget * sigmaFinal - standing.s[c],
  );
  if (required <= eps) return { required, gain: 0, rec: 1 };
  const candCount = Math.max(1, Math.round(config.recoverability.candidateRounds * teams));
  const cand = availableByBpv.slice(0, candCount);
  const m = Math.max(0, Math.min(totalRounds - k, config.recoverability.recoveryPicks));
  const best = cand
    .map((p) => p.stats.cappedZ[c])
    .sort((a, b) => b - a)
    .slice(0, m);
  let gain = 0;
  best.forEach((z, i) => {
    const cohort = cohortMean[rescueCohortIndex(k, i + 1, cohortMean.length)]!;
    gain += Math.max(0, z - cohort[c]);
  });
  return { required, gain, rec: clamp01(safeDiv(gain, required, 0, eps)) };
}

/**
 * Cohort compared with rescue pick number `pickNumber` (1-based) for a roster of size k.
 * `cohortMean` is 1-indexed by draft round (index 0 is a zero pad; cohortMean[j] = round j), so
 * rescue pick 1 is the roster's (k+1)-th player and is compared with cohort k+1, pick 2 with k+2, …
 * Because at most K − k rescue picks are taken, the clamp to the last round never binds in practice.
 */
export function rescueCohortIndex(k: number, pickNumber: number, cohortLength: number): number {
  return Math.min(k + pickNumber, cohortLength - 1);
}

export function coherence(
  c: Category,
  d: CategoryRecord<number>,
  correlations: CategoryRecord<CategoryRecord<number>>,
  config: StrategyConfig,
): number {
  let num = 0;
  let den = 0;
  for (const c2 of CATEGORIES) {
    if (c2 === c) continue;
    const w = Math.max(0, -correlations[c][c2]);
    num += w * clamp01(safeDiv(d[c2], config.categoryStateThresholds.elite, 0));
    den += w;
  }
  return clamp01(safeDiv(num, den, 0, config.numeric.eps));
}

export function puntMultiplier(pi: number, config: StrategyConfig): number {
  return clamp01(interpolate(config.puntWeightCurve, pi));
}

function levelOf(pi: number, config: StrategyConfig): PuntEntry['level'] {
  const t = config.puntThresholds;
  if (pi >= t.hard) return 'HARD';
  if (pi >= t.soft) return 'SOFT';
  if (pi >= t.tendency) return 'TENDENCY';
  return 'NONE';
}

export function computePunts(inputs: PuntInputs, config: StrategyConfig): PuntResult {
  const { standing, k } = inputs;
  const { start, full } = config.puntDeficitRange;
  const S = Math.min(1, k / config.puntRampPicks);
  const cap = byRosterSize(config.puntCapByRosterSize, k);
  const g = config.hardPuntGate;
  const partial = mapCategories((c) => {
    const D = clamp01(safeDiv(start - standing.d[c], start - full, 0));
    const Coh = coherence(c, standing.d, inputs.correlations, config);
    const r = recoverability(c, inputs, config);
    const Irr = 1 - r.rec;
    const floor = config.puntScore.recoverabilityFloor;
    const cb = config.puntScore.coherenceBase;
    const affinity = D > 0 ? (config.puntPriorAffinity[c] ?? 0) : 0;
    const score = D * (floor + (1 - floor) * Irr) * (cb + (1 - cb) * Coh) + affinity;
    const ungated = Math.min(cap, S * clamp01(score));
    const gatePassed =
      D >= g.minDeficit && Coh >= g.minCoherence && r.rec <= g.maxRecoverability && k >= g.minRosterSize;
    const piAuto = gatePassed ? ungated : Math.min(ungated, config.hardGateCeiling);
    return { D, Coh, rec: r.rec, required: r.required, gain: r.gain, score, ungated, gatePassed, piAuto };
  });
  // Multi-punt resistance: rank by π_auto desc (tiebreak category order), damp 2nd/3rd…
  const order = [...CATEGORIES].sort(
    (a, b) => partial[b].piAuto - partial[a].piAuto || CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b),
  );
  const damping = mapCategories(() => 1);
  order.forEach((c, i) => {
    damping[c] = config.multiPuntDamping[Math.min(i, config.multiPuntDamping.length - 1)]!;
  });
  const entries = mapCategories((c): PuntEntry => {
    const p = partial[c];
    const override = inputs.overrides[c] ?? 'AUTO';
    let pi = p.piAuto * damping[c];
    if (override === 'NONE') pi = 0;
    else if (override === 'SOFT') pi = Math.max(pi, config.puntOverrideSoftPi);
    else if (override === 'HARD') pi = 1;
    return {
      deficit: p.D,
      coherence: p.Coh,
      recoverability: p.rec,
      required: p.required,
      gain: p.gain,
      score: p.score,
      piAuto: p.piAuto,
      piAutoUngated: p.ungated,
      hardGatePassed: p.gatePassed,
      damping: damping[c],
      pi,
      override,
      level: levelOf(pi, config),
    };
  });
  const m = mapCategories((c) => puntMultiplier(entries[c].pi, config));

  // Warnings use pre-damping confidence (auto, or the user's override when set).
  const preDamp = mapCategories((c) => {
    const o = entries[c].override;
    if (o === 'NONE') return 0;
    if (o === 'HARD') return 1;
    if (o === 'SOFT') return Math.max(entries[c].piAuto, config.puntOverrideSoftPi);
    return entries[c].piAuto;
  });
  const hardCount = CATEGORIES.filter((c) => preDamp[c] >= config.puntThresholds.hard).length;
  const softOrHigherCount = CATEGORIES.filter((c) => preDamp[c] >= config.puntThresholds.soft).length;
  const warnings: EngineWarning[] = [];
  if (softOrHigherCount >= config.hardPuntLimitWarnings.multiPuntRisk)
    warnings.push({
      code: 'MULTI_PUNT_BUILD_RISK',
      message: `MULTI-PUNT BUILD RISK: ${softOrHigherCount} categories are being punted. Winning 5 of the remaining ${9 - softOrHigherCount} categories is a fragile build.`,
      severity: 'critical',
    });
  else if (hardCount >= config.hardPuntLimitWarnings.hardPuntsWarn)
    warnings.push({
      code: 'TWO_HARD_PUNTS',
      message: `${hardCount} categories are hard punts. Protect the rest.`,
      severity: 'warn',
    });
  return { entries, m, warnings, hardCount, softOrHigherCount };
}
