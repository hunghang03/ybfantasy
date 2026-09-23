import { describe, expect, it } from 'vitest';
import {
  eventsFrom,
  league,
  run,
  synthDataset,
  synthPool,
  withSynth,
  type SynthSpec,
} from '../helpers/fixtures';

const big = (id: string): SynthSpec => ({
  id,
  positions: ['C'],
  pts: 17,
  reb: 12.5,
  ast: 1.6,
  stl: 0.7,
  blk: 2.6,
  threes: 0.2,
  to: 1.7,
  fgm: 7.2,
  fga: 12,
  ftm: 2.4,
  fta: 3.6,
});
const guard = (id: string): SynthSpec => ({
  id,
  positions: ['PG'],
  pts: 17,
  reb: 3.5,
  ast: 8.5,
  stl: 1.3,
  blk: 0.2,
  threes: 3.0,
  to: 2.9,
  fgm: 6.0,
  fga: 13.5,
  ftm: 3.0,
  fta: 3.5,
});
const usage = (id: string): SynthSpec => ({
  id,
  positions: ['PG', 'SG'],
  pts: 27,
  reb: 5,
  ast: 8,
  stl: 1.3,
  blk: 0.4,
  threes: 3.2,
  to: 4.2,
  fgm: 9.5,
  fga: 20,
  ftm: 6,
  fta: 6.8,
});

describe('team fit (spec §50 need fixture)', () => {
  it('roster elite REB/BLK, weak AST/3PM → AST/3PM player gains substantial fit over another REB/BLK big', () => {
    const ds = withSynth(synthDataset(synthPool(260)), [
      big('B1'),
      big('B2'),
      big('B3'),
      big('CAND_BIG'),
      guard('CAND_PG'),
    ]);
    const events = eventsFrom([
      { id: 'B1', by: 'ME' },
      { id: 'B2', by: 'ME' },
      { id: 'B3', by: 'ME' },
    ]);
    const { ev } = run(ds, league({ draftPosition: 1 }), { events, flags: {}, puntOverrides: {} });
    const reb = ev.profile.find((p) => p.category === 'REB')!;
    const ast = ev.profile.find((p) => p.category === 'AST')!;
    expect(['ELITE', 'STRONG']).toContain(reb.baseState);
    expect(['WEAK', 'CRITICAL']).toContain(ast.baseState);
    const A = ev.byId.get('CAND_BIG')!;
    const B = ev.byId.get('CAND_PG')!;
    expect(B.fit.teamFit - A.fit.teamFit).toBeGreaterThan(1.0);
    expect(A.fit.redundancy).toBeLessThan(0);
    expect(B.fit.need).toBeGreaterThan(A.fit.need);
    expect(B.ddpRaw).toBeGreaterThan(A.ddpRaw);
    // Neutral quality is untouched by roster context.
    const neutral = run(ds, league({ draftPosition: 1 })).ev;
    expect(neutral.byId.get('CAND_PG')!.stats).toEqual(B.stats);
    expect(neutral.byId.get('CAND_PG')!.value).toEqual(B.value);
  });

  it('§60: roster moves from weak AST to elite AST → AST raw z unchanged, AST need falls, AST player DDP falls', () => {
    const ds = withSynth(synthDataset(synthPool(260)), [
      big('B1'),
      big('B2'),
      guard('G1'),
      guard('G2'),
      guard('CAND_PG'),
    ]);
    const weak = run(ds, league({ draftPosition: 1 }), {
      events: eventsFrom([
        { id: 'B1', by: 'ME' },
        { id: 'B2', by: 'ME' },
      ]),
      flags: {},
      puntOverrides: {},
    }).ev;
    const elite = run(ds, league({ draftPosition: 1 }), {
      events: eventsFrom([
        { id: 'G1', by: 'ME' },
        { id: 'G2', by: 'ME' },
      ]),
      flags: {},
      puntOverrides: {},
    }).ev;
    const w = weak.byId.get('CAND_PG')!;
    const e = elite.byId.get('CAND_PG')!;
    expect(e.stats.rawZ.AST).toBe(w.stats.rawZ.AST);
    expect(elite.profile.find((p) => p.category === 'AST')!.need).toBeLessThan(
      weak.profile.find((p) => p.category === 'AST')!.need,
    );
    expect(e.fit.perCategory.AST.need).toBeLessThan(w.fit.perCategory.AST.need);
    expect(e.ddpRaw).toBeLessThan(w.ddpRaw);
  });
});

