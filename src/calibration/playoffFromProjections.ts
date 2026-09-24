import type { PlayerIdentity, ProjectionLine, TeamPlayoffSchedule } from '@/domain/types/data';

/**
 * Derive a team-level playoff schedule from provider per-player week-game columns (e.g. Hashtag
 * W18–W21). For each team and week the MODE of its players' values is used (ties → the larger
 * value); disagreements inside a team are reported, never silently averaged.
 */
export function derivePlayoffSchedule(
  projections: readonly ProjectionLine[],
  identities: readonly PlayerIdentity[],
  provider: string,
  season: string,
  importBatchId: string,
): { schedule: TeamPlayoffSchedule[]; conflicts: { team: string; week: number; values: number[] }[] } {
  const teamOf = new Map(identities.map((i) => [i.canonicalPlayerId, i.nbaTeam]));
  const byTeamWeek = new Map<string, Map<number, number[]>>();
  for (const p of projections) {
    if (p.provider !== provider || !p.weekGames) continue;
    const team = teamOf.get(p.canonicalPlayerId);
    if (!team) continue;
    const weeks = byTeamWeek.get(team) ?? new Map<number, number[]>();
    for (const [w, g] of Object.entries(p.weekGames)) {
      const arr = weeks.get(Number(w)) ?? [];
      arr.push(g);
      weeks.set(Number(w), arr);
    }
    byTeamWeek.set(team, weeks);
  }
  const schedule: TeamPlayoffSchedule[] = [];
  const conflicts: { team: string; week: number; values: number[] }[] = [];
  for (const team of [...byTeamWeek.keys()].sort()) {
    const gamesByWeek: Record<number, number> = {};
    for (const [week, values] of [...byTeamWeek.get(team)!.entries()].sort((a, b) => a[0] - b[0])) {
      const counts = new Map<number, number>();
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      const mode = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]![0];
      gamesByWeek[week] = mode;
      if (counts.size > 1) conflicts.push({ team, week, values: [...new Set(values)].sort() });
    }
    schedule.push({ nbaTeam: team, season, importBatchId, gamesByWeek });
  }
  return { schedule, conflicts };
}
