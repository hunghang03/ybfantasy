'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { replay } from '@/domain/draft/replay';
import type { PlayerFlags } from '@/domain/types/league';
import { useActiveDraft, useActiveLeague, useApp } from '@/state/store';
import { useEngine } from '@/state/useEngine';
import { StrategyAdvisor } from '@/components/draft/StrategyAdvisor';
import { CategoryDashboard } from '@/components/draft/CategoryDashboard';
import { LockedTargets, MyTeam } from '@/components/draft/MyTeam';
import {
  DEFAULT_FILTERS,
  filterAndSort,
  PlayerTable,
  type SortKey,
  type TableFilters,
} from '@/components/draft/PlayerTable';
import { PlayerDetail } from '@/components/review/PlayerDetail';
import { Button, Input, Panel } from '@/components/ui/primitives';

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function DraftPage() {
  const league = useActiveLeague();
  const draft = useActiveDraft();
  const { ctx, evaluation: ev, ms } = useEngine();
  const draftPick = useApp((s) => s.draftPick);
  const undo = useApp((s) => s.undo);
  const resync = useApp((s) => s.resync);
  const voidPick = useApp((s) => s.voidPick);
  const toggleFlag = useApp((s) => s.toggleFlag);
  const setPuntOverride = useApp((s) => s.setPuntOverride);
  const notify = useApp((s) => s.notify);
  const compactSetting = useApp((s) => s.settings.compactMode);
  const updateSettings = useApp((s) => s.updateSettings);

  const [filters, setFiltersState] = useState<TableFilters>({ ...DEFAULT_FILTERS, compact: compactSetting });
  const [sort, setSort] = useState<SortKey>('priority');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [catchUp, setCatchUp] = useState(false);
  const [resyncValue, setResyncValue] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const setFilters = (f: TableFilters) => {
    setFiltersState(f);
    if (f.compact !== compactSetting) updateSettings({ compactMode: f.compact });
  };

  const rows = useMemo(() => (ev ? filterAndSort(ev.players, filters, sort) : []), [ev, filters, sort]);
  const selected = selectedId && ev?.byId.has(selectedId) ? selectedId : (rows[0]?.playerId ?? null);

  const lastEvent = draft?.events[draft.events.length - 1];
  const lastLabel = useMemo(() => {
    if (!lastEvent || !ctx) return null;
    if (lastEvent.type === 'RESYNC') return `Resync to pick ${lastEvent.setCurrentOverall}`;
    if (lastEvent.type === 'VOID') return `Removed pick #${lastEvent.targetSeq}`;
    const name =
      ctx.byId.get(lastEvent.playerId)?.player.name ??
      ctx.unranked.find((u) => u.id === lastEvent.playerId)?.name ??
      lastEvent.playerId;
    return `${lastEvent.by === 'ME' ? 'You drafted' : lastEvent.advance ? 'Taken' : 'Marked taken'} ${name}${lastEvent.overallPick ? ` (#${lastEvent.overallPick})` : ''}`;
  }, [lastEvent, ctx]);

  const act = useCallback(
    (id: string, action: 'MINE' | 'OTHER' | keyof PlayerFlags) => {
      if (!ev) return;
      if (action === 'MINE' || action === 'OTHER') {
        const p = ev.byId.get(id);
        const snapshot = p
          ? { ddpRaw: p.ddpRaw, baseValue: p.value.basePlayerValue, teamFit: p.fit.teamFit, label: p.label }
          : undefined;
        const err = draftPick(id, action === 'MINE' ? 'ME' : 'OTHER', {
          advance: action === 'MINE' ? true : !catchUp,
          snapshot,
        });
        if (err) notify(err);
        else if (action === 'MINE' && !ev.timing.onTheClock)
          notify(
            `Recorded as your pick at #${ev.draft.currentOverall}, which is not on your snake schedule. Use Resync if Yahoo differs.`,
          );
        return;
      }
      toggleFlag(id, action);
    },
    [ev, draftPick, toggleFlag, catchUp, notify],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      const idx = rows.findIndex((r) => r.playerId === selected);
      const k = e.key.toLowerCase();
      if (k === 'arrowdown' || k === 'j') {
        const n = rows[Math.min(rows.length - 1, idx + 1)];
        if (n) setSelectedId(n.playerId);
        e.preventDefault();
      } else if (k === 'arrowup' || k === 'k') {
        const n = rows[Math.max(0, idx - 1)];
        if (n) setSelectedId(n.playerId);
        e.preventDefault();
      } else if (k === '/') {
        searchRef.current?.focus();
        e.preventDefault();
      } else if (k === 'u') undo();
      else if (k === 'escape') setDetailId(null);
      else if (!selected) return;
      else if (k === 'm') act(selected, 'MINE');
      else if (k === 'd') act(selected, 'OTHER');
      else if (k === 'f') act(selected, 'favorite');
      else if (k === 'a') act(selected, 'avoid');
      else if (k === 'l') act(selected, 'lockTarget');
      else if (k === 'enter') setDetailId(selected);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, selected, act, undo]);

  if (!league || !draft)
    return (
      <div className="p-6 text-sm">
        No league selected.{' '}
        <Link className="text-blue-600 underline" href="/">
          Create or select a league
        </Link>
        .
      </div>
    );
  if (!ev || ev.status === 'INSUFFICIENT_DATA')
    return (
      <div className="p-6 text-sm">
        {ev?.warnings.find((w) => w.code === 'INSUFFICIENT_DATA')?.message ?? 'No data.'}{' '}
        <Link className="text-blue-600 underline" href="/data/">
          Go to Data
        </Link>{' '}
        (primary projection source for this league: <b>{league.primaryProjectionProvider}</b>).
      </div>
    );

  const lockedIds = Object.entries(draft.flags)
    .filter(([, f]) => f.lockTarget)
    .map(([id]) => id);
  const st = replay(draft.events);
  const detail = detailId ? ev.byId.get(detailId) : null;

  return (
    <div className="space-y-2 p-2">
      <div className="sticky top-[37px] z-20 space-y-2 bg-slate-50 pb-1 dark:bg-slate-950">
        <StrategyAdvisor ev={ev} onSelect={(id) => setDetailId(id)} />
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900"
          data-testid="draft-controls"
        >
          <span>
            Pick{' '}
            <b className="num" data-testid="current-pick">
              {ev.draft.currentOverall}
            </b>{' '}
            · Round <b className="num">{ev.timing.currentRound}</b>
          </span>
          <span>
            Your next pick{' '}
            <b className="num" data-testid="next-pick">
              {ev.timing.p0 ?? '—'}
            </b>
            {ev.timing.onTheClock && <b className="ml-1 rounded bg-red-600 px-1 text-white">ON THE CLOCK</b>}
          </span>
          <span>
            then{' '}
            <b className="num" data-testid="following-pick">
              {ev.timing.p1 ?? '—'}
            </b>{' '}
            · {ev.gap.beforeNext} picks before your next
            {ev.timing.gapType && <> · {ev.timing.gapType.toLowerCase()} gap</>}
          </span>
          <Button
            size="sm"
            data-testid="undo"
            onClick={undo}
            disabled={draft.events.length === 0}
            title="Undo last action (U)"
          >
            ↶ Undo
          </Button>
          {lastLabel && (
            <span className="text-slate-500" data-testid="last-event">
              Last: {lastLabel}
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            <label htmlFor="resync">Yahoo pick #</label>
            <Input
              id="resync"
              data-testid="resync-input"
              type="number"
              min={1}
              className="w-16 py-0 text-xs"
              value={resyncValue}
              placeholder={String(ev.draft.currentOverall)}
              onChange={(e) => setResyncValue(e.target.value)}
            />
            <Button
              size="xs"
              data-testid="resync-button"
              onClick={() => {
                const err = resync(Number(resyncValue));
                if (err) notify(err);
                else setResyncValue('');
              }}
            >
              Resync
            </Button>
            <label
              className="ml-2 flex items-center gap-1"
              title="Taken marks players unavailable without advancing the pick"
            >
              <input
                type="checkbox"
                data-testid="catch-up"
                checked={catchUp}
                onChange={(e) => setCatchUp(e.target.checked)}
              />
              Catch-up (no advance)
            </label>
            <span className="text-slate-400" title="Engine recalculation time">
              {ms.toFixed(0)} ms
            </span>
          </span>
        </div>
        {st.unrecordedPicks > 0 && (
          <p
            className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100"
            data-testid="unrecorded-banner"
          >
            {st.unrecordedPicks} pick(s) not recorded locally. Turn on catch-up mode and mark the missing
            players as Taken.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_27rem]">
        <PlayerTable
          ev={ev}
          rows={rows}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          setSort={setSort}
          selectedId={selected}
          onSelect={setSelectedId}
          onOpen={setDetailId}
          onAction={act}
          searchRef={searchRef}
          catchUp={catchUp}
        />
        <div className="space-y-2">
          <CategoryDashboard ev={ev} overrides={draft.puntOverrides} onOverride={setPuntOverride} />
          <MyTeam
            ev={ev}
            league={league}
            onRemove={(seq) => {
              if (
                !window.confirm('Remove this pick from your team? The pick clock does not move (undoable).')
              )
                return;
              const err = voidPick(seq);
              if (err) notify(err);
            }}
          />
          <LockedTargets ev={ev} lockedIds={lockedIds} onSelect={setDetailId} />
        </div>
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-2 md:items-center"
          onClick={() => setDetailId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Player details"
        >
          <div
            className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-md bg-white p-3 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex justify-end">
              <Button size="sm" onClick={() => setDetailId(null)}>
                Close (Esc)
              </Button>
            </div>
            <PlayerDetail p={detail} ctx={ctx} />
          </div>
        </div>
      )}
      {ev.warnings.some((w) => w.code === 'NON_FINITE_REPAIRED') && (
        <Panel title="Engine">Non-finite values were repaired; see Review.</Panel>
      )}
    </div>
  );
}