describe('punt behavior at engine level', () => {
  it('emerging soft-punt TO reduces TO rescue (spec §50 punt fixture)', () => {
    const mine = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'];
    const ds = withSynth(synthDataset(synthPool(260)), [
      ...mine.map(usage),
      {
        id: 'SAFE_TO',
        positions: ['SF'],
        pts: 12,
        reb: 5,
        ast: 2.5,
        stl: 1,
        blk: 0.6,
        threes: 1.5,
        to: 0.6,
        fgm: 4.5,
        fga: 9.5,
        ftm: 2,
        fta: 2.5,
      },
    ]);
    const events = eventsFrom(mine.map((id) => ({ id, by: 'ME' as const })));
    const auto = run(ds, league({ draftPosition: 1 }), { events, flags: {}, puntOverrides: {} }).ev;
    const noPunt = run(ds, league({ draftPosition: 1 }), {
      events,
      flags: {},
      puntOverrides: { TO: 'NONE' },
    }).ev;
    const to = auto.profile.find((p) => p.category === 'TO')!;
    expect(to.punt.pi).toBeGreaterThanOrEqual(0.5);
    expect(to.need).toBeLessThan(noPunt.profile.find((p) => p.category === 'TO')!.need);
    const rescueAuto = auto.byId.get('SAFE_TO')!.fit.perCategory.TO.need;
    const rescueNone = noPunt.byId.get('SAFE_TO')!.fit.perCategory.TO.need;
    expect(rescueAuto).toBeLessThan(rescueNone);
  });

  it('§60: TO hard punt keeps raw TO z, zeroes TO in fit, lifts high-usage players', () => {
    const ds = withSynth(synthDataset(synthPool(260)), [usage('CAND_U'), usage('X1')]);
    const events = eventsFrom([
      { id: 'X1', by: 'ME' },
      ...Array.from({ length: 5 }, (_, i) => ({ id: `S02${i}0`, by: 'ME' as const })),
    ]);
    const base = run(ds, league({ draftPosition: 1 }), {
      events,
      flags: {},
      puntOverrides: { TO: 'NONE' },
    }).ev;
    const hard = run(ds, league({ draftPosition: 1 }), {
      events,
      flags: {},
      puntOverrides: { TO: 'HARD' },
    }).ev;
    const b = base.byId.get('CAND_U')!;
    const h = hard.byId.get('CAND_U')!;
    expect(h.stats.rawZ.TO).toBe(b.stats.rawZ.TO);
    expect(h.stats.cappedZ.TO).toBe(b.stats.cappedZ.TO);
    expect(hard.profile.find((p) => p.category === 'TO')!.effectiveWeight).toBe(0);
    expect(h.fit.perCategory.TO.need).toBeCloseTo(0, 12);
    expect(h.fit.punt).toBeGreaterThan(0);
    expect(h.ddpRaw).toBeGreaterThan(b.ddpRaw);
  });

  it('T-PUNT-REC-3: no self-reinforcing punt — ignoring AST while AST supply stays abundant', () => {
    const bigs = Array.from({ length: 7 }, (_, i) => big(`BIG${i}`));
    // Abundant AND draftable AST supply: these guards are strong enough to sit in the top-3N by BPV.
    const pgs = Array.from({ length: 18 }, (_, i) => ({
      ...guard(`PG${i}`),
      ast: 9.5,
      pts: 21,
      fgm: 8.2,
      fga: 16,
      ftm: 3.6,
      fta: 4,
    }));
    const ds = withSynth(synthDataset(synthPool(260)), [...bigs, ...pgs]);
    for (let k = 1; k <= 7; k++) {
      const events = eventsFrom(bigs.slice(0, k).map((b) => ({ id: b.id!, by: 'ME' as const })));
      const ev = run(ds, league({ draftPosition: 1 }), { events, flags: {}, puntOverrides: {} }).ev;
      const ast = ev.profile.find((p) => p.category === 'AST')!;
      if (process.env.DBG)
        console.log(
          k,
          ast.d,
          ast.punt.required,
          ast.punt.gain,
          ast.punt.recoverability,
          ast.punt.pi,
          ev.byId.get('PG0')?.ddpRank,
        );
      expect(ast.punt.recoverability).toBeGreaterThan(0.6);
      expect(ast.punt.pi).toBeLessThan(0.5);
      if (k >= 3) expect(ast.need).toBeGreaterThan(0.3);
    }
  });
});
