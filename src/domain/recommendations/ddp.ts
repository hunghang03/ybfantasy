import type { StrategyConfig } from '../config/strategyConfig';
import { riskAdjustment } from '../availability/availability';
import { positionFraction, positionReport } from '../positions/positions';
import { computePunts, type PuntResult } from '../punts/punts';
import { computeNeed, computeStanding, computeSurplus, fitPhaseWeight, type Standing } from '../roster/profile';
import { poolScarcity } from '../scarcity/scarcity';
import { CATEGORIES, mapCategories, type Category, type CategoryRecord, type Position } from '../types/core';
import type { AdjustmentBlock, EngineWarning, FitBlock, PositionReport, StaticPlayer } from '../types/evaluation';
import type { PlayerFlags, PuntOverride } from '../types/league';
import { upsideAdjustment } from '../upside/upside';
import type { StaticContext } from './staticContext';

/**
 * Roster context + DDP (DESIGN §6, §7). Everything here is ADP-free: no market field is read.
 *
 *   TeamFit = NeedAdj + PuntAdj + PoolScarAdj + PosAdj + MultiPosAdj + RedAdj
 *   DDP_raw = BPV + TeamFit + PlayoffAdj + UpsideAdj + RiskAdj + UserPrefAdj
 */

export interface RosterContext {
  k: number;
  rosterIds: string[];
  roster: StaticPlayer[];
  standing: Standing;
  punts: PuntResult;
  m: CategoryRecord<number>;
  need: CategoryRecord<number>;
  surplus: CategoryRecord<number>;
  gate: number;
  phi: number;
  qP: CategoryRecord<number>;
  positions: PositionReport;
  round: number;
  warnings: EngineWarning[];
}

export function buildRosterContext(
  sc: StaticContext,
  rosterIds: readonly string[],
  rosterPositions: readonly (readonly Position[])[],
  availableByBpv: readonly StaticPlayer[],
  round: number,
  overrides: Partial<Record<Category, PuntOverride>>,
): RosterContext {
  const config = sc.config;
  const eps = config.numeric.eps;
  const roster = rosterIds.map((id) => sc.byId.get(id)).filter((x): x is StaticPlayer => x !== undefined);
  const warnings: EngineWarning[] = [];
  if (roster.length < rosterIds.length)
    warnings.push({ code: 'ROSTER_UNPROJECTED', message: 'A rostered player has no primary projection; his categories are not counted.', severity: 'warn' });
  const k = rosterIds.length;
  const standing = computeStanding(roster, sc.cumulativeExpected, sc.teamSdBase, eps);
  const punts = computePunts(
    {
      standing,
      k,
      totalRounds: sc.rounds,
      cohortMean: sc.cohortMean,
      teamSdBase: sc.teamSdBase,
      correlations: sc.correlations,
      availableByBpv,
      teams: sc.teams,
      overrides,
    },
    config,
  );
  const need = computeNeed(standing.d, punts.m, k, config);
  const surplus = computeSurplus(standing.d, config);
  const gate = Math.min(1, CATEGORIES.reduce((a, c) => a + need[c], 0));
  const phi = fitPhaseWeight(k, config);
  const { q: qP } = poolScarcity(availableByBpv, sc.poolWindow, sc.poolStartSupply, sc.replacement.zRepl, eps);
  const positions = positionReport(rosterPositions, sc.league.roster, sc.rounds);
  if (!positions.feasible)
    warnings.push({ code: 'ROSTER_INFEASIBLE', message: 'Your remaining picks can no longer legally fill every active slot.', severity: 'critical' });
  return { k, rosterIds: [...rosterIds], roster, standing, punts, m: punts.m, need, surplus, gate, phi, qP, positions, round, warnings: [...warnings, ...punts.warnings] };
}

export interface ScoredDdp {
  fit: FitBlock;
  adjustments: AdjustmentBlock;
  ddpRaw: number;
  positionUrgency: number;
}

export function scorePlayer(
  sp: StaticPlayer,
  rc: RosterContext,
  sc: StaticContext,
  flags: PlayerFlags | undefined,
): ScoredDdp {
  const config: StrategyConfig = sc.config;
  const z = sp.stats.cappedZ;
  const b = sc.baseWeights;
  const U = sp.value.scaleU;
  const zRepl = sc.replacement.zRepl;
  const perCategory = mapCategories((c) => {
    const need = config.categoryNeedWeight * rc.phi * b[c] * rc.need[c] * z[c];
    const punt = rc.phi * b[c] * (rc.m[c] - 1) * z[c];
    const pool =
      rc.phi *
      config.poolScarcity.weight *
      rc.qP[c] *
      rc.m[c] *
      (config.poolScarcity.needBlend.base + config.poolScarcity.needBlend.need * rc.need[c]) *
      Math.max(z[c] - zRepl[c], 0);
    return { need, punt, poolScarcity: pool };
  });
  let needAdj = 0;
  let puntAdj = 0;
  let poolAdj = 0;
  let surplusSum = 0;
  for (const c of CATEGORIES) {
    needAdj += perCategory[c].need;
    puntAdj += perCategory[c].punt;
    poolAdj += perCategory[c].poolScarcity;
    surplusSum += rc.surplus[c] * Math.max(z[c], 0);
  }
  const pos = positionFraction(sp.player.positions, rc.positions, config);
  const positionAdj = U * pos.fraction;
  const multiPosAdj = U * pos.multiPosFraction;
  const redRaw = config.redundancyWeight * rc.phi * rc.gate * surplusSum;
  const redundancy = -Math.min(config.redundancyMaxFraction * U, redRaw);
  const teamFit = needAdj + puntAdj + poolAdj + positionAdj + multiPosAdj + redundancy;

  const playoff = U * sp.playoffPct;
  const upside = upsideAdjustment(sp.upsideScore, rc.round, config);
  const risk = riskAdjustment(sp.availability.rhoEff, U, rc.round, config);
  let userPref = 0;
  if (flags?.favorite) userPref += config.favoriteBonus * U;
  if (flags?.avoid) userPref -= config.avoidPenalty * U;
  const ddpRaw = sp.value.basePlayerValue + teamFit + playoff + upside + risk + userPref;
  return {
    fit: {
      need: needAdj,
      punt: puntAdj,
      poolScarcity: poolAdj,
      position: positionAdj,
      multiPos: multiPosAdj,
      redundancy: redundancy === 0 ? 0 : redundancy,
      teamFit,
      perCategory,
    },
    adjustments: { playoff, upside, risk, userPref },
    ddpRaw,
    positionUrgency: pos.urgency,
  };
}
