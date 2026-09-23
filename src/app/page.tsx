'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { replay } from '@/domain/draft/replay';
import { userPicks } from '@/domain/draft/snake';
import { rosterSize } from '@/domain/types/league';
import { downloadText } from '@/lib/ids';
import { parseBackup } from '@/persistence/backup';
import { useApp } from '@/state/store';
import { Button, Panel } from '@/components/ui/primitives';

export default function LeaguesPage() {
  const leagues = useApp((s) => s.leagues);
  const drafts = useApp((s) => s.drafts);
  const activeId = useApp((s) => s.settings.activeLeagueId);
  const createLeague = useApp((s) => s.createLeague);
  const deleteLeague = useApp((s) => s.deleteLeague);
  const setActive = useApp((s) => s.setActiveLeague);
  const exportBackup = useApp((s) => s.exportBackup);
  const restoreBackup = useApp((s) => s.restoreBackup);
  const notify = useApp((s) => s.notify);
  const dataset = useApp((s) => s.dataset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onRestore = async (file: File) => {
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      notify(`Backup rejected: ${parsed.errors.join('; ')}`);
      return;
    }
    if (!window.confirm('Replace ALL local data (leagues, drafts, datasets, config) with this backup?')) return;
    setBusy(true);
    await restoreBackup(parsed.backup);
    setBusy(false);
    notify('Backup restored.');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-3">
      <Panel
        title="League profiles"
        actions={
          <Button variant="primary" size="sm" data-testid="create-league" onClick={() => createLeague()}>
            + New league
          </Button>
        }
      >
        {leagues.length === 0 ? (
          <p className="text-sm text-slate-500">No leagues yet. Create one, then configure it in Setup.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-1">Name</th>
                <th>Season</th>
                <th>Teams</th>
                <th>Pick</th>
                <th>My picks</th>
                <th>Draft</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {leagues.map((l) => {
                const st = replay(drafts[l.id]?.events ?? []);
                const picks = userPicks({ teams: l.teamCount, slot: l.draftPosition, rounds: rosterSize(l.roster) });
                return (
                  <tr key={l.id} className={l.id === activeId ? 'bg-blue-50 dark:bg-blue-950/40' : ''} data-testid={`league-row-${l.name}`}>
                    <td className="py-1 font-medium">{l.name}</td>
                    <td>{l.season}</td>
                    <td className="num">{l.teamCount}</td>
                    <td className="num">{l.draftPosition}</td>
                    <td className="num text-xs text-slate-500">{picks.slice(0, 6).join(', ')}…</td>
                    <td className="num text-xs">
                      pick {st.currentOverall} · {st.myPicks.length} mine
                    </td>
                    <td className="space-x-1 text-right">
                      {l.id !== activeId && (
                        <Button size="xs" onClick={() => setActive(l.id)}>
                          Select
                        </Button>
                      )}
                      <Link href="/setup/" onClick={() => setActive(l.id)} className="text-xs text-blue-600 underline">
                        Setup
                      </Link>{' '}
                      <Link href="/draft/" onClick={() => setActive(l.id)} className="text-xs text-blue-600 underline">
                        Draft
                      </Link>{' '}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Delete league "${l.name}" and its draft?`)) deleteLeague(l.id);
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Status">
        <ul className="text-sm text-slate-700 dark:text-slate-300">
          <li>
            Players: <b className="num">{dataset.identities.length}</b> · projection rows: <b className="num">{dataset.projections.length}</b> · Yahoo market rows:{' '}
            <b className="num">{dataset.market.length}</b>
          </li>
          <li className="text-xs text-slate-500">All data lives in this browser (IndexedDB). No backend is required during a draft.</li>
        </ul>
        {dataset.projections.length === 0 && (
          <p className="mt-2 text-sm">
            Next step: <Link className="text-blue-600 underline" href="/data/">import projections and Yahoo market data</Link>.
          </p>
        )}
      </Panel>

      <Panel title="Backup / restore">
        <div className="flex flex-wrap gap-2">
          <Button
            data-testid="export-backup"
            onClick={async () => downloadText(`draft-engine-backup-${new Date().toISOString().slice(0, 19)}.json`, JSON.stringify(await exportBackup(), null, 1))}
          >
            Export full backup (JSON)
          </Button>
          <Button disabled={busy} onClick={() => fileRef.current?.click()}>
            Restore from backup…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onRestore(f);
              e.target.value = '';
            }}
          />
        </div>
      </Panel>
    </div>
  );
}
