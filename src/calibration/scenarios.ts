import { appendPick } from '@/domain/draft/replay';
import { cmpId } from '@/domain/numeric/safe';
import { evaluateDraft, type DraftEvaluation } from '@/domain/recommendations/engine';
import type { StaticContext } from '@/domain/recommendations/staticContext';
import { CATEGORY_LABEL, type Category } from '@/domain/types/core';
import type { PlayerEvaluation } from '@/domain/types/evaluation';
import type { DraftEvent, PuntOverride } from '@/domain/types/league';

/**
 * Deterministic draft scenarios for calibration QA (docs/CALIBRATION.md §Scenarios).
 * Other teams draft strictly by market reference (L7 ADP → XRank → Rank; no market → by BPV).
 * "My" picks follow a foundation policy that only chooses AMONG the engine's own top candidates, so
 * the scenario exercises the engine's reaction to a roster shape rather than replacing the engine.
 */

export const SCENARIO_SLOTS = [1, 4, 7, 11, 14] as const;
export const SNAPSHOT_ROUNDS = [1, 2, 4, 6, 9, 12] as const;

export type Foundation = 'balanced' | 'softPuntTO' | 'puntFT' | 'guardHeavy' | 'bigHeavy' | 'injuryRiskStars';
export const FOUNDATIONS: Foundation[] = [
  'balanced',
  'softPuntTO',
  'puntFT',
  'guardHeavy',
  'bigHeavy',
  'injuryRiskStars',
];

const OVERRIDES: Record<Foundation, Partial<Record<Category, PuntOverride>>> = {
  balanced: {},
  softPuntTO: { TO: 'SOFT' },
  puntFT: { FT_PCT: 'HARD' },
  guardHeavy: {},
  bigHeavy: {},
  injuryRiskStars: {},
};

const WINDOW = 8; // foundations may only choose among the engine's top-8 priority candidates

function candidates(ev: DraftEvaluation, n = WINDOW): PlayerEvaluation[] {
  return ev.players.filter((p) => !p.flags.doNotDraft).slice(0, n);
}

/** Foundation pick policy. Always returns a player from the engine's own candidate list. */
export function choosePick(
  f: Foundation,
  ev: DraftEvaluation,
  round: number,
): { id: string; reason: string } {
  const rec = ev.recommendedId!;
  const top = candidates(ev);
  const pickFirst = (pred: (p: PlayerEvaluation) => boolean, reason: string) => {
    const hit = top.find(pred);
    return hit
      ? { id: hit.playerId, reason }
      : { id: rec, reason: 'recommended (no candidate matched the foundation)' };
  };
  switch (f) {
    case 'balanced':
    case 'softPuntTO':
      return { id: rec, reason: 'recommended' };
    case 'puntFT':
      if (round <= 3) {
        const pool = top.filter((p) => p.ddpRel >= 0.75);
        const worstFt = [...pool].sort(
          (a, b) => a.stats.cappedZ.FT_PCT - b.stats.cappedZ.FT_PCT || cmpId(a.playerId, b.playerId),
        )[0];
        if (worstFt)
          return { id: worstFt.playerId, reason: 'punt FT%: lowest FT z among LEAN-quality candidates' };
      }
      return { id: rec, reason: 'recommended' };
    case 'guardHeavy':
      return round <= 8
        ? pickFirst(
            (p) => p.positions.includes('PG') || p.positions.includes('SG'),
            'guard-heavy: first guard in priority',
          )
        : { id: rec, reason: 'recommended' };
    case 'bigHeavy':
      return round <= 8
        ? pickFirst(
            (p) => p.positions.includes('C') || p.positions.includes('PF'),
            'big-heavy: first PF/C in priority',
          )
        : { id: rec, reason: 'recommended' };
    case 'injuryRiskStars':
      if (round <= 2) {
        const risky = candidates(ev, 12)
          .filter(
            (p) =>
              p.availability.risk === 'HIGH' ||
              p.availability.risk === 'VERY_HIGH' ||
              p.value.availabilityFraction < 65 / 82,
          )
          .sort(
            (a, b) => b.value.basePlayerValue - a.value.basePlayerValue || cmpId(a.playerId, b.playerId),
          )[0];
        if (risky)
          return { id: risky.playerId, reason: 'injury-risk star: highest-BPV risky player in top 12' };
      }
      return { id: rec, reason: 'recommended' };
  }
}

