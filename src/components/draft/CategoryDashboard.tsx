'use client';

import type { DraftEvaluation } from '@/domain/recommendations/engine';
import { CATEGORY_LABEL, type Category } from '@/domain/types/core';
import type { PuntOverride } from '@/domain/types/league';
import { fmt, Panel, Select, cx } from '../ui/primitives';
import { STATE_BAR, STATE_CLASS, STATE_TEXT } from '../labels';

/** Nine-category view on a team-level standard-deviation scale (not raw totals). */
export function CategoryDashboard({
  ev,
  overrides,
  onOverride,
}: {
  ev: DraftEvaluation;
  overrides: Partial<Record<Category, PuntOverride>>;
  onOverride: (c: Category, v: PuntOverride) => void;
}) {
  const t = ev.totals;
  const total = (c: Category): string => {
    switch (c) {
      case 'FG_PCT':
        return t.fgPct === null ? '—' : t.fgPct.toFixed(3);
      case 'FT_PCT':
        return t.ftPct === null ? '—' : t.ftPct.toFixed(3);
      case 'THREES':
        return fmt(t.perGame.threes, 1);
      case 'PTS':
        return fmt(t.perGame.pts, 1);
      case 'REB':
        return fmt(t.perGame.reb, 1);
      case 'AST':
        return fmt(t.perGame.ast, 1);
      case 'STL':
        return fmt(t.perGame.stl, 1);
      case 'BLK':
        return fmt(t.perGame.blk, 1);
      case 'TO':
        return fmt(t.perGame.to, 1);
    }
  };
  return (
    <Panel title="Category profile vs expected competition">
      {ev.profile[0] && ev.profile[0].maturity !== 'FULL' && (
        <p className="mb-1 text-[11px] text-slate-500" data-testid="state-maturity">
          {ev.profile[0].maturity === 'TENDENCY'
            ? 'Early roster: showing direction only (no WEAK/CRITICAL calls yet).'
            : 'Weaknesses can be named now; CRITICAL starts at pick 5.'}{' '}
          Numbers are unchanged — hover a row for the calculated state.
        </p>
      )}
      <ul className="space-y-1" data-testid="category-dashboard">
        {ev.profile.map((p) => {
          const pos = Math.max(-2.5, Math.min(2.5, p.d));
          const left = pos < 0 ? 50 + (pos / 2.5) * 50 : 50;
          const width = (Math.abs(pos) / 2.5) * 50;
          const title = [
            `d = ${fmt(p.d)} team SD (roster ${fmt(p.rosterSum)} vs expected ${fmt(p.expected)}, σT ${fmt(p.teamSd)})`,
            `need ${fmt(p.need)} · surplus ${fmt(p.surplus)} · pool scarcity ${fmt(p.poolScarcity)} · next-pick scarcity ${fmt(p.nextPickScarcity)}`,
            `punt π ${fmt(p.punt.pi)} (deficit ${fmt(p.punt.deficit)}, coherence ${fmt(p.punt.coherence)}, recoverability ${fmt(p.punt.recoverability)}) · weight ×${fmt(p.weightMultiplier)}`,
            `calculated state ${p.state}${p.maturity === 'FULL' ? '' : ` · shown as ${STATE_TEXT[p.displayState]} (${p.maturity.toLowerCase()}: roster too small to call)`}`,
          ].join('\n');
          return (
            <li
              key={p.category}
              className="grid grid-cols-[3rem_1fr_5.5rem_3.5rem_4.5rem] items-center gap-1.5 text-xs"
              title={title}
              data-testid={`cat-${p.category}`}
            >
              <span className="font-semibold">{CATEGORY_LABEL[p.category]}</span>
              <span className="relative h-2.5 rounded bg-slate-100 dark:bg-slate-800">
                <span className="absolute top-0 h-full w-px bg-slate-400" style={{ left: '50%' }} />
                <span
                  className={cx('absolute top-0 h-full rounded', STATE_BAR[p.displayState])}
                  style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                />
              </span>
              <span
                className={cx(
                  'rounded px-1 py-0.5 text-center text-[10px] font-bold',
                  STATE_CLASS[p.displayState],
                )}
                data-testid={`cat-state-${p.category}`}
              >
                {STATE_TEXT[p.displayState]}
              </span>
              <span className="num text-right text-slate-600 dark:text-slate-400">{total(p.category)}</span>
              <Select
                aria-label={`Punt override ${CATEGORY_LABEL[p.category]}`}
                className="px-0.5 py-0 text-[10px]"
                value={overrides[p.category] ?? 'AUTO'}
                onChange={(e) => onOverride(p.category, e.target.value as PuntOverride)}
              >
                <option value="AUTO">auto</option>
                <option value="NONE">no punt</option>
                <option value="SOFT">soft</option>
                <option value="HARD">hard</option>
              </Select>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-slate-500">
        Bars: team-level SD vs the expected average {ev.k}-player roster. Totals are per game; FG%/FT% =
        ΣM/ΣA. Hover for numbers.
      </p>
    </Panel>
  );
}
