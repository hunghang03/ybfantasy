'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { compareEvaluations } from '@/domain/recommendations/compare';
import { CATEGORY_LABEL } from '@/domain/types/core';
import { useEngine } from '@/state/useEngine';
import { useActiveDraft, useActiveLeague, useApp } from '@/state/store';
import { downloadText } from '@/lib/ids';
import type { DecisionRecord, PickEvent } from '@/domain/types/league';
import { PlayerDetail } from '@/components/review/PlayerDetail';
import { Button, fmt, Input, Panel, Select, signed } from '@/components/ui/primitives';

export default function ReviewPage() {
  const { ctx, evaluation: ev } = useEngine();
  const [aId, setA] = useState<string>('');
  const [bId, setB] = useState<string>('');
  const [q, setQ] = useState('');
  const options = useMemo(
    () => (ev ? [...ev.players].sort((x, y) => x.priorityRank - y.priorityRank) : []),
    [ev],
  );
  if (!ev || !ctx)
    return (
      <div className="p-6 text-sm">
        No evaluation yet.{' '}
        <Link className="text-blue-600 underline" href="/data/">
          Import data
        </Link>{' '}
        and select a league.
      </div>
    );
  const a = ev.byId.get(aId || options[0]?.playerId || '');
  const b = ev.byId.get(bId || options[1]?.playerId || '');
  const cmp = a && b ? compareEvaluations(a, b) : null;
  const filtered = q ? options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase())) : options;

  return (
    <div className="space-y-3 p-3">
      <DecisionLog />
      <Panel title="Why is A ranked above B?">
        <div className="mb-2 flex flex-wrap items-end gap-2 text-xs">
          <Input
            placeholder="Filter players…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <label className="flex flex-col">
            A
            <Select data-testid="compare-a" value={a?.playerId ?? ''} onChange={(e) => setA(e.target.value)}>
              {filtered.slice(0, 400).map((o) => (
                <option key={o.playerId} value={o.playerId}>
                  #{o.priorityRank} {o.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col">
            B
            <Select data-testid="compare-b" value={b?.playerId ?? ''} onChange={(e) => setB(e.target.value)}>
              {filtered.slice(0, 400).map((o) => (
                <option key={o.playerId} value={o.playerId}>
                  #{o.priorityRank} {o.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        {cmp && (
          <>
            <p className="mb-2 text-sm font-medium" data-testid="compare-summary">
              {cmp.summary}
            </p>
            <table className="text-xs">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pr-4">Term</th>
                  <th className="pr-4 text-right">{a!.name}</th>
                  <th className="pr-4 text-right">{b!.name}</th>
                  <th className="text-right">A − B</th>
                </tr>
              </thead>
              <tbody>
                {cmp.rows.map((r) => (
                  <tr key={r.term} className={r.term.startsWith('=') ? 'border-t font-bold' : ''}>
                    <td className="whitespace-pre pr-4">{r.term}</td>
                    <td className="num pr-4 text-right">{fmt(r.a)}</td>
                    <td className="num pr-4 text-right">{fmt(r.b)}</td>
                    <td
                      className={`num text-right ${r.diff > 0 ? 'text-emerald-700' : r.diff < 0 ? 'text-red-700' : ''}`}
                    >
                      {signed(r.diff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Panel>

      {a && (
        <Panel title="Player A — full breakdown">
          <PlayerDetail p={a} ctx={ctx} />
        </Panel>
      )}
      {b && (
        <Panel title="Player B — full breakdown">
          <PlayerDetail p={b} ctx={ctx} />
        </Panel>
      )}

      <Panel title="Roster context (numeric)">
        <div className="overflow-x-auto">
          <table className="text-xs" data-testid="profile-debug">
            <thead className="text-left text-[10px] uppercase text-slate-500">
              <tr>
                {[
                  'Cat',
                  's',
                  'B(k)',
                  'σT',
                  'd',
                  'state',
                  'need',
                  'surplus',
                  'qP',
                  'qN',
                  'D',
                  'Coh',
                  'Rec',
                  'req',
                  'gain',
                  'score',
                  'π auto',
                  'gate',
                  'damp',
                  'π',
                  'override',
                  'm',
                  'weight',
                ].map((h) => (
                  <th key={h} className="pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ev.profile.map((p) => (
                <tr key={p.category} className="num">
                  <td className="pr-3 font-semibold">{CATEGORY_LABEL[p.category]}</td>
                  <td className="pr-3">{fmt(p.rosterSum)}</td>
                  <td className="pr-3">{fmt(p.expected)}</td>
                  <td className="pr-3">{fmt(p.teamSd)}</td>
                  <td className="pr-3">{fmt(p.d)}</td>
                  <td className="pr-3" title={`shown as ${p.displayState} (${p.maturity})`}>
                    {p.state}
                  </td>
                  <td className="pr-3">{fmt(p.need)}</td>
                  <td className="pr-3">{fmt(p.surplus)}</td>
                  <td className="pr-3">{fmt(p.poolScarcity)}</td>
                  <td className="pr-3">{fmt(p.nextPickScarcity)}</td>
                  <td className="pr-3">{fmt(p.punt.deficit)}</td>
                  <td className="pr-3">{fmt(p.punt.coherence)}</td>
                  <td className="pr-3">{fmt(p.punt.recoverability)}</td>
                  <td className="pr-3">{fmt(p.punt.required)}</td>
                  <td className="pr-3">{fmt(p.punt.gain)}</td>
                  <td className="pr-3">{fmt(p.punt.score)}</td>
                  <td className="pr-3">{fmt(p.punt.piAuto)}</td>
                  <td className="pr-3">{p.punt.hardGatePassed ? 'pass' : '—'}</td>
                  <td className="pr-3">{fmt(p.punt.damping)}</td>
                  <td className="pr-3">{fmt(p.punt.pi)}</td>
                  <td className="pr-3">{p.punt.override}</td>
                  <td className="pr-3">{fmt(p.weightMultiplier)}</td>
                  <td className="pr-3">{fmt(p.effectiveWeight)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          k = {ev.k} · round {ev.round} · rel scale: top {fmt(ev.relScale.top)}, ref {fmt(ev.relScale.ref)}, S{' '}
          {fmt(ev.relScale.spread)} · gap before next {ev.gap.beforeNext}, fallback gap {ev.gap.fallback}, gap
          factor {fmt(ev.gap.factor)} · positions required {JSON.stringify(ev.positions.required)} feasible{' '}
          {String(ev.positions.feasible)}
        </p>
      </Panel>

      <Panel title="Static context">
        <p className="text-xs">
          Population {ctx.population.size} / target {ctx.population.targetSize} (eligible{' '}
          {ctx.population.eligibleCount}, iterations {ctx.population.iterations}, converged{' '}
          {String(ctx.population.converged)}) · p_FG {ctx.population.stats.pFG.toFixed(4)} · p_FT{' '}
          {ctx.population.stats.pFT.toFixed(4)} · replacement PG {fmt(ctx.replacement.perGame)} · missed-game
          L {fmt(ctx.replacement.missedGameLoss)}
          {ctx.replacement.usedFallback ? ' (fallback)' : ''} · ranked {ctx.ranked.length} · unranked (no
          projection) {ctx.unranked.length}
        </p>
        <h4 className="mt-2 text-xs font-semibold uppercase text-slate-500">Warnings</h4>
        <ul className="text-xs">
          {ev.warnings.map((w, i) => (
            <li
              key={i}
              className={
                w.severity === 'critical'
                  ? 'text-red-700'
                  : w.severity === 'warn'
                    ? 'text-amber-700'
                    : 'text-slate-600'
              }
            >
              [{w.code}] {w.message}
            </li>
          ))}
          {ev.finiteRepairs.length > 0 && (
            <li className="text-red-700">Finite repairs: {ev.finiteRepairs.slice(0, 20).join(', ')}</li>
          )}
        </ul>
        <h4 className="mt-2 text-xs font-semibold uppercase text-slate-500">
          Neutral rankings (top 40, not market-influenced)
        </h4>
        <ol className="columns-2 text-xs md:columns-4">
          {[...ctx.ranked]
            .sort((x, y) => x.stats.neutralRank - y.stats.neutralRank)
            .slice(0, 40)
            .map((p) => (
              <li key={p.player.id}>
                {p.stats.neutralRank}. {p.player.name}{' '}
                <span className="num text-slate-500">
                  {fmt(p.stats.neutral9Cat, 1)} · BPV {fmt(p.value.basePlayerValue, 1)}
                </span>
              </li>
            ))}
        </ol>
      </Panel>
    </div>
  );
}

/** Per-pick decision telemetry for the post-draft counterfactual audit. */
function DecisionLog() {
  const league = useActiveLeague();
  const draft = useActiveDraft();
  const config = useApp((s) => s.config);
  const batches = useApp((s) => s.batches);
  if (!league || !draft) return null;
  const mine = draft.events.filter(
    (e): e is PickEvent & { decision: DecisionRecord } => e.type === 'PICK' && e.by === 'ME' && !!e.decision,
  );
  if (mine.length === 0) return null;
  const name = (c: DecisionRecord['selected'] | null) =>
    !c ? '—' : 'name' in c ? c.name : `${c.playerId} (no projection)`;
  return (
    <Panel title={`Draft decision log (${mine.length} of your picks recorded)`}>
      <div className="mb-2 flex gap-2">
        <Button
          size="sm"
          data-testid="export-decisions"
          onClick={() =>
            downloadText(
              `decision-log-${league.name.replace(/[^a-z0-9]+/gi, '-')}-${new Date().toISOString().slice(0, 19)}.json`,
              JSON.stringify(
                {
                  app: 'ybfantasy-draft-engine',
                  kind: 'decision-log',
                  exportedAt: new Date().toISOString(),
                  league,
                  configVersion: config.version,
                  activeBatches: batches.filter((b) => b.status === 'ACTIVE'),
                  // The full event log (all teams' picks, resyncs, voids) reconstructs the pool at every pick.
                  events: draft.events,
                  decisions: mine.map((e) => ({ seq: e.seq, playerId: e.playerId, ...e.decision })),
                },
                null,
                1,
              ),
            )
          }
        >
          Download decision log (JSON)
        </Button>
      </div>
      <table className="w-full text-xs" data-testid="decision-log">
        <thead className="text-left text-slate-500">
          <tr>
            <th>Pick</th>
            <th>Rd</th>
            <th>Selected</th>
            <th>Engine recommendation</th>
            <th className="text-right">DDP sel / rec</th>
            <th>Label</th>
            <th>Build after</th>
          </tr>
        </thead>
        <tbody>
          {mine.map((e) => {
            const d = e.decision;
            const sel = 'ddpRaw' in d.selected ? d.selected : null;
            return (
              <tr key={e.seq} className="border-t border-slate-100 dark:border-slate-800">
                <td className="num">{d.overallPick}</td>
                <td className="num">{d.round}</td>
                <td className={d.followedRecommendation ? '' : 'font-semibold'}>{name(d.selected)}</td>
                <td>{d.followedRecommendation ? '✓ followed' : name(d.recommended)}</td>
                <td className="num text-right">
                  {sel ? fmt(sel.ddpRaw, 2) : '—'} / {d.recommended ? fmt(d.recommended.ddpRaw, 2) : '—'}
                </td>
                <td>{d.timing.label ?? '—'}</td>
                <td>{d.punt.buildAfter ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