export interface ScenarioSnapshot {
  afterRound: number;
  currentPick: number;
  nextPick: number | null;
  roster: { pick: number | null; name: string; pos: string; reason: string }[];
  build: string;
  priority: string;
  reason: string;
  categories: { cat: string; state: string; d: number; need: number; pi: number; punt: string }[];
  warnings: string[];
  recommended: { name: string; label: string; why: string } | null;
  top5: {
    name: string;
    pos: string;
    ddp: number;
    ddpRaw: number;
    label: string;
    rule: string;
    band: string;
    adp: number | null;
    fitTags: string;
  }[];
}

export interface ScenarioResult {
  slot: number;
  foundation: Foundation;
  overrides: Partial<Record<Category, PuntOverride>>;
  snapshots: ScenarioSnapshot[];
  finalRoster: { pick: number | null; name: string; pos: string }[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;

function snapshot(ev: DraftEvaluation, afterRound: number, reasons: Map<string, string>): ScenarioSnapshot {
  const rec = ev.recommendedId ? ev.byId.get(ev.recommendedId) : undefined;
  return {
    afterRound,
    currentPick: ev.draft.currentOverall,
    nextPick: ev.timing.p0,
    roster: ev.roster.map((r) => ({
      pick: r.overallPick,
      name: r.name,
      pos: r.positions.join('/'),
      reason: reasons.get(r.playerId) ?? '',
    })),
    build: ev.advisor.build,
    priority: ev.advisor.priorityLine,
    reason: ev.advisor.reason,
    categories: ev.profile.map((p) => ({
      cat: CATEGORY_LABEL[p.category],
      state: p.state,
      shown: p.displayState,
      d: r2(p.d),
      need: r2(p.need),
      pi: r2(p.punt.pi),
      punt: p.punt.level,
    })),
    warnings: ev.warnings.filter((w) => w.severity !== 'info').map((w) => w.code),
    recommended: rec ? { name: rec.name, label: rec.label, why: ev.advisor.recommendedWhy } : null,
    top5: candidates(ev, 5).map((p) => ({
      name: p.name,
      pos: p.positions.join('/'),
      ddp: p.ddpScore,
      ddpRaw: r2(p.ddpRaw),
      label: p.label,
      rule: p.labelRule.split(':')[0]!,
      band: p.market.band,
      adp: p.market.adp,
      fitTags: p.fitTags.map((c) => CATEGORY_LABEL[c]).join(' '),
    })),
  };
}

/** Market-order pick for other teams (deterministic). */
/**
 * How SIMULATED opponents order players (never used by the engine's own market layer):
 *  - MARKET: Yahoo market reference (L7 ADP → XRank → Rank); players without a market row go last, by BPV.
 *  - MARKET_OR_PRESEASON: as MARKET, but a player without a market row is ordered by the projection file's own
 *    Yahoo Pre-Season Rank (providerRank) instead of being assumed undrafted. A simulation assumption only.
 */
export type OpponentPolicy = 'MARKET' | 'MARKET_OR_PRESEASON';

function marketPick(ev: DraftEvaluation, ctx: StaticContext, policy: OpponentPolicy): string {
  const ref = (p: PlayerEvaluation): number | null =>
    p.market.marketRef ??
    (policy === 'MARKET_OR_PRESEASON' ? (ctx.byId.get(p.playerId)?.player.proj?.providerRank ?? null) : null);
  const sorted = [...ev.players].sort((a, b) => {
    const ma = ref(a);
    const mb = ref(b);
    if (ma !== null && mb !== null) return ma - mb || cmpId(a.playerId, b.playerId);
    if (ma !== null) return -1;
    if (mb !== null) return 1;
    return b.value.basePlayerValue - a.value.basePlayerValue || cmpId(a.playerId, b.playerId);
  });
  return sorted[0]!.playerId;
}

export function runScenario(
  ctx: StaticContext,
  slot: number,
  foundation: Foundation,
  opponents: OpponentPolicy = 'MARKET',
): ScenarioResult {
  const sc: StaticContext = { ...ctx, league: { ...ctx.league, draftPosition: slot } };
  const overrides = OVERRIDES[foundation];
  const teams = sc.teams;
  const rounds = sc.rounds;
  let events: DraftEvent[] = [];
  const reasons = new Map<string, string>();
  const snapshots: ScenarioSnapshot[] = [];
  const wanted = new Set<number>(SNAPSHOT_ROUNDS);
  let myRoundsDone = 0;
  for (let safety = 0; safety < teams * rounds + 5; safety++) {
    const ev = evaluateDraft(sc, { events, flags: {}, puntOverrides: overrides });
    if (ev.timing.draftComplete || ev.players.length === 0) break;
    if (ev.timing.onTheClock) {
      if (wanted.has(myRoundsDone)) snapshots.push(snapshot(ev, myRoundsDone, reasons));
      if (!ev.recommendedId) break;
      const choice = choosePick(foundation, ev, ev.timing.currentRound);
      reasons.set(choice.id, choice.reason);
      const r = appendPick(events, { playerId: choice.id, by: 'ME', at: 'scenario' }, teams, rounds);
      if (!r.ok) break;
      events = r.events;
      myRoundsDone++;
    } else {
      const r = appendPick(
        events,
        { playerId: marketPick(ev, sc, opponents), by: 'OTHER', at: 'scenario' },
        teams,
        rounds,
      );
      if (!r.ok) break;
      events = r.events;
    }
  }
  const final = evaluateDraft(sc, { events, flags: {}, puntOverrides: overrides });
  return {
    slot,
    foundation,
    overrides,
    snapshots,
    finalRoster: final.roster.map((r) => ({ pick: r.overallPick, name: r.name, pos: r.positions.join('/') })),
  };
}

export function runAllScenarios(ctx: StaticContext, opponents: OpponentPolicy = 'MARKET'): ScenarioResult[] {
  const out: ScenarioResult[] = [];
  for (const slot of SCENARIO_SLOTS)
    for (const f of FOUNDATIONS) out.push(runScenario(ctx, slot, f, opponents));
  return out;
}

export function scenariosMarkdown(results: ScenarioResult[]): string {
  const lines: string[] = [
    '# Calibration scenarios',
    '',
    'Deterministic 14-team H2H 9-cat drafts. Others draft by Yahoo market order; "my" picks follow the foundation policy within the engine\'s top-8 candidates.',
    '',
  ];
  for (const r of results) {
    lines.push(
      `## Slot ${r.slot} — ${r.foundation}${Object.keys(r.overrides).length ? ` (overrides ${JSON.stringify(r.overrides)})` : ''}`,
      '',
    );
    lines.push(`Final roster: ${r.finalRoster.map((p) => `${p.pick} ${p.name} (${p.pos})`).join(' · ')}`, '');
    lines.push(
      '| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |',
      '|---|---|---|---|---|---|---|',
    );
    for (const s of r.snapshots) {
      const weak = s.categories
        .filter((c) => ['WEAK', 'CRITICAL', 'SOFT_PUNT', 'PUNT'].includes(c.state))
        .map((c) => `${c.cat}:${c.state}`)
        .join(' ');
      const top3 = s.top5
        .slice(0, 3)
        .map((t) => `${t.name} ${t.ddp} ${t.label}`)
        .join('; ');
      lines.push(
        `| ${s.afterRound} | ${s.currentPick} | ${s.build.replace('Build: ', '')} | ${s.priority.replace('Priority: ', '')} | ${weak || '—'} | ${s.recommended ? `${s.recommended.name} (${s.recommended.label})` : '—'} | ${top3} |`,
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}
