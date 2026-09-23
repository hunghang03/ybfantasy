import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { appendPick, appendResync } from '@/domain/draft/replay';
import { survivalBand, timingLabel, valueOverMarket, marketRef } from '@/domain/market/market';
import * as marketModule from '@/domain/market/market';
import { relativeScarcity } from '@/domain/scarcity/scarcity';
import { mapCategories } from '@/domain/types/core';
import type { Dataset, YahooMarket } from '@/domain/types/data';
import type { DraftEvent } from '@/domain/types/league';
import { mulberry32 } from '@/lib/sample/generator';
import { league, run, sampleDataset, synthDataset, synthPool, withSynth } from '../helpers/fixtures';

const cfg = defaultConfig();
const mk = (adp: number | null, xrank: number | null = null): YahooMarket => ({
  canonicalPlayerId: 'x', season: 's', importBatchId: 'b', yahooAdp7d: adp, yahooXRank: xrank, yahooRank: null, status: null,
});

function draftToPick(ds: Dataset, n: number): DraftEvent[] {
  // Others take the first n−1 players by ADP.
  const order = [...ds.market].filter((m) => m.yahooAdp7d !== null).sort((a, b) => a.yahooAdp7d! - b.yahooAdp7d!);
  let e: DraftEvent[] = [];
  for (let i = 0; i < n - 1; i++) {
    const r = appendPick(e, { playerId: order[i]!.canonicalPlayerId, by: 'OTHER', at: 't' }, 14, 13);
    if (!r.ok) throw new Error(r.error);
    e = r.events;
  }
  return e;
}

function shuffledMarket(ds: Dataset, seed: number): Dataset {
  const rnd = mulberry32(seed);
  const vals = ds.market.map((m) => m.yahooAdp7d);
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [vals[i], vals[j]] = [vals[j]!, vals[i]!];
  }
  return {
    ...ds,
    market: ds.market.map((m, i) => ({ ...m, yahooAdp7d: vals[i] ?? null, yahooXRank: Math.ceil(rnd() * 300), yahooRank: Math.ceil(rnd() * 300) })),
  };
}

describe('T-ADP-1: ADP never changes pool scarcity, BPV, TeamFit or DDP', () => {
  it('randomized permutations of ADP/XRank/Rank leave every ADP-free output bit-identical', () => {
    const ds = sampleDataset();
    const events = draftToPick(ds, 46);
    const flags = {};
    const lg = league();
    const base = run(ds, lg, { events, flags, puntOverrides: {} }).ev;
    for (const seed of [1, 2, 3]) {
      const alt = run(shuffledMarket(ds, seed), lg, { events, flags, puntOverrides: {} }).ev;
      expect(alt.profile.map((p) => p.poolScarcity)).toEqual(base.profile.map((p) => p.poolScarcity));
      for (const p of base.players) {
        const q = alt.byId.get(p.playerId)!;
        expect(q.value).toEqual(p.value);
        expect(q.fit).toEqual(p.fit);
        expect(q.ddpRaw).toBe(p.ddpRaw);
      }
    }
  });
});

