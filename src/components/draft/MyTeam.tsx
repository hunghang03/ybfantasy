'use client';

import type { DraftEvaluation } from '@/domain/recommendations/engine';
import { assignSlots } from '@/domain/positions/positions';
import { CATEGORY_LABEL } from '@/domain/types/core';
import type { LeagueProfile } from '@/domain/types/league';
import { Button, fmt, Panel } from '../ui/primitives';

export function MyTeam({ ev, league, onRemove }: { ev: DraftEvaluation; league: LeagueProfile; onRemove: (seq: number) => void }) {
  const slots = assignSlots(
    ev.roster.map((r) => ({ id: r.playerId, positions: r.positions })),
    league.roster,
  );
  const byId = new Map(ev.roster.map((r) => [r.playerId, r]));
  return (
    <Panel title={`My team (${ev.roster.length}/${ev.positions.activeSlots + league.roster.bench})`}>
      <table className="w-full whitespace-nowrap text-[11px]" data-testid="my-team">
        <thead className="text-left text-[10px] uppercase text-slate-500">
          <tr>
            <th>Slot</th>
            <th>Pick</th>
            <th>Player</th>
            <th className="text-right" title="Neutral 9-cat (raw z, TO 1.0)">N9</th>
            <th className="text-right" title="Team fit at the time drafted">Fit</th>
            <th className="pl-1">Cats</th>
            <th>Risk</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {slots.map((s, i) => {
            const r = s.playerId ? byId.get(s.playerId) : null;
            return (
              <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-0.5 font-semibold text-slate-500">{s.slot}</td>
                <td className="num">{r?.overallPick ?? ''}</td>
                <td className="max-w-[10rem] truncate">
                  {r ? (
                    <>
                      {r.name} <span className="text-slate-500">{r.positions.join('/')}</span>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="num text-right">{r ? fmt(r.neutralValue, 1) : ''}</td>
                <td className="num text-right">{r ? fmt(r.fitAtDraft, 2) : ''}</td>
                <td className="pl-1 text-slate-600 dark:text-slate-300">{r?.keyCategories.map((c) => CATEGORY_LABEL[c]).join(' ')}</td>
                <td>{r?.risk ?? ''}</td>
                <td className="text-right">
                  {r && (
                    <Button size="xs" variant="ghost" title="Remove this pick (clock does not move; undoable)" onClick={() => onRemove(r.seq)}>
                      ✕
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[10px] text-slate-500">
        Active slots filled {ev.positions.filledSlots}/{ev.positions.activeSlots} · {ev.positions.feasible ? 'roster feasible' : 'ROSTER INFEASIBLE'} · required:{' '}
        {Object.entries(ev.positions.required)
          .filter(([, v]) => v > 0)
          .map(([p, v]) => `${p}×${v}`)
          .join(' ') || 'none'}
      </p>
    </Panel>
  );
}

export function LockedTargets({ ev, lockedIds, onSelect }: { ev: DraftEvaluation; lockedIds: string[]; onSelect: (id: string) => void }) {
  if (lockedIds.length === 0) return null;
  return (
    <Panel title="Locked targets">
      <ul className="space-y-1 text-xs" data-testid="locked-targets">
        {lockedIds.map((id) => {
          const p = ev.byId.get(id);
          if (!p) return null;
          return (
            <li key={id} className="flex flex-wrap items-center gap-2">
              <button className="font-semibold text-blue-700 underline dark:text-blue-300" onClick={() => onSelect(id)}>
                {p.name}
              </button>
              <span>DDP {p.ddpScore}</span>
              <span>ADP {p.market.adp ?? '—'}</span>
              <span className="font-semibold">{p.label.replace('_', ' ')}</span>
              <span className="text-slate-500">next pick: {p.market.band.toLowerCase()}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
