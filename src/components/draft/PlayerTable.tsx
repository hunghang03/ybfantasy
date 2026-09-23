'use client';

import { useMemo, useState, type RefObject } from 'react';
import type { DraftEvaluation } from '@/domain/recommendations/engine';
import { CATEGORY_LABEL, type Position } from '@/domain/types/core';
import type { PlayerEvaluation, RiskLevel } from '@/domain/types/evaluation';
import type { TimingLabel } from '@/domain/types/league';
import { Badge, Button, Input, Select, cx } from '../ui/primitives';
import { LABEL_CLASS, LABEL_TEXT, RISK_CLASS, RISK_TEXT } from '../labels';

export type SortKey = 'priority' | 'ddp' | 'adp' | 'xrank' | 'name' | 'risk' | 'neutral';

export interface TableFilters {
  search: string;
  position: 'ALL' | Position | 'G' | 'F';
  label: 'ALL' | TimingLabel;
  risk: 'ALL' | RiskLevel;
  favoritesOnly: boolean;
  lockedOnly: boolean;
  showDnd: boolean;
  compact: boolean;
}

export const DEFAULT_FILTERS: TableFilters = {
  search: '',
  position: 'ALL',
  label: 'ALL',
  risk: 'ALL',
  favoritesOnly: false,
  lockedOnly: false,
  showDnd: false,
  compact: false,
};

const RISK_ORDER: Record<RiskLevel, number> = { LOW: 0, MODERATE: 1, HIGH: 2, VERY_HIGH: 3 };

export function filterAndSort(players: PlayerEvaluation[], f: TableFilters, sort: SortKey): PlayerEvaluation[] {
  const q = f.search.trim().toLowerCase();
  const posOk = (p: PlayerEvaluation) =>
    f.position === 'ALL' ||
    (f.position === 'G' ? p.positions.some((x) => x === 'PG' || x === 'SG') : f.position === 'F' ? p.positions.some((x) => x === 'SF' || x === 'PF') : p.positions.includes(f.position));
  const out = players.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q) || (p.team ?? '').toLowerCase() === q) &&
      posOk(p) &&
      (f.label === 'ALL' || p.label === f.label) &&
      (f.risk === 'ALL' || p.availability.risk === f.risk) &&
      (!f.favoritesOnly || p.flags.favorite) &&
      (!f.lockedOnly || p.flags.lockTarget) &&
      (f.showDnd || !p.flags.doNotDraft),
  );
  if (sort === 'priority') return out;
  const key = (p: PlayerEvaluation): number | string => {
    switch (sort) {
      case 'ddp':
        return -p.ddpRaw;
      case 'adp':
        return p.market.adp ?? 1e9;
      case 'xrank':
        return p.market.xrank ?? 1e9;
      case 'name':
        return p.name;
      case 'risk':
        return RISK_ORDER[p.availability.risk];
      case 'neutral':
        return -p.stats.neutral9Cat;
    }
  };
  return [...out].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    const c = typeof ka === 'string' ? ka.localeCompare(kb as string) : (ka as number) - (kb as number);
    return c || a.priorityRank - b.priorityRank;
  });
}

