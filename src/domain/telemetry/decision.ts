import { riskDisplayText } from '../availability/availability';
import type { StaticContext } from '../recommendations/staticContext';
import { evaluateDraft, type DraftEvaluation, type DraftInput } from '../recommendations/engine';
import { appendPick } from '../draft/replay';
import type { Category } from '../types/core';
import type { CategoryProfileEntry, PlayerEvaluation } from '../types/evaluation';
import type { DecisionRecord, DecisionCandidate, DraftEvent, LeagueProfile } from '../types/league';
import { rosterSize } from '../types/league';

/**
 * Decision telemetry for the user's own picks (post-draft counterfactual audit).
 *
 * Captured at the moment of the pick from the SAME evaluation the user was looking at, plus the evaluation
 * that results from the pick. Recording never changes the recommendation or the draft log's semantics: the
 * record rides on the PICK event, so Undo removes it together with the pick.
 */

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export function candidateOf(p: PlayerEvaluation): DecisionCandidate {
  return {
    playerId: p.playerId,
    name: p.name,
    positions: p.positions,
    priorityRank: p.priorityRank,
    ddpRank: p.ddpRank,
    ddpRaw: r4(p.ddpRaw),
    ddpScore: r4(p.ddpScore),
    basePlayerValue: r4(p.value.basePlayerValue),
    teamFit: r4(p.fit.teamFit),
    label: p.label,
    labelRule: p.labelRule,
    band: p.market.band,
    urgency: p.market.urgency,
    adp: p.market.adp,
    xrank: p.market.xrank,
    risk: p.availability.displayRisk,
    riskCalculated: p.availability.risk,
    riskDisplay: riskDisplayText(p.availability),
    historyCoverage: r4(p.availability.terms.historyCoverage),
    projectionGap: p.availability.projectionGap ?? null,
    fitTags: p.fitTags,
  };
}

function profile(entries: readonly CategoryProfileEntry[]): DecisionRecord['profileBefore'] {
  return entries.map((e) => ({
    category: e.category,
    state: e.state,
    shown: e.displayState,
    d: r4(e.d),
    need: r4(e.need),
    pi: r4(e.punt.pi),
    puntLevel: e.punt.level,
    override: e.punt.override,
  }));
}

function punts(
  entries: readonly CategoryProfileEntry[],
): { category: Category; pi: number; level: string }[] {
  return entries
    .filter((e) => e.punt.level !== 'NONE')
    .map((e) => ({ category: e.category, pi: r4(e.punt.pi), level: e.punt.level }));
}

export interface DecisionInputs {
  ctx: StaticContext;
  league: LeagueProfile;
  input: DraftInput;
  before: DraftEvaluation;
  playerId: string;
  /** Unprojected (market-only) players still available, for the available-player snapshot. */
  unprojectedAvailable: number;
  activeBatchIds: string[];
  configVersion: number;
  now: string;
}

/** Build the record for a user pick of `playerId` against the current evaluation `before`. */
export function buildDecisionRecord(a: DecisionInputs): DecisionRecord {
  const { before } = a;
  const chosen = before.byId.get(a.playerId) ?? null;
  const rec = before.recommendedId ? (before.byId.get(before.recommendedId) ?? null) : null;
  // Evaluation after the pick: same inputs plus this pick (not persisted here; the store appends the event).
  const next = appendPick(
    a.input.events as DraftEvent[],
    { playerId: a.playerId, by: 'ME', advance: true, at: a.now },
    a.league.teamCount,
    rosterSize(a.league.roster),
  );
  const after = next.ok ? evaluateDraft(a.ctx, { ...a.input, events: next.events }) : null;
  return {
    version: 1,
    overallPick: before.draft.currentOverall,
    round: before.timing.currentRound,
    onSchedule: before.timing.onTheClock,
    selected: chosen ? candidateOf(chosen) : { playerId: a.playerId, unprojected: true },
    recommended: rec ? candidateOf(rec) : null,
    followedRecommendation: before.recommendedId === a.playerId,
    alternatives: before.players.slice(0, 8).map(candidateOf),
    profileBefore: profile(before.profile),
    profileAfter: after ? profile(after.profile) : null,
    punt: {
      buildBefore: before.advisor.build,
      buildAfter: after?.advisor.build ?? null,
      before: punts(before.profile),
      after: after ? punts(after.profile) : null,
      overrides: { ...a.input.puntOverrides },
    },
    timing: {
      label: chosen?.label ?? null,
      band: chosen?.market.band ?? null,
      nextPick: before.timing.p1,
      picksBeforeNext: before.timing.onTheClock ? before.timing.gapAfterP0 : before.timing.picksBeforeNext,
      gapType: before.timing.gapType,
    },
    available: {
      projected: before.players.length,
      unprojected: a.unprojectedAvailable,
      // Priority order at decision time; with the batch ids and config version this reconstructs the pool.
      order: before.players.map((p) => p.playerId),
    },
    context: {
      activeBatchIds: [...a.activeBatchIds].sort(),
      configVersion: a.configVersion,
      rosterSizeBefore: before.k,
    },
    recordedAt: a.now,
  };
}
