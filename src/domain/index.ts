import type { StrategyConfig } from './config/strategyConfig';
import { assemblePlayers } from './dataset/assemble';
import { evaluateDraft, type DraftEvaluation, type DraftInput } from './recommendations/engine';
import { buildStaticContext, type StaticContext } from './recommendations/staticContext';
import type { Dataset } from './types/data';
import type { LeagueProfile } from './types/league';

export * from './types';
export type { DraftEvaluation, DraftInput } from './recommendations/engine';
export type { StaticContext } from './recommendations/staticContext';
export type * from './types/evaluation';

/** Stage 1 (memoizable): dataset + league + config → static context. */
export function buildContext(dataset: Dataset, league: LeagueProfile, config: StrategyConfig): StaticContext {
  return buildStaticContext(assemblePlayers(dataset, league, config), league, config);
}

/** Convenience: full engine run. */
export function runEngine(
  dataset: Dataset,
  league: LeagueProfile,
  config: StrategyConfig,
  draft: DraftInput,
): { ctx: StaticContext; evaluation: DraftEvaluation } {
  const ctx = buildContext(dataset, league, config);
  return { ctx, evaluation: evaluateDraft(ctx, draft) };
}
