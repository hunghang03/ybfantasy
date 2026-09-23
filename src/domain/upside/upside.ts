import type { StrategyConfig } from '../config/strategyConfig';
import { weightForRound } from '../config/defaults';
import { clamp01 } from '../numeric/safe';
import type { PlayerContext, ProjectionLine } from '../types/data';

/**
 * Upside (DESIGN §6.11, R2-6). Only SUPPLIED evidence counts: manual score, provider tag,
 * minutes growth (both MPG values supplied) and role tags. Age is never an upside input.
 */
export function computeUpside(
  proj: ProjectionLine | null,
  context: PlayerContext | null,
  config: StrategyConfig,
): { score: number; sources: string[] } {
  const parts: { v: number; src: string }[] = [];
  if (context?.manualUpside !== undefined) parts.push({ v: clamp01(context.manualUpside), src: 'manual' });
  const provider = context?.providerUpside ?? proj?.providerUpside ?? null;
  if (provider !== null && provider !== undefined) parts.push({ v: clamp01(provider), src: 'provider' });
  const mpg = proj?.mpg ?? null;
  const prev = context?.previousSeasonMpg ?? null;
  if (mpg !== null && prev !== null) {
    const g =
      clamp01((mpg - prev) / config.minutesGrowthUpside.minutesForMax) * config.minutesGrowthUpside.maxScore;
    if (g > 0) parts.push({ v: g, src: 'minutes growth' });
  }
  for (const t of context?.roleTags ?? []) parts.push({ v: config.roleTagUpside[t], src: `role:${t}` });
  if (parts.length === 0) return { score: 0, sources: [] };
  const score = Math.max(...parts.map((p) => p.v));
  return { score, sources: parts.filter((p) => p.v > 0).map((p) => p.src) };
}

export function upsideAdjustment(score: number, round: number, config: StrategyConfig): number {
  return weightForRound(config.upsideWeightsByRound, round) * clamp01(score) * config.upsideScaleZ;
}
