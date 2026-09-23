/**
 * Snake draft math (DESIGN §8.1). Nothing here is hard-coded to a league size or slot.
 */

export interface SnakeParams {
  teams: number;
  slot: number;
  rounds: number;
}

export function validateSnake({ teams, slot, rounds }: SnakeParams): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(teams) || teams < 2 || teams > 30) errors.push('teams must be an integer between 2 and 30');
  if (!Number.isInteger(slot) || slot < 1 || slot > teams) errors.push('draft position must be between 1 and teams');
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 40) errors.push('rounds must be an integer between 1 and 40');
  return errors;
}

/** Overall pick number for a user in a given round (1-indexed). */
export function overallPickFor(teams: number, slot: number, round: number): number {
  const pickInRound = round % 2 === 1 ? slot : teams - slot + 1;
  return (round - 1) * teams + pickInRound;
}

/** Every overall pick belonging to the user, ascending. */
export function userPicks({ teams, slot, rounds }: SnakeParams): number[] {
  const out: number[] = [];
  for (let r = 1; r <= rounds; r++) out.push(overallPickFor(teams, slot, r));
  return out;
}

export function totalPicks(teams: number, rounds: number): number {
  return teams * rounds;
}

/** Round (1-indexed) containing an overall pick. Picks past the end map to the last round. */
export function roundOfPick(overall: number, teams: number): number {
  return Math.max(1, Math.ceil(overall / teams));
}

/** Which team slot (1..teams) owns an overall pick in a snake draft. */
export function slotOwningPick(overall: number, teams: number): number {
  const round = roundOfPick(overall, teams);
  const idx = overall - (round - 1) * teams; // 1..teams
  return round % 2 === 1 ? idx : teams - idx + 1;
}

export type GapType = 'SHORT' | 'EVEN' | 'LONG';

export interface PickTiming {
  currentOverall: number;
  currentRound: number;
  draftComplete: boolean;
  onTheClock: boolean;
  /** Next user pick at or after current (P0). */
  p0: number | null;
  /** The user pick after P0 (P1). */
  p1: number | null;
  /** Picks by other teams before my next pick. */
  picksBeforeNext: number;
  /** Gap between P0 and P1 (others' picks), used for survival and scarcity. */
  gapAfterP0: number;
  gapType: GapType | null;
  roundOfP0: number | null;
}

/**
 * Pick timing from the current overall pick.
 * - P0 = first user pick ≥ current (current itself when on the clock).
 * - P1 = first user pick > P0.
 * - g (`picksBeforeNext`) = picks by others before my next pick:
 *     on the clock → P1 − P0 − 1; otherwise → P0 − current.
 * - gapType classifies the P0→P1 gap: (P1 − P0) vs teams.
 */
export function pickTiming(params: SnakeParams, currentOverall: number): PickTiming {
  const picks = userPicks(params);
  const total = totalPicks(params.teams, params.rounds);
  const draftComplete = currentOverall > total;
  const p0 = picks.find((p) => p >= currentOverall) ?? null;
  const p1 = p0 === null ? null : (picks.find((p) => p > p0) ?? null);
  const onTheClock = p0 === currentOverall;
  let picksBeforeNext = 0;
  if (p0 !== null) picksBeforeNext = onTheClock ? (p1 !== null ? p1 - p0 - 1 : 0) : p0 - currentOverall;
  const gapAfterP0 = p0 !== null && p1 !== null ? p1 - p0 - 1 : 0;
  let gapType: GapType | null = null;
  if (p0 !== null && p1 !== null) {
    const span = p1 - p0;
    gapType = span > params.teams ? 'LONG' : span < params.teams ? 'SHORT' : 'EVEN';
  }
  return {
    currentOverall,
    currentRound: Math.min(roundOfPick(currentOverall, params.teams), params.rounds),
    draftComplete,
    onTheClock,
    p0,
    p1,
    picksBeforeNext,
    gapAfterP0,
    gapType,
    roundOfP0: p0 === null ? null : roundOfPick(p0, params.teams),
  };
}
