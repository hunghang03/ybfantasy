import { replay, type DraftState } from '../draft/replay';
import { pickTiming, userPicks, type PickTiming } from '../draft/snake';
import {
  marketOrder,
  marketRef,
  survivalBand,
  tierBand,
  timingLabel,
  valueOverMarket,
} from '../market/market';
import { baseState, displayCategoryState, rosterTotals, stateMaturity } from '../roster/profile';
import { gapFactor, nextPickScarcity, scarcityAdjustment } from '../scarcity/scarcity';
import { cmpId, sanitizeFinite } from '../numeric/safe';
import { CATEGORIES, mapCategories, type Category, type CategoryRecord, type Position } from '../types/core';
import { BAND_ORDER } from '../types/evaluation';
import type {
  AdvisorOutput,
  CategoryProfileEntry,
  EngineWarning,
  PlanningBlock,
  PlayerEvaluation,
  PositionReport,
  RosterTotals,
  StaticPlayer,
  SurvivalBand,
} from '../types/evaluation';
import { NO_FLAGS, type DraftEvent, type PlayerFlags, type PuntOverride } from '../types/league';
import { buildAdvisor } from '../advisor/advisor';
import { buildRosterContext, scorePlayer, type RosterContext, type ScoredDdp } from './ddp';
import type { StaticContext } from './staticContext';

/**
 * evaluateDraft — stage 2 of the engine (DESIGN §1). Pure and deterministic:
 * identical (static context, events, flags, overrides) ⇒ identical output.
 */

export interface DraftInput {
  events: readonly DraftEvent[];
  flags: Readonly<Record<string, PlayerFlags>>;
  puntOverrides: Partial<Record<Category, PuntOverride>>;
}

export interface RosterEntry {
  seq: number;
  overallPick: number | null;
  playerId: string;
  name: string;
  team: string | null;
  positions: Position[];
  neutralValue: number | null;
  baseValue: number | null;
  fitAtDraft: number | null;
  ddpAtDraft: number | null;
  keyCategories: Category[];
  risk: string | null;
  projected: boolean;
}

export interface DraftEvaluation {
  status: 'OK' | 'INSUFFICIENT_DATA';
  timing: PickTiming;
  draft: {
    currentOverall: number;
    unrecordedPicks: number;
    offSchedulePicks: number[];
    draftedCount: number;
  };
  round: number;
  k: number;
  profile: CategoryProfileEntry[];
  totals: RosterTotals;
  positions: PositionReport;
  roster: RosterEntry[];
  /** Available players ordered by recommendation priority (DND last). */
  players: PlayerEvaluation[];
  byId: Map<string, PlayerEvaluation>;
  recommendedId: string | null;
  relScale: { top: number; ref: number; spread: number };
  gap: { beforeNext: number; fallback: number; factor: number };
  advisor: AdvisorOutput;
  warnings: EngineWarning[];
  finiteRepairs: string[];
}

const TIER_NAMES = ['CONSERVATIVE', 'NEUTRAL', 'FALLBACK'] as const;

