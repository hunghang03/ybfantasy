'use client';

import { useMemo } from 'react';
import { buildContext } from '@/domain';
import type { DraftEvaluation } from '@/domain/recommendations/engine';
import { timedEvaluate } from '@/lib/timing';
import type { StaticContext } from '@/domain/recommendations/staticContext';
import { useActiveDraft, useActiveLeague, useApp } from './store';

/**
 * Engine hook. Stage 1 (static context) is memoized on dataset/league-shape/config; stage 2 runs
 * on every draft change. Both are pure and client-side.
 */
export function useEngine(): { ctx: StaticContext | null; evaluation: DraftEvaluation | null; ms: number } {
  const league = useActiveLeague();
  const draft = useActiveDraft();
  const dataset = useApp((s) => s.dataset);
  const config = useApp((s) => s.config);
  const ctx = useMemo(() => (league ? buildContext(dataset, league, config) : null), [dataset, league, config]);
  return useMemo(() => {
    if (!ctx || !draft) return { ctx, evaluation: null, ms: 0 };
    const { evaluation, ms } = timedEvaluate(ctx, { events: draft.events, flags: draft.flags, puntOverrides: draft.puntOverrides });
    return { ctx, evaluation, ms };
  }, [ctx, draft]);
}
