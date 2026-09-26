'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { replay } from '@/domain/draft/replay';
import { slotOwningPick } from '@/domain/draft/snake';
import { buildDecisionRecord } from '@/domain/telemetry/decision';
import type { PlayerFlags } from '@/domain/types/league';
import { useActiveDraft, useActiveLeague, useApp } from '@/state/store';
import { useEngine } from '@/state/useEngine';
import { StrategyAdvisor } from '@/components/draft/StrategyAdvisor';
import { CategoryDashboard } from '@/components/draft/CategoryDashboard';
import { LockedTargets, MyTeam } from '@/components/draft/MyTeam';
import {
  DEFAULT_FILTERS,
  filterAndSort,
  matchesSearch,
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
  const dataset = useApp((s) => s.dataset);
  const batches = useApp((s) => s.batches);
  const config = useApp((s) => s.config);
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
  const drafted = useMemo(() => replay(draft?.events ?? []).drafted, [draft]);
  // Players without a projection (market-only) are not ranked, but must still be findable and markable on draft day.
  const unprojected = useMemo(() => {
    if (!ctx) return [];
    const market = new Map(dataset.market.map((m) => [m.canonicalPlayerId, m]));
    return ctx.unranked
      .filter((u) => !drafted.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        team: u.team,
        positions: u.positions,
        market: market.get(u.id) ?? null,
      }));
  }, [ctx, drafted, dataset.market]);
  const unprojectedMatches = useMemo(
    () =>
      filters.search.trim()
        ? unprojected.filter((u) => matchesSearch(u.name, u.team, filters.search)).slice(0, 12)
        : [],
    [unprojected, filters.search],
  );
  // Keyboard/search result order: ranked rows first, then unprojected matches.
  const resultIds = useMemo(
    () => [...rows.map((r) => r.playerId), ...unprojectedMatches.map((u) => u.id)],
    [rows, unprojectedMatches],
  );
  const selected = selectedId && resultIds.includes(selectedId) ? selectedId : (resultIds[0] ?? null);

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
        const decision =
          action === 'MINE' && ctx && league && draft
            ? buildDecisionRecord({
                ctx,
                league,
                input: { events: draft.events, flags: draft.flags, puntOverrides: draft.puntOverrides },
                before: ev,
                playerId: id,
                unprojectedAvailable: unprojected.length,
                activeBatchIds: batches.filter((b) => b.status === 'ACTIVE').map((b) => b.id),
                configVersion: config.version,
                now: new Date().toISOString(),
              })
            : undefined;
        const err = draftPick(id, action === 'MINE' ? 'ME' : 'OTHER', {
          advance: action === 'MINE' ? true : !catchUp,
          snapshot,
          decision,
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
    [ev, ctx, league, draft, unprojected, batches, config, draftPick, toggleFlag, catchUp, notify],
  );

  /** type → select → MARK TAKEN without leaving the search box. */
  const onSearchKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    const idx = selected ? resultIds.indexOf(selected) : -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const n =
        resultIds[Math.max(0, Math.min(resultIds.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (n) setSelectedId(n);
      e.preventDefault();
    } else if (e.key === 'Enter' && selected) {
      act(selected, e.shiftKey ? 'MINE' : 'OTHER');
      setFilters({ ...filters, search: '' });
      setSelectedId(null);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      if (filters.search) setFilters({ ...filters, search: '' });
      else e.currentTarget.blur();
      e.preventDefault();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      const idx = selected ? resultIds.indexOf(selected) : -1;
      const k = e.key.toLowerCase();
      if (k === 'arrowdown' || k === 'j') {
        const n = resultIds[Math.min(resultIds.length - 1, idx + 1)];
        if (n) setSelectedId(n);
        e.preventDefault();
      } else if (k === 'arrowup' || k === 'k') {
        const n = resultIds[Math.max(0, idx - 1)];
        if (n) setSelectedId(n);
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
  }, [resultIds, selected, act, undo]);

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
            · Round{' '}
            <b className="num" data-testid="current-round">
              {ev.timing.currentRound}
            </b>
          </span>
          <span title="Snake order: the team in this draft slot is picking now">
            On the clock: slot{' '}
            <b className="num" data-testid="drafting-slot">
              {ev.timing.draftComplete ? '—' : slotOwningPick(ev.draft.currentOverall, league.teamCount)}
            </b>
            /{league.teamCount}
          </span>
          <span>
            My slot{' '}
            <b className="num" data-testid="my-slot">
              {league.draftPosition}
            </b>
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
            ·{' '}
            <b className="num" data-testid="picks-until-mine">
              {ev.gap.beforeNext}
            </b>{' '}
            picks before your next
            {ev.timing.gapType && <> · {ev.timing.gapType.toLowerCase()} gap</>}
          </span>
          <span title="Available players: with a projection + without one (market-only)">
            Available{' '}
            <b className="num" data-testid="available-count">
              {ev.players.length}
            </b>
            {unprojected.length > 0 && <> + {unprojected.length} unprojected</>}
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
        <div className="min-w-0 space-y-2">
          {unprojectedMatches.length > 0 && (
            <UnprojectedResults
              players={unprojectedMatches}
              selectedId={selected}
              catchUp={catchUp}
              onAction={(id, a) => act(id, a)}
            />
          )}
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
            onSearchKey={onSearchKey}
          />
        </div>
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

/** Search hits without a projection (market-only): not valued by the engine, but can be marked taken or drafted. */
function UnprojectedResults({
  players,
  selectedId,
  catchUp,
  onAction,
}: {
  players: {
    id: string;
    name: string;
    team: string | null;
    positions: string[];
    market: { yahooXRank: number | null; yahooAdp7d: number | null } | null;
  }[];
  selectedId: string | null;
  catchUp: boolean;
  onAction: (id: string, action: 'MINE' | 'OTHER') => void;
}) {
  return (
    <section
      className="rounded-md border border-amber-300 bg-amber-50 p-1.5 text-xs dark:border-amber-800 dark:bg-amber-950"
      data-testid="unprojected-results"
    >
      <p className="mb-1 text-amber-900 dark:text-amber-100">
        No projection loaded for these players (not ranked by the engine):
      </p>
      <table className="w-full">
        <tbody>
          {players.map((u) => (
            <tr
              key={u.id}
              className={u.id === selectedId ? 'bg-amber-200 dark:bg-amber-900' : ''}
              data-testid={`unprojected-${u.id}`}
            >
              <td className="px-1 font-medium">{u.name}</td>
              <td className="px-1">{u.team ?? '—'}</td>
              <td className="px-1">{u.positions.join('/')}</td>
              <td className="px-1 text-slate-500">
                XRank {u.market?.yahooXRank ?? '—'} · L7 ADP {u.market?.yahooAdp7d ?? '—'}
              </td>
              <td className="whitespace-nowrap px-1 text-right">
                <Button
                  size="xs"
                  variant="success"
                  data-testid={`mine-${u.id}`}
                  onClick={() => onAction(u.id, 'MINE')}
                >
                  Draft to me
                </Button>{' '}
                <Button
                  size="xs"
                  variant="primary"
                  data-testid={`taken-${u.id}`}
                  onClick={() => onAction(u.id, 'OTHER')}
                >
                  {catchUp ? 'Mark taken*' : 'Mark taken'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
