import type { DraftEvent, PickEvent, PickSnapshot, ResyncEvent, VoidEvent } from '../types/league';
import { totalPicks } from './snake';

/**
 * Event-sourced draft state (DESIGN §8.1). The authoritative record is the event list;
 * everything here is derived by replay, so undo = drop the last event.
 */

export interface DraftState {
  currentOverall: number;
  /** All unavailable player ids (drafted by anyone, advancing or not). */
  drafted: Set<string>;
  /** My roster, in draft order. */
  myPicks: { playerId: string; overallPick: number | null; seq: number; snapshot?: PickSnapshot }[];
  /** Number of picks recorded (advancing or catch-up), excluding voided picks. */
  accountedPicks: number;
  /** currentOverall − 1 − accountedPicks: slots on the clock with no recorded player (after a resync or void). */
  unrecordedPicks: number;
  offSchedulePicks: number[];
}

export function replay(events: readonly DraftEvent[], userPickSet?: ReadonlySet<number>): DraftState {
  let current = 1;
  const drafted = new Set<string>();
  const myPicks: DraftState['myPicks'] = [];
  let accounted = 0;
  const offSchedule: number[] = [];
  const voided = new Set<number>();
  for (const e of events) if (e.type === 'VOID') voided.add(e.targetSeq);
  for (const e of events) {
    if (e.type === 'VOID') continue;
    if (e.type === 'PICK' && voided.has(e.seq)) {
      // A voided pick still consumed its slot on the clock (someone picked there), so it keeps advancing.
      if (e.advance) current += 1;
      continue;
    }
    if (e.type === 'PICK') {
      drafted.add(e.playerId);
      // Every recorded pick accounts for one slot on the clock — including catch-up picks that
      // do not advance (they fill slots skipped by a RESYNC).
      accounted += 1;
      if (e.advance) current += 1;
      if (e.by === 'ME') {
        myPicks.push({ playerId: e.playerId, overallPick: e.overallPick, seq: e.seq, snapshot: e.snapshot });
        if (userPickSet && e.overallPick !== null && !userPickSet.has(e.overallPick)) offSchedule.push(e.overallPick);
      }
    } else {
      current = e.setCurrentOverall;
    }
  }
  return {
    currentOverall: current,
    drafted,
    myPicks,
    accountedPicks: accounted,
    unrecordedPicks: current - 1 - accounted,
    offSchedulePicks: offSchedule,
  };
}

function nextSeq(events: readonly DraftEvent[]): number {
  return events.length === 0 ? 1 : events[events.length - 1]!.seq + 1;
}

export type EventResult = { ok: true; events: DraftEvent[] } | { ok: false; error: string };

export interface PickInput {
  playerId: string;
  by: 'ME' | 'OTHER';
  advance?: boolean;
  snapshot?: PickSnapshot;
  at?: string;
}

/** Append a pick. Rejects a player that is already unavailable, or a pick past the end of the draft. */
export function appendPick(
  events: readonly DraftEvent[],
  input: PickInput,
  teams: number,
  rounds: number,
): EventResult {
  const state = replay(events);
  if (state.drafted.has(input.playerId)) return { ok: false, error: 'Player is already drafted.' };
  const advance = input.advance ?? true;
  if (advance && state.currentOverall > totalPicks(teams, rounds))
    return { ok: false, error: 'The draft is complete; no picks remain.' };
  if (input.by === 'ME' && state.myPicks.length >= rounds)
    return { ok: false, error: 'Your roster is full.' };
  const ev: PickEvent = {
    seq: nextSeq(events),
    at: input.at ?? new Date().toISOString(),
    type: 'PICK',
    playerId: input.playerId,
    by: input.by,
    advance,
    overallPick: advance ? state.currentOverall : null,
    ...(input.snapshot ? { snapshot: input.snapshot } : {}),
  };
  return { ok: true, events: [...events, ev] };
}

/** Set the current overall pick to match Yahoo (R2-5). Valid range 1 … totalPicks + 1. */
export function appendResync(
  events: readonly DraftEvent[],
  setCurrentOverall: number,
  teams: number,
  rounds: number,
  at?: string,
): EventResult {
  const max = totalPicks(teams, rounds) + 1;
  if (!Number.isInteger(setCurrentOverall) || setCurrentOverall < 1 || setCurrentOverall > max)
    return { ok: false, error: `Current pick must be an integer between 1 and ${max}.` };
  const state = replay(events);
  if (state.currentOverall === setCurrentOverall) return { ok: false, error: 'Already at that pick.' };
  const ev: ResyncEvent = {
    seq: nextSeq(events),
    at: at ?? new Date().toISOString(),
    type: 'RESYNC',
    setCurrentOverall,
    previousCurrentOverall: state.currentOverall,
  };
  return { ok: true, events: [...events, ev] };
}

/** Undo = drop the last event. Returns the same array when empty. */
export function undoLast(events: readonly DraftEvent[]): DraftEvent[] {
  return events.slice(0, Math.max(0, events.length - 1));
}

/**
 * Void one specific earlier pick (a mis-click found later). The player becomes available again and
 * the draft clock does not move. It is a normal event, so undo restores the pick exactly.
 */
export function appendVoid(events: readonly DraftEvent[], targetSeq: number, at?: string): EventResult {
  const target = events.find((e) => e.seq === targetSeq);
  if (!target || target.type !== 'PICK') return { ok: false, error: 'No such pick.' };
  if (events.some((e) => e.type === 'VOID' && e.targetSeq === targetSeq))
    return { ok: false, error: 'Pick already removed.' };
  const ev: VoidEvent = { seq: nextSeq(events), at: at ?? new Date().toISOString(), type: 'VOID', targetSeq };
  return { ok: true, events: [...events, ev] };
}
