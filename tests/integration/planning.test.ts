import { describe, expect, it } from 'vitest';
import { appendPick } from '@/domain/draft/replay';
import type { Dataset } from '@/domain/types/data';
import type { DraftEvent } from '@/domain/types/league';
import { league, run, synthDataset, synthPool, withSynth, type SynthSpec } from '../helpers/fixtures';

const star = (id: string, scale: number, adp: number): SynthSpec => ({
  id,
  positions: ['SF'],
  gp: 76,
  pts: 26 * scale,
  reb: 8 * scale,
  ast: 6 * scale,
  stl: 1.6 * scale,
  blk: 1.0 * scale,
  threes: 2.8 * scale,
  to: 2.4,
  fgm: 9.6 * scale,
  fga: 18.5 * scale,
  ftm: 5.5 * scale,
  fta: 6.2 * scale,
  adp,
});

/** On the clock at pick 11 (14 teams, slot 11) after others take the 10 lowest-ADP pool players. */
function atPick11(ds: Dataset): DraftEvent[] {
  const order = ds.market.filter((m) => m.canonicalPlayerId.startsWith('S')).sort((a, b) => a.yahooAdp7d! - b.yahooAdp7d!);
  let e: DraftEvent[] = [];
  for (let i = 0; i < 10; i++) {
    const r = appendPick(e, { playerId: order[i]!.canonicalPlayerId, by: 'OTHER', at: 't' }, 14, 13);
    if (r.ok) e = r.events;
  }
  return e;
}

describe('pick-pair ordering (deterministic, ordinal)', () => {
  it('take the at-risk star now when the slightly better star will safely last', () => {
    // Pool ADPs start at 1; shift pool so its players do not collide with the stars' ADP.
    const pool = synthPool(250).map((s) => ({ ...s, adp: (s.adp ?? 0) + 5 }));
    const ds = withSynth(synthDataset(pool), [star('AT_RISK', 1.0, 12), star('SAFE_BETTER', 1.02, 60), star('SAFE_OTHER', 0.9, 70)]);
    const ev = run(ds, league(), { events: atPick11(ds), flags: {}, puntOverrides: {} }).ev;
    expect(ev.timing.onTheClock).toBe(true);
    const a = ev.byId.get('AT_RISK')!;
    const b = ev.byId.get('SAFE_BETTER')!;
    expect(b.ddpRaw).toBeGreaterThan(a.ddpRaw);
    expect(a.market.band).toBe('UNLIKELY');
    expect(b.market.band).toBe('SAFE');
    expect(ev.recommendedId).toBe('AT_RISK');
    expect(a.planning!.nextBestConservative.playerId).toBe('SAFE_BETTER');
    expect(['DRAFT_NOW', 'LEAN_DRAFT']).toContain(a.label);
    expect(b.label).toBe('SAFE_WAIT');
  });

  it('when both stars are safe, take the better one now', () => {
    const pool = synthPool(250).map((s) => ({ ...s, adp: (s.adp ?? 0) + 5 }));
    const ds = withSynth(synthDataset(pool), [star('SAFE_A', 1.0, 60), star('SAFE_B', 1.05, 62)]);
    const ev = run(ds, league(), { events: atPick11(ds), flags: {}, puntOverrides: {} }).ev;
    expect(ev.byId.get('SAFE_A')!.market.band).toBe('SAFE');
    expect(ev.byId.get('SAFE_B')!.market.band).toBe('SAFE');
    expect(ev.recommendedId).toBe('SAFE_B');
  });

  it('the recommended player is always LEAN-DRAFT quality on its own when such players exist', async () => {
    const { sampleDataset } = await import('../helpers/fixtures');
    const ds = sampleDataset();
    const order = [...ds.market].filter((m) => m.yahooAdp7d !== null).sort((a, b) => a.yahooAdp7d! - b.yahooAdp7d!);
    let e: DraftEvent[] = [];
    for (let n = 0; n < 120; n++) {
      const ev = run(ds, league(), { events: e, flags: {}, puntOverrides: {} }).ev;
      if (ev.recommendedId) {
        const rec = ev.byId.get(ev.recommendedId)!;
        const anyQualified = ev.players.some((p) => p.planning && p.ddpRel >= 0.75);
        if (anyQualified) expect(rec.ddpRel).toBeGreaterThanOrEqual(0.75);
      }
      const next = order.find((m) => !e.some((x) => x.type === 'PICK' && x.playerId === m.canonicalPlayerId))!;
      const r = appendPick(e, { playerId: ev.timing.onTheClock ? ev.recommendedId! : next.canonicalPlayerId, by: ev.timing.onTheClock ? 'ME' : 'OTHER', at: 't' }, 14, 13);
      if (r.ok) e = r.events;
    }
  }, 60_000);
});