export function PlayerTable({
  ev,
  rows,
  filters,
  setFilters,
  sort,
  setSort,
  selectedId,
  onSelect,
  onOpen,
  onAction,
  searchRef,
  catchUp,
}: {
  ev: DraftEvaluation;
  rows: PlayerEvaluation[];
  filters: TableFilters;
  setFilters: (f: TableFilters) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onAction: (id: string, action: 'MINE' | 'OTHER' | 'favorite' | 'avoid' | 'doNotDraft' | 'lockTarget') => void;
  searchRef: RefObject<HTMLInputElement | null>;
  catchUp: boolean;
}) {
  const [limit, setLimit] = useState(150);
  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const set = (patch: Partial<TableFilters>) => setFilters({ ...filters, ...patch });
  const th = (key: SortKey, label: string, cls = '') => (
    <th className={cx('cursor-pointer select-none px-1 py-1 font-semibold', cls, sort === key && 'text-blue-700 dark:text-blue-300')} onClick={() => setSort(key)} scope="col">
      {label}
      {sort === key ? ' ▾' : ''}
    </th>
  );
  const pad = filters.compact ? 'py-0' : 'py-1';
  return (
    <section className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" data-testid="player-table">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 p-1.5 text-xs dark:border-slate-800">
        <Input ref={searchRef} placeholder="Search (/)…" aria-label="Search players" data-testid="player-search" value={filters.search} onChange={(e) => set({ search: e.target.value })} className="w-40 py-0.5 text-xs" />
        <Select aria-label="Position filter" value={filters.position} onChange={(e) => set({ position: e.target.value as TableFilters['position'] })} className="py-0.5 text-xs">
          {['ALL', 'PG', 'SG', 'G', 'SF', 'PF', 'F', 'C'].map((p) => (
            <option key={p} value={p}>
              {p === 'ALL' ? 'All pos' : p}
            </option>
          ))}
        </Select>
        <Select aria-label="Recommendation filter" value={filters.label} onChange={(e) => set({ label: e.target.value as TableFilters['label'] })} className="py-0.5 text-xs">
          <option value="ALL">All actions</option>
          {(['DRAFT_NOW', 'LEAN_DRAFT', 'WAIT', 'SAFE_WAIT', 'PASS'] as TimingLabel[]).map((l) => (
            <option key={l} value={l}>
              {LABEL_TEXT[l]}
            </option>
          ))}
        </Select>
        <Select aria-label="Risk filter" value={filters.risk} onChange={(e) => set({ risk: e.target.value as TableFilters['risk'] })} className="py-0.5 text-xs">
          <option value="ALL">All risk</option>
          {(['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'] as RiskLevel[]).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        {(
          [
            ['favoritesOnly', '★ only'],
            ['lockedOnly', 'Locked only'],
            ['showDnd', 'Show DND'],
            ['compact', 'Compact'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={filters[k]} onChange={(e) => set({ [k]: e.target.checked })} />
            {label}
          </label>
        ))}
        <span className="ml-auto text-slate-500">
          {rows.length} available · keys: ↑↓ select · M mine · D taken{catchUp ? ' (no advance)' : ''} · F ★ · A avoid · L lock · U undo · Enter details
        </span>
      </div>
      <div className="max-h-[calc(100vh-15rem)] overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-left text-[10px] uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              {th('priority', '#', 'w-8 text-right')}
              {th('name', 'Player')}
              <th className="px-1">Team</th>
              <th className="px-1">Pos</th>
              {th('ddp', 'DDP', 'text-right')}
              <th className="px-1">Action</th>
              {th('adp', 'L7 ADP', 'text-right')}
              {th('xrank', 'XRank', 'text-right')}
              {th('risk', 'Risk')}
              <th className="px-1">Fit</th>
              <th className="px-1 text-right">Draft</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => {
              const sel = p.playerId === selectedId;
              const rec = p.playerId === ev.recommendedId;
              return (
                <tr
                  key={p.playerId}
                  data-testid={`row-${p.playerId}`}
                  data-name={p.name}
                  aria-selected={sel}
                  onClick={() => onSelect(p.playerId)}
                  onDoubleClick={() => onOpen(p.playerId)}
                  className={cx(
                    'cursor-default border-t border-slate-100 dark:border-slate-800',
                    sel ? 'bg-blue-100 dark:bg-blue-900/50' : rec ? 'bg-amber-50 dark:bg-amber-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    p.flags.doNotDraft && 'opacity-50',
                    p.flags.avoid && 'text-slate-500',
                  )}
                >
                  <td className={cx('num px-1 text-right text-slate-500', pad)}>{p.priorityRank}</td>
                  <td className={cx('px-1 font-medium', pad)}>
                    <button className="text-left hover:underline" onClick={() => onOpen(p.playerId)}>
                      {p.name}
                    </button>
                    {p.flags.favorite && <span className="ml-1 text-amber-500" title="Favorite">★</span>}
                    {p.flags.lockTarget && <span className="ml-1" title="Locked target">🔒</span>}
                    {p.flags.avoid && <span className="ml-1 text-[10px] text-slate-500">avoid</span>}
                    {p.availability.status !== 'HEALTHY' && <span className="ml-1 text-[10px] font-bold text-red-600">{p.availability.status}</span>}
                    {p.disagreement.some((d) => d.flagged) && <span className="ml-1 text-[10px] text-amber-600" title="Projection disagreement">Δ</span>}
                    {p.confidence === 'LOW' && <span className="ml-1 text-[10px] text-slate-400" title={p.warnings.join('; ')}>low data</span>}
                  </td>
                  <td className={cx('px-1', pad)}>{p.team}</td>
                  <td className={cx('px-1', pad)}>{p.positions.join(',')}</td>
                  <td className={cx('num px-1 text-right font-semibold', pad)} title={`raw ${p.ddpRaw.toFixed(2)}`}>
                    {p.ddpScore}
                  </td>
                  <td className={cx('px-1', pad)}>
                    <Badge className={LABEL_CLASS[p.label]} title={p.labelRule}>
                      {LABEL_TEXT[p.label]}
                    </Badge>
                  </td>
                  <td className={cx('num px-1 text-right', pad)}>{p.market.adp ?? '—'}</td>
                  <td className={cx('num px-1 text-right', pad)}>{p.market.xrank ?? '—'}</td>
                  <td className={cx('px-1 font-semibold', pad, RISK_CLASS[p.availability.risk])}>{RISK_TEXT[p.availability.risk]}</td>
                  <td className={cx('px-1 text-[10px] text-slate-600 dark:text-slate-300', pad)}>{p.fitTags.map((c) => CATEGORY_LABEL[c]).join(' ')}</td>
                  <td className={cx('whitespace-nowrap px-1 text-right', pad)} onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="success" title="Draft to my team (M)" data-testid={`mine-${p.playerId}`} onClick={() => onAction(p.playerId, 'MINE')}>
                      Mine
                    </Button>{' '}
                    <Button size="xs" title={catchUp ? 'Mark taken without advancing (D)' : 'Drafted by others (D)'} data-testid={`taken-${p.playerId}`} onClick={() => onAction(p.playerId, 'OTHER')}>
                      Taken
                    </Button>{' '}
                    <Button size="xs" variant="ghost" title="Favorite (F)" aria-pressed={p.flags.favorite} onClick={() => onAction(p.playerId, 'favorite')}>
                      ★
                    </Button>
                    <Button size="xs" variant="ghost" title="Avoid (A)" aria-pressed={p.flags.avoid} onClick={() => onAction(p.playerId, 'avoid')}>
                      ⊘
                    </Button>
                    <Button size="xs" variant="ghost" title="Do not draft" aria-pressed={p.flags.doNotDraft} onClick={() => onAction(p.playerId, 'doNotDraft')}>
                      DND
                    </Button>
                    <Button size="xs" variant="ghost" title="Lock target (L)" aria-pressed={p.flags.lockTarget} onClick={() => onAction(p.playerId, 'lockTarget')}>
                      🔒
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > limit && (
          <div className="p-2 text-center">
            <Button size="sm" onClick={() => setLimit(limit + 200)}>
              Show more ({rows.length - limit} hidden)
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
