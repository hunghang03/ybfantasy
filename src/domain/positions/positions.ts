import type { StrategyConfig } from '../config/strategyConfig';
import { clamp01 } from '../numeric/safe';
import { ACTIVE_SLOTS, POSITIONS, SLOT_ELIGIBILITY, type Position } from '../types/core';
import type { PositionReport } from '../types/evaluation';
import { activeSlotCount, type RosterSettings } from '../types/league';

/**
 * Roster-slot feasibility and positional urgency (DESIGN §6.7).
 * Maximum bipartite matching (Kuhn's augmenting paths) of players → active slot instances.
 */

export function slotInstances(roster: RosterSettings): readonly Position[][] {
  const out: Position[][] = [];
  for (const s of ACTIVE_SLOTS) for (let i = 0; i < roster.active[s]; i++) out.push([...SLOT_ELIGIBILITY[s]]);
  return out;
}

export function maxMatching(players: readonly (readonly Position[])[], slots: readonly (readonly Position[])[]): number {
  const slotOwner = new Array<number>(slots.length).fill(-1);
  const canFill = (pi: number, si: number) => players[pi]!.some((p) => slots[si]!.includes(p));
  const tryAssign = (pi: number, seen: boolean[]): boolean => {
    for (let si = 0; si < slots.length; si++) {
      if (seen[si] || !canFill(pi, si)) continue;
      seen[si] = true;
      if (slotOwner[si] === -1 || tryAssign(slotOwner[si]!, seen)) {
        slotOwner[si] = pi;
        return true;
      }
    }
    return false;
  };
  let matched = 0;
  for (let pi = 0; pi < players.length; pi++) if (tryAssign(pi, new Array<boolean>(slots.length).fill(false))) matched++;
  return matched;
}

export function positionReport(
  rosterPositions: readonly (readonly Position[])[],
  roster: RosterSettings,
  totalRounds: number,
): PositionReport {
  const slots = slotInstances(roster);
  const active = activeSlotCount(roster);
  const remaining = Math.max(0, totalRounds - rosterPositions.length);
  const filled = maxMatching(rosterPositions, slots);
  const wildcards = Array.from({ length: remaining }, () => [...POSITIONS]);
  const feasible = maxMatching([...rosterPositions, ...wildcards], slots) >= active;
  const required = {} as Record<Position, number>;
  const urgency = {} as Record<Position, number>;
  for (const p of POSITIONS) {
    const dummies = Array.from({ length: remaining }, () => POSITIONS.filter((x) => x !== p));
    const req = Math.max(0, active - maxMatching([...rosterPositions, ...dummies], slots));
    required[p] = req;
    urgency[p] = remaining > 0 ? clamp01(req / remaining) : 0;
  }
  return { feasible, remainingPicks: remaining, required, urgency, filledSlots: filled, activeSlots: active };
}

/** Positional adjustment fraction of U for a player with the given eligibility. */
export function positionFraction(positions: readonly Position[], report: PositionReport, config: StrategyConfig): {
  urgency: number;
  fraction: number;
  multiPosFraction: number;
} {
  const u = positions.length ? Math.max(...positions.map((p) => report.urgency[p])) : 0;
  const fraction = config.positionalWeight * u + config.positionalDangerWeight * Math.max(0, (u - 0.5) / 0.5);
  const multiPosFraction = Math.min(config.multiPositionBonusCap, config.multiPositionBonus * Math.max(0, positions.length - 1));
  return { urgency: u, fraction, multiPosFraction };
}
