import { describe, expect, it } from 'vitest';
import { appendPick, appendResync, appendVoid, replay, undoLast } from '@/domain/draft/replay';
import { pickTiming } from '@/domain/draft/snake';
import type { DraftEvent } from '@/domain/types/league';

const T = 14;
const R = 13;
const at = '2026-01-01T00:00:00.000Z';

function pick(events: DraftEvent[], id: string, by: 'ME' | 'OTHER' = 'OTHER', advance = true): DraftEvent[] {
  const r = appendPick(events, { playerId: id, by, advance, at }, T, R);
  if (!r.ok) throw new Error(r.error);
  return r.events;
}

describe('event history', () => {
  it('advancing picks move the clock; mine join the roster', () => {
    let e: DraftEvent[] = [];
    for (let i = 0; i < 10; i++) e = pick(e, `p${i}`);
    e = pick(e, 'mine', 'ME');
    const s = replay(e);
    expect(s.currentOverall).toBe(12);
    expect(s.myPicks.map((p) => p.playerId)).toEqual(['mine']);
    expect(s.myPicks[0]!.overallPick).toBe(11);
    expect(s.drafted.size).toBe(11);
  });

  it('rejects double-drafting a player', () => {
    const e = pick([], 'x');
    expect(appendPick(e, { playerId: 'x', by: 'ME', at }, T, R).ok).toBe(false);
  });

  it('undo restores the exact previous state (multiple levels)', () => {
    let e: DraftEvent[] = [];
    const snapshots: string[] = [];
    for (let i = 0; i < 5; i++) {
      snapshots.push(JSON.stringify(e));
      e = pick(e, `p${i}`, i === 2 ? 'ME' : 'OTHER');
    }
    for (let i = 4; i >= 0; i--) {
      e = undoLast(e);
      expect(JSON.stringify(e)).toBe(snapshots[i]);
    }
    expect(undoLast([])).toEqual([]);
  });

  it('VOID removes a pick without moving the clock and is undoable', () => {
    let e = pick([], 'a');
    e = pick(e, 'b', 'ME');
    e = pick(e, 'c');
    const before = replay(e);
    const v = appendVoid(e, e[1]!.seq, at);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const after = replay(v.events);
    expect(after.currentOverall).toBe(before.currentOverall);
    expect(after.drafted.has('b')).toBe(false);
    expect(after.myPicks).toHaveLength(0);
    expect(after.unrecordedPicks).toBe(1);
    expect(JSON.stringify(undoLast(v.events))).toBe(JSON.stringify(e));
  });
});

describe('manual resync (T-RESYNC-1/2)', () => {
  it('resync restores correct next-pick calculations after missed picks', () => {
    // Reference: all 66 picks recorded.
    let full: DraftEvent[] = [];
    for (let i = 1; i <= 66; i++) full = pick(full, `p${i}`);
    // Local log missed 6 picks (p61..p66).
    let partial: DraftEvent[] = [];
    for (let i = 1; i <= 60; i++) partial = pick(partial, `p${i}`);
    expect(replay(partial).currentOverall).toBe(61);
    const r = appendResync(partial, 67, T, R, at);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = replay(r.events);
    expect(s.currentOverall).toBe(67);
    expect(s.unrecordedPicks).toBe(6);
    const tFull = pickTiming({ teams: T, slot: 11, rounds: R }, replay(full).currentOverall);
    const tSync = pickTiming({ teams: T, slot: 11, rounds: R }, s.currentOverall);
    expect(tSync).toEqual(tFull);
    expect(tSync.p0).toBe(67);
    expect(tSync.p1).toBe(74);
    expect(tSync.picksBeforeNext).toBe(6);
    expect(tSync.gapType).toBe('SHORT');
    // catch-up marks without advancing
    let e = r.events;
    for (let i = 61; i <= 66; i++) e = pick(e, `p${i}`, 'OTHER', false);
    const caught = replay(e);
    expect(caught.currentOverall).toBe(67);
    expect(caught.unrecordedPicks).toBe(0);
    expect(caught.drafted).toEqual(replay(full).drafted);
    // undo the RESYNC (after undoing catch-ups) restores current = 61 exactly
    let u = e;
    for (let i = 0; i < 6; i++) u = undoLast(u);
    u = undoLast(u);
    expect(JSON.stringify(u)).toBe(JSON.stringify(partial));
    expect(replay(u).currentOverall).toBe(61);
  });

  it('rejects out-of-range resync', () => {
    expect(appendResync([], 0, T, R).ok).toBe(false);
    expect(appendResync([], T * R + 2, T, R).ok).toBe(false);
    expect(appendResync([], T * R + 1, T, R).ok).toBe(true);
    expect(appendResync([], 1.5, T, R).ok).toBe(false);
  });

  it('changing draft position after resync recomputes P0/P1 from the same current pick', () => {
    const r = appendResync([], 30, T, R, at);
    if (!r.ok) throw new Error();
    const cur = replay(r.events).currentOverall;
    expect(pickTiming({ teams: T, slot: 11, rounds: R }, cur).p0).toBe(39);
    expect(pickTiming({ teams: T, slot: 4, rounds: R }, cur).p0).toBe(32);
  });
});
