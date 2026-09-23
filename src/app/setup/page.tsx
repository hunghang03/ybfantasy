'use client';

import { useMemo, useState } from 'react';
import { replay } from '@/domain/draft/replay';
import { userPicks, validateSnake } from '@/domain/draft/snake';
import { ACTIVE_SLOTS } from '@/domain/types/core';
import { rosterSize, type LeagueProfile } from '@/domain/types/league';
import { LeagueProfileSchema } from '@/persistence/backup';
import { useActiveDraft, useActiveLeague, useApp } from '@/state/store';
import { Button, Field, Input, Panel } from '@/components/ui/primitives';

export default function SetupPage() {
  const league = useActiveLeague();
  const createLeague = useApp((s) => s.createLeague);
  if (!league)
    return (
      <div className="p-6 text-sm">
        No league selected. <Button onClick={() => createLeague()}>Create a league</Button>
      </div>
    );
  // Keyed so the form resets whenever another league is selected.
  return <SetupForm key={league.id} league={league} />;
}

function SetupForm({ league }: { league: LeagueProfile }) {
  const draft = useActiveDraft();
  const updateLeague = useApp((s) => s.updateLeague);
  const resetDraft = useApp((s) => s.resetDraft);
  const dataset = useApp((s) => s.dataset);
  const [form, setForm] = useState<LeagueProfile>(league);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const providers = useMemo(() => [...new Set(dataset.projections.map((p) => p.provider))].sort(), [dataset.projections]);

  const rounds = rosterSize(form.roster);
  const picks = validateSnake({ teams: form.teamCount, slot: form.draftPosition, rounds }).length === 0 ? userPicks({ teams: form.teamCount, slot: form.draftPosition, rounds }) : [];
  const inProgress = (draft?.events.length ?? 0) > 0;
  const set = <K extends keyof LeagueProfile>(k: K, v: LeagueProfile[K]) => {
    setForm({ ...form, [k]: v });
    setSaved(false);
  };
  const num = (v: string) => (v === '' ? 0 : Number(v));

  const save = () => {
    const r = LeagueProfileSchema.safeParse(form);
    const snake = validateSnake({ teams: form.teamCount, slot: form.draftPosition, rounds });
    const errs = [...(r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)), ...snake];
    setErrors(errs);
    if (errs.length) return;
    updateLeague(form);
    setSaved(true);
  };

  const st = replay(draft?.events ?? []);

  return (
    <div className="mx-auto max-w-5xl space-y-3 p-3">
      <Panel title={`League setup — ${league.name}`} actions={<Button variant="primary" size="sm" data-testid="save-league" onClick={save}>Save</Button>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="League name">
            <Input data-testid="league-name" value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Season">
            <Input value={form.season} maxLength={12} onChange={(e) => set('season', e.target.value)} />
          </Field>
          <Field label="Number of teams">
            <Input data-testid="team-count" type="number" min={2} max={30} value={form.teamCount} onChange={(e) => set('teamCount', num(e.target.value))} />
          </Field>
          <Field label="Your draft position">
            <Input data-testid="draft-position" type="number" min={1} max={form.teamCount} value={form.draftPosition} onChange={(e) => set('draftPosition', num(e.target.value))} />
          </Field>
          <Field label="Draft type">
            <Input value="Snake" disabled />
          </Field>
          <Field label="Acquisitions / week">
            <Input type="number" min={0} max={50} value={form.acquisitionsPerWeek} onChange={(e) => set('acquisitionsPerWeek', num(e.target.value))} />
          </Field>
          <Field label="Playoff weeks" hint="Comma-separated">
            <Input
              value={form.playoffWeeks.join(',')}
              onChange={(e) => set('playoffWeeks', e.target.value.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => Number.isInteger(n)))}
            />
          </Field>
          <Field label="Primary projection source" hint="Validation sources are compared, never averaged">
            <Input list="providers" value={form.primaryProjectionProvider} onChange={(e) => set('primaryProjectionProvider', e.target.value.trim())} />
          </Field>
          <Field label="Validation sources" hint="Comma-separated provider ids">
            <Input
              value={form.validationProviders.join(',')}
              onChange={(e) => set('validationProviders', e.target.value.split(/[,\s]+/).filter(Boolean))}
            />
          </Field>
          <datalist id="providers">
            {providers.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <h3 className="mt-4 mb-1 text-xs font-semibold uppercase text-slate-500">Roster (Yahoo default: PG SG G SF PF F C C UTIL UTIL + bench; no IL+)</h3>
        <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
          {ACTIVE_SLOTS.map((s) => (
            <Field key={s} label={s}>
              <Input
                type="number"
                min={0}
                max={5}
                value={form.roster.active[s]}
                onChange={(e) => set('roster', { ...form.roster, active: { ...form.roster.active, [s]: num(e.target.value) } })}
              />
            </Field>
          ))}
          <Field label="Bench">
            <Input type="number" min={0} max={10} value={form.roster.bench} onChange={(e) => set('roster', { ...form.roster, bench: num(e.target.value) })} />
          </Field>
          <Field label="IL">
            <Input type="number" min={0} max={6} value={form.roster.il} onChange={(e) => set('roster', { ...form.roster, il: num(e.target.value) })} />
          </Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Drafted rounds = active + bench = <b className="num">{rounds}</b>. IL slots are not drafted.
        </p>

        {errors.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-red-700" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {saved && <p className="mt-2 text-xs text-emerald-700">Saved.</p>}
        {inProgress && (form.draftPosition !== league.draftPosition || form.teamCount !== league.teamCount) && (
          <p className="mt-2 text-xs text-amber-700">
            A draft is in progress. Changing teams/position regenerates your pick schedule; recorded picks are kept (off-schedule picks are flagged).
          </p>
        )}
      </Panel>

      <Panel title="Your snake picks (generated)">
        <div className="flex flex-wrap gap-1" data-testid="user-picks">
          {picks.map((p, i) => (
            <span key={p} className="num rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800" title={`Round ${i + 1}`}>
              {p}
            </span>
          ))}
        </div>
      </Panel>

      <Panel title="Draft state">
        <p className="text-sm">
          Current overall pick <b className="num">{st.currentOverall}</b> · {st.myPicks.length} of your picks recorded · {draft?.events.length ?? 0} events.
        </p>
        <Button
          className="mt-2"
          variant="danger"
          size="sm"
          disabled={!inProgress}
          onClick={() => {
            if (window.confirm('Reset this league’s draft (all picks)? Flags and punt settings are kept.')) resetDraft();
          }}
        >
          Reset draft
        </Button>
      </Panel>
    </div>
  );
}
