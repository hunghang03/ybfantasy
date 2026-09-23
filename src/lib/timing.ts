import { evaluateDraft, type DraftEvaluation, type DraftInput } from '@/domain/recommendations/engine';
import type { StaticContext } from '@/domain/recommendations/staticContext';

/** Evaluate and report wall-clock time (for the draft header's recalculation indicator). */
export function timedEvaluate(ctx: StaticContext, input: DraftInput): { evaluation: DraftEvaluation; ms: number } {
  const t = performance.now();
  const evaluation = evaluateDraft(ctx, input);
  return { evaluation, ms: performance.now() - t };
}
