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

describe('catch-up accounting (Codex QA blocker 2)', () => {
  const T2 = 14;
  const R2 = 13;
  const tryPick = (e: DraftEvent[], id: string, advance: boolean) =>
    appendPick(e, { playerId: id, by: 'OTHER', advance, at }, T2, R2);

  it('catch-up without an unrecorded slot is rejected', () => {
    expect(tryPick([], 'x', false).ok).toBe(false);
    const e = pick([], 'a');
    expect(tryPick(e, 'x', false).ok).toBe(false);
  });

  it('resync forward by 2 → exactly two catch-up picks accepted, the third rejected', () => {
    let e = pick(pick([], 'a'), 'b'); // current 3
    const r = appendResync(e, 5, T2, R2, at);
    if (!r.ok) throw new Error(r.error);
    e = r.events;
    expect(replay(e).unrecordedPicks).toBe(2);
    const c1 = tryPick(e, 'c', false);
    expect(c1.ok).toBe(true);
    if (!c1.ok) return;
    const c2 = tryPick(c1.events, 'd', false);
    expect(c2.ok).toBe(true);
    if (!c2.ok) return;
    expect(replay(c2.events).unrecordedPicks).toBe(0);
    expect(replay(c2.events).currentOverall).toBe(5);
    expect(tryPick(c2.events, 'e', false).ok).toBe(false);
  });

  it('a voided advancing pick opens exactly one catch-up slot', () => {
    let e = pick(pick([], 'a'), 'b');
    const v = appendVoid(e, e[1]!.seq, at);
    if (!v.ok) throw new Error(v.error);
    e = v.events;
    expect(replay(e).unrecordedPicks).toBe(1);
    const c = tryPick(e, 'z', false);
    expect(c.ok).toBe(true);
    if (c.ok) expect(tryPick(c.events, 'y', false).ok).toBe(false);
  });

  it('resync cannot move behind already-recorded picks', () => {
    let e: DraftEvent[] = [];
    for (let i = 0; i < 5; i++) e = pick(e, `p${i}`); // 5 recorded, current 6
    expect(appendResync(e, 5, T2, R2, at).ok).toBe(false);
    expect(appendResync(e, 3, T2, R2, at).ok).toBe(false);
    expect(appendResync(e, 8, T2, R2, at).ok).toBe(true);
  });

  it('unrecorded count is never negative across randomized valid action sequences; undo restores exact state', () => {
    let seed = 42;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    let e: DraftEvent[] = [];
    const history: string[] = [];
    let n = 0;
    for (let step = 0; step < 400; step++) {
      const before = JSON.stringify(e);
      const roll = rnd();
      let next: DraftEvent[] | null = null;
      if (roll < 0.45) {
        const r = appendPick(e, { playerId: `p${n++}`, by: rnd() < 0.1 ? 'ME' : 'OTHER', at }, T2, R2);
        if (r.ok) next = r.events;
      } else if (roll < 0.65) {
        const r = tryPick(e, `p${n++}`, false);
        if (r.ok) next = r.events;
      } else if (roll < 0.8) {
        const st = replay(e);
        const r = appendResync(e, st.currentOverall + Math.floor(rnd() * 7) - 3, T2, R2, at);
        if (r.ok) next = r.events;
      } else if (roll < 0.87) {
        const picks = e.filter((x) => x.type === 'PICK');
        const target = picks[Math.floor(rnd() * picks.length)];
        if (target) {
          const r = appendVoid(e, target.seq, at);
          if (r.ok) next = r.events;
        }
      } else if (e.length > 0) {
        // undo must restore exactly the state before the last accepted action
        const restored = undoLast(e);
        expect(JSON.stringify(restored)).toBe(history[history.length - 1]);
        history.pop();
        e = restored;
        continue;
      }
      if (next) {
        history.push(before);
        e = next;
      }
      const st = replay(e);
      expect(st.unrecordedPicks).toBeGreaterThanOrEqual(0);
      expect(st.accountedPicks).toBeLessThanOrEqual(st.currentOverall - 1);
    }
  });

  it('undo → resync → catch-up sequence restores the exact state', () => {
    let e = pick(pick(pick([], 'a'), 'b'), 'c'); // current 4
    const snap0 = JSON.stringify(e);
    const r = appendResync(e, 7, T2, R2, at);
    if (!r.ok) throw new Error(r.error);
    const snap1 = JSON.stringify(r.events);
    const c = tryPick(r.events, 'd', false);
    if (!c.ok) throw new Error(c.error);
    e = undoLast(c.events);
    expect(JSON.stringify(e)).toBe(snap1);
    expect(replay(e).unrecordedPicks).toBe(3);
    e = undoLast(e);
    expect(JSON.stringify(e)).toBe(snap0);
    expect(replay(e)).toEqual(replay(JSON.parse(snap0)));
  });
});