describe('T-ADP-2: ADP may change next-pick scarcity and urgency', () => {
  it('AST players inside the gap → AST next-pick scarcity; moved past the window → none; band and label move', () => {
    const pool = synthPool(250);
    const astar = { id: 'ASTAR', positions: ['PG' as const], pts: 26, reb: 5, ast: 11, stl: 1.8, blk: 0.4, threes: 3.2, to: 2.6, fgm: 9.8, fga: 19, ftm: 5.7, fta: 6.2 };
    const specialists = [0, 1, 2, 3, 4].map((i) => ({ id: `AS${i}`, positions: ['PG' as const], pts: 13, reb: 3, ast: 8.5, stl: 1.2, blk: 0.2, threes: 1.8, to: 2.2 }));
    const build = (adpIn: boolean) =>
      withSynth(synthDataset(pool), [
        { ...astar, adp: adpIn ? 69 : 240 },
        ...specialists.map((s, i) => ({ ...s, adp: adpIn ? 67.5 + i : 241 + i })),
      ]);
    // On the clock at 67 (slot 11); players with ADP < 67 are gone (marked taken without advancing).
    const events = (ds: Dataset): DraftEvent[] => {
      const r = appendResync([], 67, 14, 13, 't');
      if (!r.ok) throw new Error(r.error);
      let e = r.events;
      for (const m of ds.market.filter((x) => x.yahooAdp7d !== null && x.yahooAdp7d < 67)) {
        const p = appendPick(e, { playerId: m.canonicalPlayerId, by: 'OTHER', advance: false, at: 't' }, 14, 13);
        if (p.ok) e = p.events;
      }
      return e;
    };
    const dsIn = build(true);
    const dsOut = build(false);
    // Same drafted set in both scenarios (the moved players are never drafted).
    const evIn = run(dsIn, league(), { events: events(dsIn), flags: {}, puntOverrides: {} }).ev;
    const evOut = run(dsOut, league(), { events: events(dsIn), flags: {}, puntOverrides: {} }).ev;
    expect(evIn.timing.p1).toBe(74);
    const qIn = evIn.profile.find((p) => p.category === 'AST')!.nextPickScarcity;
    const qOut = evOut.profile.find((p) => p.category === 'AST')!.nextPickScarcity;
    if (process.env.DBG) console.log('qIn', qIn, 'qOut', qOut);
    expect(qIn).toBeGreaterThan(0.1);
    expect(qOut).toBeLessThan(0.05);
    expect(evIn.byId.get('ASTAR')!.market.nextPickScarcity).toBeGreaterThan(evOut.byId.get('ASTAR')!.market.nextPickScarcity);
    // Urgency: band and label move with ADP…
    const aIn = evIn.byId.get('ASTAR')!;
    const aOut = evOut.byId.get('ASTAR')!;
    expect(aIn.market.band).toBe('UNLIKELY');
    expect(aIn.label).toBe('DRAFT_NOW');
    expect(aOut.market.band).toBe('SAFE');
    expect(aOut.label).not.toBe('DRAFT_NOW');
    expect(aOut.labelRule).toMatch(/S1/);
    // …while DDP (and pool scarcity) do not (T-ADP-1 in the same scenario).
    expect(aOut.ddpRaw).toBe(aIn.ddpRaw);
    expect(evOut.profile.map((p) => p.poolScarcity)).toEqual(evIn.profile.map((p) => p.poolScarcity));
  });
});

describe('pool scarcity reacts to the actual remaining pool', () => {
  it('drafting the AST-rich players raises AST pool scarcity; REB stays low when rebounders remain', () => {
    const pool = synthPool(250);
    const guards = Array.from({ length: 12 }, (_, i) => ({ id: `G${i}`, positions: ['PG' as const], pts: 20, ast: 9.5, reb: 3.5, threes: 2.6, stl: 1.3, blk: 0.2, to: 2.6, fgm: 7.5, fga: 16, ftm: 3.5, fta: 4, adp: 5 + i }));
    const ds = withSynth(synthDataset(pool), guards);
    const before = run(ds, league()).ev;
    let e: DraftEvent[] = [];
    for (const g of guards) {
      const r = appendPick(e, { playerId: g.id, by: 'OTHER', at: 't' }, 14, 13);
      if (r.ok) e = r.events;
    }
    const after = run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev;
    const q = (ev: typeof before, c: string) => ev.profile.find((p) => p.category === c)!.poolScarcity;
    expect(q(after, 'AST')).toBeGreaterThan(q(before, 'AST') + 0.1);
    expect(q(after, 'REB')).toBeLessThan(q(after, 'AST'));
    // Source data of drafted players is untouched.
    expect(run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ctx.byId.get('G0')!.player.proj).toEqual(before.byId.get('G0') ? run(ds, league()).ctx.byId.get('G0')!.player.proj : null);
  });

  it('scarcity denominators are guarded', () => {
    const zero = mapCategories(() => 0);
    const r = relativeScarcity(zero, zero, 1e-9);
    expect(Object.values(r.q).every((x) => x === 0)).toBe(true);
  });
});

