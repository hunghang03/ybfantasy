'use client';

import { useMemo, useRef, useState } from 'react';
import { FIELD_SPECS, autoMapColumns, detectWeekColumns } from '@/domain/import/fields';
import { validateRow } from '@/domain/import/rows';
import type { ParsedTable } from '@/domain/import/parse';
import type { ImportPlan } from '@/domain/import/plan';
import { buildIdentityIndex, suggestCandidates } from '@/domain/identity/matcher';
import { IMPORT_KINDS, type ImportKind } from '@/domain/types/data';
import { buildPlan, parseFileText, SAMPLE_IMPORTS, type ImportSpec } from '@/lib/importRunner';
import { useApp } from '@/state/store';
import { Button, Field, Input, Panel, Select, cx } from '@/components/ui/primitives';

const KIND_LABEL: Record<ImportKind, string> = {
  PROJECTION: 'Projections',
  YAHOO_MARKET: 'Yahoo market (XRank / Rank / L7 ADP)',
  AVAILABILITY: 'Availability history',
  CONTEXT: 'Player context (age, status, upside, tags)',
  PLAYOFF: 'Playoff schedule (team games per week)',
};
const DEFAULT_PROVIDER: Record<ImportKind, string> = { PROJECTION: 'hashtag', YAHOO_MARKET: 'yahoo', AVAILABILITY: 'manual', CONTEXT: 'manual', PLAYOFF: 'manual' };

export default function DataPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-3 p-3">
      <ImportWizard />
      <UnmatchedReview />
      <BatchHistory />
    </div>
  );
}

