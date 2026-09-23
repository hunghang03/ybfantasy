import { describe, expect, it } from 'vitest';
import { overallPickFor, pickTiming, roundOfPick, slotOwningPick, userPicks, validateSnake } from '@/domain/draft/snake';

describe('snake draft', () => {
  it('14 teams, slot 11: matches the spec sequence', () => {
    expect(userPicks({ teams: 14, slot: 11, rounds: 13 })).toEqual([
      11, 18, 39, 46, 67, 74, 95, 102, 123, 130, 151, 158, 179,
    ]);
  });

  for (const teams of [10, 12, 14]) {
    const middle = Math.ceil(teams / 2);
    for (const slot of [1, middle, teams]) {
      it(`${teams} teams slot ${slot}: one pick per round, correct snake order`, () => {
        const picks = userPicks({ teams, slot, rounds: 13 });
        expect(picks).toHaveLength(13);
        picks.forEach((p, i) => {
          const round = i + 1;
          expect(roundOfPick(p, teams)).toBe(round);
          expect(slotOwningPick(p, teams)).toBe(slot);
          const expected = round % 2 === 1 ? (round - 1) * teams + slot : round * teams - slot + 1;
          expect(p).toBe(expected);
        });
        // every overall pick in a round belongs to exactly one slot
        for (let r = 1; r <= 13; r++) {
          const owners = new Set<number>();
          for (let o = (r - 1) * teams + 1; o <= r * teams; o++) owners.add(slotOwningPick(o, teams));
          expect(owners.size).toBe(teams);
        }
      });
    }
  }

  it('slot 1 and slot N alternate long/short gaps; slot 1 gets back-to-back turns', () => {
    const first = userPicks({ teams: 12, slot: 1, rounds: 4 });
    expect(first).toEqual([1, 24, 25, 48]);
    const last = userPicks({ teams: 12, slot: 12, rounds: 4 });
    expect(last).toEqual([12, 13, 36, 37]);
  });

  it('pick timing on the clock', () => {
    const t = pickTiming({ teams: 14, slot: 11, rounds: 13 }, 67);
    expect(t.onTheClock).toBe(true);
    expect(t.p0).toBe(67);
    expect(t.p1).toBe(74);
    expect(t.picksBeforeNext).toBe(6);
    expect(t.gapType).toBe('SHORT');
    expect(t.currentRound).toBe(5);
  });

  it('pick timing off the clock', () => {
    const t = pickTiming({ teams: 14, slot: 11, rounds: 13 }, 60);
    expect(t.onTheClock).toBe(false);
    expect(t.p0).toBe(67);
    expect(t.p1).toBe(74);
    expect(t.picksBeforeNext).toBe(7);
  });

  it('long gap classification', () => {
    const t = pickTiming({ teams: 14, slot: 11, rounds: 13 }, 18);
    expect(t.p1).toBe(39);
    expect(t.gapType).toBe('LONG');
    const even = pickTiming({ teams: 13, slot: 7, rounds: 13 }, 7);
    expect(even.gapType).toBe('EVEN');
  });

  it('final pick and completed draft', () => {
    const last = pickTiming({ teams: 14, slot: 11, rounds: 13 }, 179);
    expect(last.p1).toBeNull();
    const done = pickTiming({ teams: 14, slot: 11, rounds: 13 }, 183);
    expect(done.draftComplete).toBe(true);
    expect(done.p0).toBeNull();
  });

  it('validation', () => {
    expect(validateSnake({ teams: 14, slot: 15, rounds: 13 })).not.toHaveLength(0);
    expect(validateSnake({ teams: 14, slot: 14, rounds: 13 })).toHaveLength(0);
    expect(overallPickFor(10, 3, 2)).toBe(18);
  });
});
