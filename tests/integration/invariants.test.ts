import { describe, expect, it } from 'vitest';
import { appendPick, undoLast } from '@/domain/draft/replay';
import type { Dataset } from '@/domain/types/data';
import type { DraftEvent, LeagueDraft } from '@/domain/types/league';
import { compareEvaluations } from '@/domain/recommendations/compare';
import { createMemoryRepository } from '@/persistence/memoryRepository';
import { league, run, sampleDataset } from '../helpers/fixtures';

function othersTake(ds: Dataset, n: number, start: DraftEvent[] = []): DraftEvent[] {
  const order = [...ds.market].filter((m) => m.yahooAdp7d !== null).sort((a, b) => a.yahooAdp7d! - b.yahooAdp7d!);
  let e = start;
  let i = 0;
  while (e.filter((x) => x.type === 'PICK').length < start.length + n) {
    const r = appendPick(e, { playerId: order[i++]!.canonicalPlayerId, by: 'OTHER', at: 't' }, 14, 13);
    if (r.ok) e = r.events;
  }
  return e;
}

const strip = (x: unknown) => JSON.parse(JSON.stringify(x, (_k, v) => (v instanceof Map ? undefined : v)));

describe('engine invariants (§53 / §60)', () => {
  const ds = sampleDataset();

  it('deterministic: identical input → identical output', () => {
    const e = othersTake(ds, 10);
    const a = run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev;
    const b = run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev;
    expect(strip(a)).toEqual(strip(b));
  });

  it('draft position change: timing changes, neutral quality (stats, BPV) does not', () => {
    const e = othersTake(ds, 20);
    const a = run(ds, league({ draftPosition: 11 }), { events: e, flags: {}, puntOverrides: {} });
    const b = run(ds, league({ draftPosition: 4 }), { events: e, flags: {}, puntOverrides: {} });
    expect(a.ev.timing.p0).not.toBe(b.ev.timing.p0);
    for (const p of a.ev.players) {
      const q = b.ev.byId.get(p.playerId)!;
      expect(q.stats).toEqual(p.stats);
      expect(q.value).toEqual(p.value);
    }
  });

  it('primary projection source change: statistical value may change, market fields never do', () => {
    const a = run(ds, league({ primaryProjectionProvider: 'hashtag' })).ev;
    const b = run(ds, league({ primaryProjectionProvider: 'bbm', validationProviders: ['hashtag'] })).ev;
    let statsDiffer = 0;
    for (const p of a.players) {
      const q = b.byId.get(p.playerId);
      if (!q) continue;
      expect([q.market.adp, q.market.xrank, q.market.rank]).toEqual([p.market.adp, p.market.xrank, p.market.rank]);
      if (q.value.basePlayerValue !== p.value.basePlayerValue) statsDiffer++;
    }
    expect(statsDiffer).toBeGreaterThan(0);
  });

  it('a player drafted by others keeps his source data; only availability-dependent values change', () => {
    const before = run(ds, league());
    const target = before.ev.players[0]!.playerId;
    const r = appendPick([], { playerId: target, by: 'OTHER', at: 't' }, 14, 13);
    if (!r.ok) throw new Error();
    const after = run(ds, league(), { events: r.events, flags: {}, puntOverrides: {} });
    expect(after.ctx.byId.get(target)).toEqual(before.ctx.byId.get(target));
    expect(after.ev.byId.has(target)).toBe(false);
  });

  it('flags never alter statistics, BPV or TeamFit; DND is excluded from recommendations', () => {
    const base = run(ds, league()).ev;
    const [p1, p2, p3] = base.players;
    const flags = {
      [p1!.playerId]: { favorite: false, avoid: false, doNotDraft: true, lockTarget: false },
      [p2!.playerId]: { favorite: false, avoid: true, doNotDraft: false, lockTarget: false },
      [p3!.playerId]: { favorite: true, avoid: false, doNotDraft: false, lockTarget: true },
    };
    const f = run(ds, league(), { events: [], flags, puntOverrides: {} }).ev;
    for (const id of [p1!.playerId, p2!.playerId, p3!.playerId]) {
      const a = base.byId.get(id)!;
      const b = f.byId.get(id)!;
      expect(b.stats).toEqual(a.stats);
      expect(b.value).toEqual(a.value);
      expect(b.fit).toEqual(a.fit);
    }
    expect(f.recommendedId).not.toBe(p1!.playerId);
    expect(f.byId.get(p1!.playerId)!.label).toBe('PASS');
    expect(f.players[f.players.length - 1]!.flags.doNotDraft).toBe(true);
    expect(f.byId.get(p2!.playerId)!.adjustments.userPref).toBeLessThan(0);
    expect(f.byId.get(p3!.playerId)!.adjustments.userPref).toBeGreaterThan(0);
  });

  it('undo restores the exact previous evaluation', () => {
    const e = othersTake(ds, 10);
    const before = strip(run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev);
    const pick = run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev.recommendedId!;
    const r = appendPick(e, { playerId: pick, by: 'ME', at: 't' }, 14, 13);
    if (!r.ok) throw new Error();
    const mid = run(ds, league(), { events: r.events, flags: {}, puntOverrides: {} }).ev;
    expect(mid.k).toBe(1);
    const after = strip(run(ds, league(), { events: undoLast(r.events), flags: {}, puntOverrides: {} }).ev);
    expect(after).toEqual(before);
  });

  it('draft deviation: user drafts F instead of recommended A → next evaluation derives only from the real roster', () => {
    const e = othersTake(ds, 10);
    const ev = run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev;
    const recommended = ev.recommendedId!;
    const deviation = ev.players.find((p) => p.playerId !== recommended && p.positions.includes('C'))!.playerId;
    const r = appendPick(e, { playerId: deviation, by: 'ME', at: 't' }, 14, 13);
    if (!r.ok) throw new Error();
    const next = run(ds, league(), { events: r.events, flags: {}, puntOverrides: {} }).ev;
    expect(next.roster.map((x) => x.playerId)).toEqual([deviation]);
    expect(next.byId.has(recommended)).toBe(true);
    // Independent reconstruction of the same state gives the same answer (no hidden plan state).
    const rebuilt = run(ds, league(), { events: JSON.parse(JSON.stringify(r.events)), flags: {}, puntOverrides: {} }).ev;
    expect(strip(rebuilt)).toEqual(strip(next));
  });

  it('League A draft state cannot contaminate League B (repository + engine)', async () => {
    const repo = createMemoryRepository();
    const A = league({ id: 'A', draftPosition: 11 });
    const B = league({ id: 'B', draftPosition: 4 });
    await repo.saveLeague(A);
    await repo.saveLeague(B);
    const bBefore = strip(run(ds, B).ev);
    const draftA: LeagueDraft = { leagueId: 'A', events: othersTake(ds, 15), flags: {}, puntOverrides: { TO: 'HARD' } };
    await repo.saveDraft(draftA);
    const draftB = (await repo.getDraft('B')) ?? { leagueId: 'B', events: [], flags: {}, puntOverrides: {} };
    expect(strip(run(ds, B, draftB).ev)).toEqual(bBefore);
  });

  it('compare(A, B) explains the ranking numerically', () => {
    const ev = run(ds, league()).ev;
    const [a, b] = ev.players;
    const c = compareEvaluations(a!, b!);
    const ddpRow = c.rows.find((r) => r.term === '= DDP raw')!;
    const parts = c.rows.filter((r) => ['BPV (base player value)', 'Need', 'Punt synergy', 'Pool scarcity', 'Position', 'Multi-position', 'Redundancy', 'Playoff', 'Upside', 'Risk', 'User preference'].includes(r.term));
    expect(parts.reduce((s, r) => s + r.diff, 0)).toBeCloseTo(ddpRow.diff, 10);
    expect(c.summary).toMatch(/Largest differences/);
  });

  it('DDP decomposes exactly into its documented terms', () => {
    const ev = run(ds, league(), { events: othersTake(ds, 30), flags: {}, puntOverrides: {} }).ev;
    for (const p of ev.players.slice(0, 50)) {
      const sum = p.value.basePlayerValue + p.fit.teamFit + p.adjustments.playoff + p.adjustments.upside + p.adjustments.risk + p.adjustments.userPref;
      expect(sum).toBeCloseTo(p.ddpRaw, 10);
      expect(p.fit.need + p.fit.punt + p.fit.poolScarcity + p.fit.position + p.fit.multiPos + p.fit.redundancy).toBeCloseTo(p.fit.teamFit, 10);
    }
  });
});