export function evaluateDraft(sc: StaticContext, input: DraftInput): DraftEvaluation {
  const config = sc.config;
  const league = sc.league;
  const params = { teams: sc.teams, slot: league.draftPosition, rounds: sc.rounds };
  const mine = userPicks(params);
  const state: DraftState = replay(input.events, new Set(mine));
  const timing = pickTiming(params, state.currentOverall);
  const round = timing.roundOfP0 ?? sc.rounds;
  const roundP1 = timing.p1 !== null ? Math.ceil(timing.p1 / sc.teams) : round;
  const flagsOf = (id: string): PlayerFlags => input.flags[id] ?? NO_FLAGS;

  const positionsOf = (id: string): Position[] =>
    sc.byId.get(id)?.player.positions ?? sc.unranked.find((u) => u.id === id)?.positions ?? [];
  const myIds = state.myPicks.map((p) => p.playerId);
  const myPositions = myIds.map(positionsOf);

  const available = sc.ranked.filter((p) => !state.drafted.has(p.player.id)); // BPV order
  const rc = buildRosterContext(sc, myIds, myPositions, available, round, input.puntOverrides);

  // ---- DDP for every available player (ADP-free) ----
  const scored = new Map<string, ScoredDdp>();
  for (const p of available) scored.set(p.player.id, scorePlayer(p, rc, sc, flagsOf(p.player.id)));
  const candidates = available.filter((p) => !flagsOf(p.player.id).doNotDraft);
  const byDdp = [...candidates].sort(
    (a, b) =>
      scored.get(b.player.id)!.ddpRaw - scored.get(a.player.id)!.ddpRaw || cmpId(a.player.id, b.player.id),
  );
  const ddpRank = new Map(byDdp.map((p, i) => [p.player.id, i + 1]));

  // Relative scale (R2-7): S = max(top − DDP at rank min(2N, n), minSpread) ≥ minSpread > 0.
  const top = byDdp.length ? scored.get(byDdp[0]!.player.id)!.ddpRaw : 0;
  const refIdx = Math.min(Math.round(config.relScale.referenceRounds * sc.teams), byDdp.length) - 1;
  const ref = refIdx >= 0 ? scored.get(byDdp[refIdx]!.player.id)!.ddpRaw : top;
  const S = Math.max(top - ref, config.relScale.minSpread);
  const relOf = (ddp: number) => Math.min(1, Math.max(0, 1 - (top - ddp) / S));

  // ---- Market layer ----
  const bands = new Map<string, ReturnType<typeof survivalBand>>();
  for (const p of available)
    bands.set(p.player.id, survivalBand(p.player.market, state.currentOverall, timing.p1, config));
  const order = marketOrder(available);
  const gBefore = timing.picksBeforeNext;
  const nWindow = Math.max(1, Math.round(config.nextPickScarcity.windowRounds * sc.teams));
  const { q: qN } = nextPickScarcity(order, gBefore, nWindow, sc.replacement.zRepl, config.numeric.eps);
  const gf = gapFactor(gBefore, sc.teams, config);
  const nextAdj = new Map<string, { total: number; perCategory: CategoryRecord<number> }>();
  for (const p of available) {
    const adj = scarcityAdjustment(
      p.stats.cappedZ,
      qN,
      rc.m,
      rc.need,
      sc.replacement.zRepl,
      config.nextPickScarcity.weight * gf,
      config.nextPickScarcity.needBlend,
    );
    nextAdj.set(p.player.id, adj);
  }

  // ---- Pick-pair planning (deterministic band-tier scenarios, R2-1) ----
  const gFallback = timing.p1 !== null ? Math.max(0, timing.p1 - state.currentOverall - 1) : 0;
  const candidatePool = candidates; // DND never a next-pick target
  const nextBest = (rosterIds: string[], excluded: string): PlanningBlock['nextBestConservative'] => {
    if (timing.p1 === null || rosterIds.length >= sc.rounds)
      return { playerId: null, ddpRaw: 0, tier: 'NONE' };
    const pool = candidatePool.filter((p) => p.player.id !== excluded);
    const poolAll = available.filter((p) => p.player.id !== excluded);
    const ctx: RosterContext = buildRosterContext(
      sc,
      rosterIds,
      rosterIds.map(positionsOf),
      poolAll,
      roundP1,
      input.puntOverrides,
    );
    // Players without a Yahoo market record are never assumed to last until P1 (no invented survival).
    const known = (p: StaticPlayer) => bands.get(p.player.id)!.band !== 'UNKNOWN';
    const fallbackSet = new Set(
      marketOrder(poolAll)
        .slice(gFallback)
        .filter(known)
        .map((p) => p.player.id),
    );
    const tiers: ((p: StaticPlayer) => boolean)[] = [
      (p) =>
        known(p) &&
        (config.pickPair.conservativeBands as SurvivalBand[]).includes(bands.get(p.player.id)!.band),
      (p) =>
        known(p) && (config.pickPair.neutralBands as SurvivalBand[]).includes(bands.get(p.player.id)!.band),
      (p) => fallbackSet.has(p.player.id),
    ];
    for (let t = 0; t < tiers.length; t++) {
      const members = pool.filter(tiers[t]!);
      if (members.length === 0) continue;
      let best: { id: string; v: number } | null = null;
      for (const p of members) {
        const v = scorePlayer(p, ctx, sc, flagsOf(p.player.id)).ddpRaw;
        if (!best || v > best.v || (v === best.v && p.player.id < best.id)) best = { id: p.player.id, v };
      }
      return { playerId: best!.id, ddpRaw: best!.v, tier: TIER_NAMES[t]! };
    }
    return { playerId: null, ddpRaw: 0, tier: 'NONE' };
  };
  const planning = new Map<string, PlanningBlock>();
  const topK = byDdp.slice(0, config.pickPair.candidates);
  for (const x of topK) {
    const id = x.player.id;
    const withX = nextBest([...myIds, id], id);
    const withoutX = nextBest(myIds, id);
    const ddp = scored.get(id)!.ddpRaw;
    const nAdj = nextAdj.get(id)!.total;
    const missCost = ddp + nAdj - withoutX.ddpRaw;
    planning.set(id, {
      pairScore: ddp + nAdj + config.pickPair.nextDiscount * withX.ddpRaw,
      nextBestConservative: withX,
      missCost,
      missRel: missCost / S,
    });
  }

  // ---- Assemble evaluations ----
  const evals: PlayerEvaluation[] = available.map((p) => {
    const id = p.player.id;
    const s = scored.get(id)!;
    const f = flagsOf(id);
    const b = bands.get(id)!;
    const ref = marketRef(p.player.market);
    const plan = planning.get(id) ?? null;
    const rel = f.doNotDraft ? 0 : relOf(s.ddpRaw);
    const lbl = f.doNotDraft
      ? { label: 'PASS' as const, rule: 'DND: flagged Do Not Draft' }
      : timingLabel({ ddpRel: rel, band: b.band, missRel: plan?.missRel ?? 0, avoid: f.avoid }, config);
    const rank = ddpRank.get(id) ?? 0;
    const na = nextAdj.get(id)!;
    return {
      playerId: id,
      name: p.player.name,
      team: p.player.team,
      positions: p.player.positions,
      stats: p.stats,
      value: p.value,
      availability: p.availability,
      fit: s.fit,
      adjustments: s.adjustments,
      ddpRaw: s.ddpRaw,
      ddpRel: rel,
      ddpScore: Math.round(100 * rel),
      ddpRank: rank,
      market: {
        adp: p.player.market?.yahooAdp7d ?? null,
        xrank: p.player.market?.yahooXRank ?? null,
        rank: p.player.market?.yahooRank ?? null,
        marketRef: ref.value,
        marketRefSource: ref.source,
        urgency: ref.value === null ? 'UNAVAILABLE' : 'AVAILABLE',
        band: b.band,
        bandBeforeXrank: b.bandBeforeXrank,
        zS: b.zS,
        valueOverMarket: rank > 0 ? valueOverMarket(ref.value, state.currentOverall, rank) : null,
        nextPickScarcity: na.total,
        perCategoryNextPick: na.perCategory,
      },
      planning: plan,
      label: lbl.label,
      labelRule: lbl.rule,
      priority: plan ? plan.pairScore : s.ddpRaw,
      priorityRank: 0,
      fitTags: fitTags(p, rc),
      confidence: p.confidence,
      warnings: p.warnings,
      disagreement: p.disagreement,
      flags: f,
    };
  });
  // Ordering (DESIGN §8.3 + implementation calibration): candidates whose pair score is within
  // tieToleranceRel·S of the best are "contenders"; among contenders the MOST AT-RISK band goes first
  // (ordinal comparison only) — take the player who will not come back, get the others later.
  const bestPair = Math.max(...[...planning.values()].map((p) => p.pairScore), Number.NEGATIVE_INFINITY);
  const tol = config.pickPair.tieToleranceRel * S;
  const bandIdx = (e: PlayerEvaluation) => BAND_ORDER.indexOf(tierBand(e.market.band, config));
  // A contender must also be LEAN-DRAFT quality on its own (ddpRel ≥ leanDraftRel), so the at-risk
  // tiebreak can never promote a clearly weaker player. If nobody qualifies, pair score decides.
  const qualified = [...planning.entries()].filter(
    ([id]) => relOf(scored.get(id)!.ddpRaw) >= config.marketTimingThresholds.leanDraftRel,
  );
  const bestQualified = Math.max(...qualified.map(([, p]) => p.pairScore), Number.NEGATIVE_INFINITY);
  const isContender = (e: PlayerEvaluation) =>
    !!e.planning &&
    (qualified.length > 0
      ? e.ddpRel >= config.marketTimingThresholds.leanDraftRel && e.planning.pairScore >= bestQualified - tol
      : e.planning.pairScore >= bestPair - tol);
  // The at-risk tiebreak compares urgency. If any contender's urgency is unknown (no market record) the
  // comparison is impossible, so contenders are ordered by DDP instead (keeps the order transitive).
  const urgencyComparable = !evals.some((e) => isContender(e) && e.market.band === 'UNKNOWN');
  evals.sort((a, b) => {
    const ad = a.flags.doNotDraft ? 1 : 0;
    const bd = b.flags.doNotDraft ? 1 : 0;
    if (ad !== bd) return ad - bd;
    const ac = isContender(a) ? 0 : 1;
    const bc = isContender(b) ? 0 : 1;
    if (ac !== bc) return ac - bc;
    // Among contenders: most at-risk band first; within the same band, the higher DDP first
    // (pair scores inside the tolerance are treated as ties, so take the better player now).
    if (ac === 0)
      return (
        (urgencyComparable ? bandIdx(a) - bandIdx(b) : 0) ||
        b.ddpRaw - a.ddpRaw ||
        cmpId(a.playerId, b.playerId)
      );
    const ap = a.planning ? 0 : 1;
    const bp = b.planning ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return b.priority - a.priority || b.ddpRaw - a.ddpRaw || cmpId(a.playerId, b.playerId);
  });
  evals.forEach((e, i) => (e.priorityRank = i + 1));
  const recommendedId = evals.find((e) => !e.flags.doNotDraft && e.planning)?.playerId ?? null;
  // R0: the plan's recommended pick is never shown as WAIT/SAFE WAIT/PASS — it is at least LEAN DRAFT.
  const recEval = recommendedId ? evals.find((e) => e.playerId === recommendedId) : undefined;
  if (
    recEval &&
    recEval.label !== 'DRAFT_NOW' &&
    recEval.label !== 'LEAN_DRAFT' &&
    recEval.label !== 'NO_MARKET'
  ) {
    recEval.label = 'LEAN_DRAFT';
    recEval.labelRule = `R0: recommended by the pick-pair plan (was ${recEval.labelRule})`;
  }

  // ---- Profile ----
  const maturity = stateMaturity(state.myPicks.length, config);
  const profile: CategoryProfileEntry[] = CATEGORIES.map((c) => {
    const punt = rc.punts.entries[c];
    const bs = baseState(rc.standing.d[c], config);
    const catState = punt.level === 'HARD' ? 'PUNT' : punt.level === 'SOFT' ? 'SOFT_PUNT' : bs;
    return {
      category: c,
      rosterSum: rc.standing.s[c],
      expected: rc.standing.B[c],
      teamSd: rc.standing.sigmaT[c],
      d: rc.standing.d[c],
      state: catState,
      baseState: bs,
      displayState: displayCategoryState(catState, maturity),
      maturity,
      need: rc.need[c],
      surplus: rc.surplus[c],
      poolScarcity: rc.qP[c],
      nextPickScarcity: qN[c],
      punt,
      weightMultiplier: rc.m[c],
      effectiveWeight: sc.baseWeights[c] * rc.m[c],
    };
  });

  const roster: RosterEntry[] = state.myPicks.map((mp) => {
    const sp = sc.byId.get(mp.playerId);
    const u = sp ? null : sc.unranked.find((x) => x.id === mp.playerId);
    return {
      seq: mp.seq,
      overallPick: mp.overallPick,
      playerId: mp.playerId,
      name: sp?.player.name ?? u?.name ?? mp.playerId,
      team: sp?.player.team ?? u?.team ?? null,
      positions: sp?.player.positions ?? u?.positions ?? [],
      neutralValue: sp?.stats.neutral9Cat ?? null,
      baseValue: sp?.value.basePlayerValue ?? null,
      fitAtDraft: mp.snapshot?.teamFit ?? null,
      ddpAtDraft: mp.snapshot?.ddpRaw ?? null,
      keyCategories: sp
        ? [...CATEGORIES]
            .sort((a, b) => sp.stats.cappedZ[b] - sp.stats.cappedZ[a])
            .filter((c) => sp.stats.cappedZ[c] > 0.5)
            .slice(0, 3)
        : [],
      risk: sp?.availability.risk ?? null,
      projected: !!sp,
    };
  });

  const warnings: EngineWarning[] = [...sc.warnings, ...rc.warnings];
  if (state.unrecordedPicks > 0)
    warnings.push({
      code: 'UNRECORDED_PICKS',
      message: `${state.unrecordedPicks} pick(s) not recorded locally. Mark missing players as taken (no advance).`,
      severity: 'info',
    });
  if (state.unrecordedPicks < 0)
    warnings.push({
      code: 'OVERRECORDED_PICKS',
      message: `More picks recorded than the current pick implies (${-state.unrecordedPicks}). Check the current pick.`,
      severity: 'warn',
    });
  if (state.offSchedulePicks.length)
    warnings.push({
      code: 'OFF_SCHEDULE_PICK',
      message: `Your pick(s) at ${state.offSchedulePicks.join(', ')} are not on your snake schedule.`,
      severity: 'warn',
    });
  if (timing.p0 !== null && timing.p1 === null && !timing.draftComplete)
    warnings.push({
      code: 'FINAL_PICK',
      message: 'This is your final pick — waiting is not possible.',
      severity: 'info',
    });

  const advisor = buildAdvisor({ sc, timing, rc, profile, evals, recommendedId, warnings, round });

  const result: DraftEvaluation = {
    status: sc.status,
    timing,
    draft: {
      currentOverall: state.currentOverall,
      unrecordedPicks: state.unrecordedPicks,
      offSchedulePicks: state.offSchedulePicks,
      draftedCount: state.drafted.size,
    },
    round,
    k: rc.k,
    profile,
    totals: rosterTotals(rc.roster),
    positions: rc.positions,
    roster,
    players: evals,
    byId: new Map(),
    recommendedId: sc.status === 'OK' ? recommendedId : null,
    relScale: { top, ref, spread: S },
    gap: { beforeNext: gBefore, fallback: gFallback, factor: gf },
    advisor,
    warnings,
    finiteRepairs: [],
  };
  // Finite-output contract (R2-7): repair and report any non-finite number.
  const repairs: string[] = [];
  result.players = result.players.map((e) => {
    const r = sanitizeFinite(e);
    if (r.bad.length) repairs.push(...r.bad.map((b) => `${e.playerId}.${b}`));
    return r.value;
  });
  const prof = sanitizeFinite(result.profile);
  result.profile = prof.value;
  repairs.push(...prof.bad.map((b) => `profile.${b}`));
  result.finiteRepairs = repairs;
  if (repairs.length)
    result.warnings.push({
      code: 'NON_FINITE_REPAIRED',
      message: `${repairs.length} non-finite value(s) replaced by 0.`,
      severity: 'warn',
    });
  result.byId = new Map(result.players.map((p) => [p.playerId, p]));
  return result;
}

/** Up to 3 categories where the player helps and the category still counts (m_c > 0), weighted by need. */
function fitTags(p: StaticPlayer, rc: RosterContext): Category[] {
  return CATEGORIES.filter((c) => p.stats.cappedZ[c] >= 0.5 && rc.m[c] > 0)
    .map((c) => ({ c, v: p.stats.cappedZ[c] * (0.25 + rc.need[c]) * rc.m[c] }))
    .sort((a, b) => b.v - a.v || CATEGORIES.indexOf(a.c) - CATEGORIES.indexOf(b.c))
    .slice(0, 3)
    .map((x) => x.c);
}

export function emptyCategoryRecord(): CategoryRecord<number> {
  return mapCategories(() => 0);
}
