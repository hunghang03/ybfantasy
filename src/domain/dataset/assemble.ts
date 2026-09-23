import type { StrategyConfig } from '../config/strategyConfig';
import type { Dataset } from '../types/data';
import type { EnginePlayer } from '../types/evaluation';
import type { LeagueProfile } from '../types/league';

/**
 * Join identity + source records into EnginePlayer views for one league.
 * Sources stay separate: the primary projection is chosen by provider, validation lines are kept
 * alongside, market data is never merged into projections.
 */
export function assemblePlayers(dataset: Dataset, league: LeagueProfile, config: StrategyConfig): EnginePlayer[] {
  const proj = new Map<string, EnginePlayer['proj']>();
  const validation = new Map<string, EnginePlayer['validation']>();
  const validationSet = new Set(league.validationProviders);
  for (const p of dataset.projections) {
    if (p.provider === league.primaryProjectionProvider) proj.set(p.canonicalPlayerId, p);
    else if (validationSet.has(p.provider)) {
      const arr = validation.get(p.canonicalPlayerId) ?? [];
      arr.push(p);
      validation.set(p.canonicalPlayerId, arr);
    }
  }
  const market = new Map(dataset.market.map((m) => [m.canonicalPlayerId, m]));
  const context = new Map(dataset.context.map((c) => [c.canonicalPlayerId, c]));
  const history = new Map<string, EnginePlayer['history']>();
  for (const h of dataset.availability) {
    const arr = history.get(h.canonicalPlayerId) ?? [];
    arr.push(h);
    history.set(h.canonicalPlayerId, arr);
  }
  const playoff = new Map<string, number>();
  for (const t of dataset.playoffSchedule) {
    let g = 0;
    let any = false;
    for (const w of league.playoffWeeks) {
      const games = t.gamesByWeek[w];
      if (games === undefined) continue;
      any = true;
      g += (config.playoffWeekWeights[String(w)] ?? 1) * games;
    }
    if (any) playoff.set(t.nbaTeam, g);
  }

  return dataset.identities
    .map((id) => ({
      id: id.canonicalPlayerId,
      name: id.canonicalName,
      team: id.nbaTeam,
      positions: id.positions,
      positionsSource: id.positionsSource,
      proj: proj.get(id.canonicalPlayerId) ?? null,
      validation: (validation.get(id.canonicalPlayerId) ?? []).sort((a, b) => (a.provider < b.provider ? -1 : 1)),
      market: market.get(id.canonicalPlayerId) ?? null,
      history: (history.get(id.canonicalPlayerId) ?? []).sort((a, b) => (a.season < b.season ? 1 : -1)),
      context: context.get(id.canonicalPlayerId) ?? null,
      playoffGames: id.nbaTeam !== null ? (playoff.get(id.nbaTeam) ?? null) : null,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