describe('survival bands and timing labels', () => {
  it('spec §50 market fixture: pick 67, next 74 — A (ADP 69) DRAFT NOW; B (ADP 95) waits', () => {
    const a = survivalBand(mk(69), 67, 74, cfg);
    const b = survivalBand(mk(95), 67, 74, cfg);
    expect(a.band).toBe('UNLIKELY');
    expect(b.band).toBe('SAFE');
    // DDP 95 vs 93 on the display scale → rel 1.0 and ~0.96 (S from the pool)
    expect(timingLabel({ ddpRel: 1, band: a.band, missRel: 0.3, avoid: false }, cfg).label).toBe('DRAFT_NOW');
    expect(['WAIT', 'SAFE_WAIT']).toContain(timingLabel({ ddpRel: 0.96, band: b.band, missRel: 0.1, avoid: false }, cfg).label);
  });

  it('spec §32 examples', () => {
    // Our rank 45, ADP 83, current 46 (next pick 53 in a 14-team slot 11 → 67; use 67): WAIT / target later
    expect(survivalBand(mk(83), 46, 67, cfg).band).toBe('SAFE');
    // Our rank 31, ADP 33, current 25, next 52 → DRAFT NOW
    const band = survivalBand(mk(33), 25, 52, cfg).band;
    expect(band).toBe('UNLIKELY');
    expect(timingLabel({ ddpRel: 0.95, band, missRel: 0.3, avoid: false }, cfg).label).toBe('DRAFT_NOW');
    expect(valueOverMarket(83, 46, 1)).toBe(83 - 46);
  });

  it('next-pick distance drives timing: the same ADP is safe before a short gap, at risk before a long one', () => {
    expect(survivalBand(mk(70), 46, 53, cfg).band).toBe('SAFE');
    expect(survivalBand(mk(70), 46, 67, cfg).band).toBe('TOSSUP');
  });

  it('GONE, final pick, fallback and XRank downgrade', () => {
    expect(survivalBand(mk(30), 67, 74, cfg).band).toBe('GONE');
    expect(survivalBand(mk(100), 67, null, cfg).band).toBe('UNLIKELY');
    expect(survivalBand(mk(null), 67, 74, cfg).band).toBe('UNKNOWN');
    expect(marketRef(mk(null, 40))).toEqual({ value: 40, source: 'XRANK' });
    const down = survivalBand(mk(95, 60), 67, 74, cfg);
    expect(down.bandBeforeXrank).toBe('SAFE');
    expect(down.band).toBe('LIKELY');
  });

  it('labels: PASS, LEAN, UNKNOWN never DRAFT NOW, avoid', () => {
    expect(timingLabel({ ddpRel: 0.3, band: 'UNLIKELY', missRel: 0, avoid: false }, cfg).label).toBe('PASS');
    expect(timingLabel({ ddpRel: 0.8, band: 'TOSSUP', missRel: 0, avoid: false }, cfg).label).toBe('LEAN_DRAFT');
    expect(timingLabel({ ddpRel: 1, band: 'UNKNOWN', missRel: 1, avoid: false }, cfg).label).toBe('LEAN_DRAFT');
    expect(timingLabel({ ddpRel: 0.7, band: 'UNLIKELY', missRel: 0, avoid: true }, cfg).label).toBe('PASS');
    expect(timingLabel({ ddpRel: 0.9, band: 'LIKELY', missRel: 0.4, avoid: false }, cfg).label).toBe('LEAN_DRAFT');
    expect(timingLabel({ ddpRel: 0.9, band: 'LIKELY', missRel: 0.1, avoid: false }, cfg).label).toBe('WAIT');
  });

  it('T-BAND-1: bands are ordinal — no exported numeric band mapping; zS moves within a band change nothing', () => {
    for (const v of Object.values(marketModule)) {
      if (v && typeof v === 'object') expect(Object.keys(v)).not.toEqual(expect.arrayContaining(['SAFE', 'LIKELY']));
    }
    const ds = sampleDataset();
    const events = draftToPick(ds, 67);
    const base = run(ds, league(), { events, flags: {}, puntOverrides: {} }).ev;
    const target = base.players.find((p) => p.market.band === 'SAFE' && p.planning)!;
    expect(target).toBeDefined();
    const moved: Dataset = { ...ds, market: ds.market.map((m) => (m.canonicalPlayerId === target.playerId ? { ...m, yahooAdp7d: m.yahooAdp7d! + 3 } : m)) };
    const alt = run(moved, league(), { events, flags: {}, puntOverrides: {} }).ev.byId.get(target.playerId)!;
    expect(alt.market.band).toBe('SAFE');
    expect(alt.market.zS).not.toBe(target.market.zS);
    expect(alt.label).toBe(target.label);
    expect(alt.planning!.pairScore).toBeCloseTo(target.planning!.pairScore, 10);
  });
});