function ImportWizard() {
  const dataset = useApp((s) => s.dataset);
  const mappings = useApp((s) => s.mappings);
  const config = useApp((s) => s.config);
  const commitImport = useApp((s) => s.commitImport);
  const notify = useApp((s) => s.notify);
  const [spec, setSpec] = useState<ImportSpec>({ kind: 'PROJECTION', provider: 'hashtag', season: '2026-27', description: '', createPolicy: 'AUTO' });
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string | null>>({});
  const [report, setReport] = useState<ImportPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const plan = useMemo(() => (table ? buildPlan(spec, table, columnMap, dataset.identities, mappings, config) : null), [spec, table, columnMap, dataset.identities, mappings, config]);

  const loadFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      notify('File exceeds the 5 MB limit.');
      return;
    }
    const t = parseFileText(f.name, await f.text());
    setFileName(f.name);
    setTable(t);
    setColumnMap(autoMapColumns(spec.kind, t.headers));
    setReport(null);
    if (!spec.description) setSpec((s) => ({ ...s, description: f.name }));
  };

  const changeKind = (kind: ImportKind) => {
    setSpec({ ...spec, kind, provider: DEFAULT_PROVIDER[kind] });
    if (table) setColumnMap(autoMapColumns(kind, table.headers));
  };

  const commit = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await commitImport(plan);
      setReport(plan);
      setTable(null);
      setFileName(null);
      notify(`Imported ${plan.batch.counts.matched} rows (${plan.batch.counts.created} new players, ${plan.batch.counts.unmatched} to review, ${plan.batch.counts.rejected} rejected).`);
    } catch (e) {
      notify(`Import failed and was rolled back: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const loadSamples = async () => {
    setBusy(true);
    try {
      for (const s of SAMPLE_IMPORTS) {
        const res = await fetch(`/sample-data/${s.file}`);
        if (!res.ok) throw new Error(`Could not load ${s.file}`);
        const t = parseFileText(s.file, await res.text());
        const st = useApp.getState();
        await commitImport(buildPlan(s.spec, t, null, st.dataset.identities, st.mappings, st.config));
      }
      notify('Fictional sample dataset loaded (primary: hashtag, validation: bbm).');
    } catch (e) {
      notify(`Sample load failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const specs = FIELD_SPECS[spec.kind];
  const weekCols = table && spec.kind === 'PLAYOFF' ? detectWeekColumns(table.headers) : {};
  const previewRows = table?.rows.slice(0, 8) ?? [];

  return (
    <Panel
      title="Import data (CSV or JSON)"
      actions={
        <Button size="sm" disabled={busy} onClick={loadSamples} data-testid="load-sample">
          Load fictional sample data
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="Dataset type">
          <Select data-testid="import-kind" value={spec.kind} onChange={(e) => changeKind(e.target.value as ImportKind)}>
            {IMPORT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Provider id" hint={spec.kind === 'PROJECTION' ? 'e.g. hashtag, bbm, yahoo' : undefined}>
          <Input data-testid="import-provider" value={spec.provider} maxLength={40} onChange={(e) => setSpec({ ...spec, provider: e.target.value.trim().toLowerCase() })} />
        </Field>
        <Field label="Season">
          <Input value={spec.season} maxLength={12} onChange={(e) => setSpec({ ...spec, season: e.target.value })} />
        </Field>
        <Field label="Source / version note">
          <Input value={spec.description} maxLength={120} onChange={(e) => setSpec({ ...spec, description: e.target.value })} />
        </Field>
        <Field label="Unmatched players" hint="Ambiguous names are never merged">
          <Select value={spec.createPolicy} onChange={(e) => setSpec({ ...spec, createPolicy: e.target.value as ImportSpec['createPolicy'] })}>
            <option value="AUTO">Auto (create only on first import)</option>
            <option value="CREATE_UNMATCHED">Create new players for no-match rows</option>
            <option value="NEVER">Send all unmatched to review</option>
          </Select>
        </Field>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) void loadFile(f);
        }}
        className={cx('mt-3 flex items-center justify-center gap-2 rounded border-2 border-dashed p-4 text-sm', drag ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-300 dark:border-slate-700')}
      >
        <span>{fileName ? `Loaded: ${fileName} (${table?.rows.length ?? 0} rows)` : 'Drag & drop a CSV/JSON file here, or'}</span>
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          Choose file…
        </Button>
        <input
          ref={fileRef}
          data-testid="import-file"
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void loadFile(f);
            e.target.value = '';
          }}
        />
      </div>

      {table && (
        <div className="mt-3 space-y-3">
          {table.errors.length > 0 && <p className="text-xs text-amber-700">Parser notes: {table.errors.slice(0, 5).join(' · ')}</p>}
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Column mapping</h3>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
              {specs.map((f) => (
                <Field key={f.key} label={`${f.label}${f.required ? ' *' : ''}`} hint={f.help}>
                  <Select
                    value={columnMap[f.key] ?? ''}
                    onChange={(e) => setColumnMap({ ...columnMap, [f.key]: e.target.value || null })}
                    className={f.required && !columnMap[f.key] ? 'border-red-500' : ''}
                  >
                    <option value="">— not mapped —</option>
                    {table.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
            {spec.kind === 'PLAYOFF' && <p className="mt-1 text-xs text-slate-500">Week columns detected: {Object.keys(weekCols).join(', ') || 'none (use W18, W19, …)'}</p>}
          </div>

          <div className="overflow-x-auto">
            <h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Preview (first rows, validated)</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pr-2">#</th>
                  {table.headers.slice(0, 14).map((h) => (
                    <th key={h} className="pr-2">
                      {h}
                    </th>
                  ))}
                  <th>Validation</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => {
                  const v = validateRow(spec.kind, r, columnMap, config, weekCols);
                  return (
                    <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="pr-2 text-slate-400">{i + 2}</td>
                      {table.headers.slice(0, 14).map((h) => (
                        <td key={h} className="max-w-[10rem] truncate pr-2">
                          {r[h]}
                        </td>
                      ))}
                      <td className={v.ok ? 'text-emerald-700' : 'text-red-700'}>{v.ok ? (v.warnings.length ? `OK (${v.warnings[0]})` : 'OK') : v.errors.join(' ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {plan && <PlanSummary plan={plan} />}

          <div className="flex gap-2">
            <Button
              variant="primary"
              data-testid="commit-import"
              disabled={busy || !plan || plan.missingRequiredColumns.length > 0 || plan.batch.counts.matched + plan.unmatched.length === 0}
              onClick={commit}
            >
              Import {plan ? `${plan.batch.counts.matched} rows` : ''}
            </Button>
            <Button
              onClick={() => {
                setTable(null);
                setFileName(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {report && (
        <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-2 text-xs dark:border-emerald-800 dark:bg-emerald-950" data-testid="import-report">
          <b>Import report</b> — {report.batch.kind} / {report.batch.provider}: {report.batch.counts.matched} imported, {report.batch.counts.created} new players,{' '}
          {report.batch.counts.unmatched} unmatched (see review below), {report.rejected.length} rejected, {report.duplicates.length} duplicates. Matched via:{' '}
          {Object.entries(report.matchedVia)
            .map(([k, v]) => `${k} ${v}`)
            .join(', ') || '—'}
        </div>
      )}
    </Panel>
  );
}

function PlanSummary({ plan }: { plan: ImportPlan }) {
  const c = plan.batch.counts;
  return (
    <div className="rounded bg-slate-50 p-2 text-xs dark:bg-slate-800" data-testid="import-summary">
      {plan.missingRequiredColumns.length > 0 && <p className="font-semibold text-red-700">Missing required columns: {plan.missingRequiredColumns.join(', ')}</p>}
      <p>
        Rows {c.rows} · will import <b>{c.matched}</b> · new players <b>{c.created}</b> · to review <b>{c.unmatched}</b> · rejected <b>{plan.rejected.length}</b> · duplicates{' '}
        <b>{plan.duplicates.length}</b> · warnings <b>{plan.rowWarnings.length}</b>
      </p>
      {plan.rejected.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-red-700">Rejected rows</summary>
          <ul className="max-h-40 overflow-auto pl-4">
            {plan.rejected.slice(0, 100).map((r) => (
              <li key={r.rowNumber}>
                Row {r.rowNumber} {r.name}: {r.errors.join(' ')}
              </li>
            ))}
          </ul>
        </details>
      )}
      {plan.duplicates.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer">Duplicate rows (first kept)</summary>
          <ul className="max-h-40 overflow-auto pl-4">
            {plan.duplicates.map((r) => (
              <li key={r.rowNumber}>
                Row {r.rowNumber} {r.name}
              </li>
            ))}
          </ul>
        </details>
      )}
      {plan.rowWarnings.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-amber-700">Row warnings</summary>
          <ul className="max-h-40 overflow-auto pl-4">
            {plan.rowWarnings.slice(0, 100).map((r) => (
              <li key={r.rowNumber}>
                Row {r.rowNumber} {r.name}: {r.warnings.join(' ')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function UnmatchedReview() {
  const unmatched = useApp((s) => s.unmatched);
  const identities = useApp((s) => s.dataset.identities);
  const resolve = useApp((s) => s.resolveUnmatched);
  const notify = useApp((s) => s.notify);
  const idx = useMemo(() => buildIdentityIndex(identities, []), [identities]);
  const byId = useMemo(() => new Map(identities.map((i) => [i.canonicalPlayerId, i])), [identities]);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  if (unmatched.length === 0) return null;
  const run = async (rowId: string, r: Parameters<typeof resolve>[1]) => {
    try {
      await resolve(rowId, r);
    } catch (e) {
      notify(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <Panel title={`Unmatched players — manual review (${unmatched.length})`}>
      <p className="mb-2 text-xs text-slate-500">Decisions are saved as manual mappings and reused on every future import from the same provider.</p>
      <Input placeholder="Search players to map…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-2 w-64" />
      <table className="w-full text-xs">
        <thead className="text-left text-slate-500">
          <tr>
            <th>Source row</th>
            <th>Reason</th>
            <th>Map to</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {unmatched.slice(0, 200).map((u) => {
            const sugg = u.reason === 'AMBIGUOUS' ? u.candidateIds.map((id) => byId.get(id)).filter(Boolean) : suggestCandidates(idx, u.rawName).map((s) => byId.get(s.canonicalPlayerId));
            const searched = filter.length >= 2 ? identities.filter((i) => i.canonicalName.toLowerCase().includes(filter.toLowerCase())).slice(0, 20) : [];
            const options = [...new Map([...sugg, ...searched].filter((x): x is NonNullable<typeof x> => !!x).map((x) => [x.canonicalPlayerId, x])).values()];
            return (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="py-1">
                  <b>{u.rawName}</b> {u.rawTeam && <span className="text-slate-500">({u.rawTeam})</span>}{' '}
                  <span className="text-slate-400">
                    {u.kind}/{u.provider}
                  </span>
                </td>
                <td>{u.reason === 'AMBIGUOUS' ? 'Ambiguous' : 'No match'}</td>
                <td>
                  <Select value={choice[u.id] ?? ''} onChange={(e) => setChoice({ ...choice, [u.id]: e.target.value })}>
                    <option value="">— choose player —</option>
                    {options.map((o) => (
                      <option key={o.canonicalPlayerId} value={o.canonicalPlayerId}>
                        {o.canonicalName} {o.nbaTeam ? `(${o.nbaTeam})` : ''} {o.positions.join('/')}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="space-x-1 whitespace-nowrap text-right">
                  <Button size="xs" variant="primary" disabled={!choice[u.id]} onClick={() => run(u.id, { canonicalPlayerId: choice[u.id]! })}>
                    Map
                  </Button>
                  <Button size="xs" onClick={() => run(u.id, { create: true })}>
                    Create new
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => run(u.id, { ignore: true })}>
                    Ignore
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

function BatchHistory() {
  const batches = useApp((s) => s.batches);
  const revert = useApp((s) => s.revertBatch);
  if (batches.length === 0) return null;
  return (
    <Panel title="Import history (source-isolated, versioned)">
      <table className="w-full text-xs" data-testid="batch-history">
        <thead className="text-left text-slate-500">
          <tr>
            <th>Imported</th>
            <th>Type</th>
            <th>Provider</th>
            <th>Season</th>
            <th>Description</th>
            <th>Rows</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {batches.map((b) => (
            <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-1">{new Date(b.importedAt).toLocaleString()}</td>
              <td>{b.kind}</td>
              <td>{b.provider}</td>
              <td>{b.season}</td>
              <td className="max-w-xs truncate">{b.description}</td>
              <td className="num">
                {b.counts.matched}/{b.counts.rows}
              </td>
              <td className={b.status === 'ACTIVE' ? 'font-semibold text-emerald-700' : 'text-slate-500'}>{b.status}</td>
              <td className="text-right">
                {b.status === 'ACTIVE' && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm('Revert this import? The previous version of this source becomes active again.')) void revert(b.id);
                    }}
                  >
                    Revert
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
