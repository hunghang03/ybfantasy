'use client';

import type { DraftEvaluation } from '@/domain/recommendations/engine';
import { CATEGORY_LABEL } from '@/domain/types/core';
import { Badge, cx } from '../ui/primitives';
import { LABEL_CLASS, LABEL_TEXT } from '../labels';

export function StrategyAdvisor({ ev, onSelect }: { ev: DraftEvaluation; onSelect: (id: string) => void }) {
  const a = ev.advisor;
  const rec = ev.recommendedId ? ev.byId.get(ev.recommendedId) : null;
  const critical = ev.warnings.filter((w) => w.severity === 'critical');
  return (
    <section className="rounded-md border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900" data-testid="strategy-advisor" aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold" data-testid="advisor-header">
          {a.header}
        </h2>
        <span className="text-xs font-medium text-violet-700 dark:text-violet-300" data-testid="advisor-build">
          {a.build}
        </span>
        <span className="text-xs font-semibold" data-testid="advisor-priority">
          {a.priority.length ? `Priority: ${a.priority.map((c) => CATEGORY_LABEL[c]).join(' > ')}` : a.priorityLine}
        </span>
      </div>
      {critical.map((w) => (
        <p key={w.code} className="mt-1 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white" role="alert" data-testid={`warning-${w.code}`}>
          {w.message}
        </p>
      ))}
      <p className="mt-1 text-xs text-slate-700 dark:text-slate-300" data-testid="advisor-reason">
        {a.reason}
      </p>
      {rec && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold uppercase text-slate-500">Recommended:</span>
          <button className="font-bold text-blue-700 underline dark:text-blue-300" onClick={() => onSelect(rec.playerId)} data-testid="advisor-recommended">
            {rec.name}
          </button>
          <Badge className={LABEL_CLASS[rec.label]}>{LABEL_TEXT[rec.label]}</Badge>
          <span className="text-slate-700 dark:text-slate-300">
            <b>Why:</b> {a.recommendedWhy}
          </span>
        </div>
      )}
      {a.avoidLine && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.avoidLine}</p>}
      {a.warnings.filter((w) => !critical.some((c) => c.message === w)).length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {a.warnings
            .filter((w) => !critical.some((c) => c.message === w))
            .map((w) => (
              <li key={w} className={cx('text-[11px] text-amber-700 dark:text-amber-400')}>
                ⚠ {w}
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
