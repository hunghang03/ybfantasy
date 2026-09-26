/**
 * Production-data calibration pipeline (docs/CALIBRATION.md).
 *
 *   npx tsx scripts/calibrate.ts --projections data/private/yahoo-projections-2026-27.csv \
 *        --yahoo data/private/yahoo-screenshot-2026-27.csv [--projection-provider yahoo] [--aliases data/aliases.csv] \
 *        [--hashtag data/private/hashtag.csv] [--bbm data/private/bbm.csv] [--availability f.csv] [--context f.csv] [--playoff f.csv] \
 *        [--out reports/private/2026-27] [--label "2026-27 real data"] [--no-scenarios] [--top 200]
 *
 *   (--hashtag / --bbm are optional VALIDATION sources; they are compared, never averaged.)
 *
 *   npx tsx scripts/calibrate.ts --sample      # fictional sample → reports/sample/
 *
 * Reads local files only. Never fetches or scrapes anything. Never changes a strategy weight.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildContext } from '../src/domain';
import { defaultConfig } from '../src/domain/config/defaults';
import { autoMapColumns } from '../src/domain/import/fields';
import { parseTable, type ParsedTable } from '../src/domain/import/parse';
import { planImport } from '../src/domain/import/plan';
import type { Dataset, ImportKind } from '../src/domain/types/data';
import { DEFAULT_ROSTER, type LeagueProfile } from '../src/domain/types/league';
import { calibrationMarkdown, reconciliationMarkdown } from '../src/calibration/markdown';
import { derivePlayoffSchedule } from '../src/calibration/playoffFromProjections';
import { reconcile, type AliasEntry } from '../src/calibration/reconcile';
import { buildCalibrationReport, calibrationCsv } from '../src/calibration/report';
import { runAllScenarios, scenariosMarkdown } from '../src/calibration/scenarios';
import { generateSample } from '../src/lib/sample/generator';

const SEASON = '2026-27';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function readTable(file: string): { table: ParsedTable; sha256: string } {
  const text = readFileSync(file, 'utf8');
  const table = parseTable(text, file.toLowerCase().endsWith('.json') ? 'json' : 'csv');
  if (table.errors.length)
    console.warn(`[${path.basename(file)}] parser notes: ${table.errors.slice(0, 5).join(' · ')}`);
  return { table, sha256: createHash('sha256').update(text).digest('hex') };
}

function readAliases(file: string | undefined): AliasEntry[] {
  if (!file) return [];
  const { table } = readTable(file);
  return table.rows
    .map((r) => ({
      alias: r.alias ?? r.Alias ?? '',
      canonicalName: r.canonical ?? r.Canonical ?? r.canonicalName ?? '',
      team: r.team ?? r.Team ?? null,
    }))
    .filter((a) => a.alias && a.canonicalName);
}

function addSource(
  ds: Dataset,
  kind: ImportKind,
  provider: string,
  table: ParsedTable,
): { ds: Dataset; unmatched: number; rejected: number } {
  const p = planImport({
    kind,
    provider,
    season: SEASON,
    description: provider,
    table,
    columnMap: autoMapColumns(kind, table.headers),
    identities: ds.identities,
    mappings: [],
    config: defaultConfig(),
    createPolicy: 'NEVER',
    batchId: `${provider}-${kind}`,
    now: '1970-01-01T00:00:00.000Z',
    newId: (() => {
      let i = 0;
      return () => `${provider}-${++i}`;
    })(),
  });
  const next: Dataset = {
    ...ds,
    projections: kind === 'PROJECTION' ? [...ds.projections, ...p.records.projections] : ds.projections,
    availability: kind === 'AVAILABILITY' ? p.records.availability : ds.availability,
    context: kind === 'CONTEXT' ? p.records.context : ds.context,
    playoffSchedule: kind === 'PLAYOFF' ? p.records.playoff : ds.playoffSchedule,
  };
  return { ds: next, unmatched: p.unmatched.length, rejected: p.rejected.length };
}

function main() {
  const sample = flag('sample');
  const outDir = arg('out') ?? (sample ? 'reports/sample' : 'reports/private/latest');
  const label =
    arg('label') ??
    (sample
      ? 'FICTIONAL SAMPLE DATA (pipeline validation only — not real players)'
      : `${SEASON} production data`);
  const config = defaultConfig();
  const inputs: Record<string, string> = {};

  const projectionProvider = arg('projection-provider') ?? 'yahoo';
  let primary: ParsedTable;
  let yahoo: ParsedTable;
  const extras: { kind: ImportKind; provider: string; table: ParsedTable }[] = [];
  if (sample) {
    const f = generateSample();
    primary = parseTable(f['projections-yahoo.sample.csv']);
    yahoo = parseTable(f['yahoo-market.sample.csv']);
    extras.push(
      { kind: 'PROJECTION', provider: 'bbm', table: parseTable(f['projections-bbm.sample.csv']) },
      { kind: 'PROJECTION', provider: 'hashtag', table: parseTable(f['projections-hashtag.sample.csv']) },
      { kind: 'AVAILABILITY', provider: 'manual', table: parseTable(f['availability.sample.csv']) },
      { kind: 'CONTEXT', provider: 'manual', table: parseTable(f['context.sample.csv']) },
    );
    inputs.source = 'generateSample(20260923)';
  } else {
    const h = arg('projections');
    const y = arg('yahoo');
    if (!h || !y) {
      console.error(
        'Usage: --projections <csv> --yahoo <csv> [--projection-provider yahoo] [--aliases] [--hashtag] [--bbm] [--availability] [--context] [--playoff] [--out] | --sample',
      );
      process.exit(2);
    }
    const hr = readTable(h);
    const yr = readTable(y);
    primary = hr.table;
    yahoo = yr.table;
    inputs[path.basename(h)] = hr.sha256;
    inputs[path.basename(y)] = yr.sha256;
    for (const [name, kind, provider] of [
      ['hashtag', 'PROJECTION', 'hashtag'],
      ['bbm', 'PROJECTION', 'bbm'],
      ['availability', 'AVAILABILITY', 'manual'],
      ['context', 'CONTEXT', 'manual'],
      ['playoff', 'PLAYOFF', 'manual'],
    ] as const) {
      const file = arg(name);
      if (!file) continue;
      const r = readTable(file);
      inputs[path.basename(file)] = r.sha256;
      extras.push({ kind, provider, table: r.table });
    }
  }

  const { report: recon, dataset: base } = reconcile({
    projections: {
      table: primary,
      provider: projectionProvider,
      description: `${projectionProvider} projections (primary)`,
    },
    yahoo: { table: yahoo, provider: 'yahoo', description: 'Yahoo market (screenshot transcription)' },
    aliases: readAliases(arg('aliases')),
    season: SEASON,
    config,
  });

  let ds = base;
  const extraNotes: string[] = [];
  for (const e of extras) {
    const r = addSource(ds, e.kind, e.provider, e.table);
    ds = r.ds;
    extraNotes.push(`${e.kind}/${e.provider}: ${r.unmatched} unmatched, ${r.rejected} rejected`);
  }
  // No explicit playoff file: derive from per-player week columns, preferring the primary provider, else the
  // first validation provider that publishes them. None → PlayoffAdjustment stays neutral (never fabricated).
  const weekSource = [projectionProvider, ...extras.map((e) => e.provider)].find((p) =>
    ds.projections.some((x) => x.provider === p && x.weekGames && Object.keys(x.weekGames).length),
  );
  if (ds.playoffSchedule.length === 0 && weekSource) {
    const derived = derivePlayoffSchedule(
      ds.projections,
      ds.identities,
      weekSource,
      SEASON,
      'derived-playoff',
    );
    ds = { ...ds, playoffSchedule: derived.schedule };
    extraNotes.push(
      `Playoff schedule derived from ${weekSource} week columns: ${derived.schedule.length} teams, ${derived.conflicts.length} within-team conflicts`,
    );
  }

  const validationProviders = [
    ...new Set(extras.filter((e) => e.kind === 'PROJECTION').map((e) => e.provider)),
  ].sort();
  const league: LeagueProfile = {
    id: 'calibration',
    name: 'Calibration 14-team H2H 9-cat',
    season: SEASON,
    teamCount: Number(arg('teams') ?? 14),
    draftPosition: 1,
    draftType: 'SNAKE',
    roster: structuredClone(DEFAULT_ROSTER),
    acquisitionsPerWeek: 4,
    playoffWeeks: [18, 19, 20, 21],
    primaryProjectionProvider: projectionProvider,
    validationProviders,
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
  const teamMismatchIds = new Set(recon.teamMismatch.map((t) => t.canonicalPlayerId!).filter(Boolean));
  const calib = buildCalibrationReport({
    dataset: ds,
    league,
    config,
    teamMismatchIds,
    topN: Number(arg('top') ?? 200),
  });

  mkdirSync(path.join(outDir, 'scenarios'), { recursive: true });
  const write = (name: string, text: string) => writeFileSync(path.join(outDir, name), text);
  write('reconciliation.json', JSON.stringify(recon, null, 1));
  write('reconciliation.md', reconciliationMarkdown(recon, label));
  write('calibration.json', JSON.stringify(calib, null, 1));
  write('calibration.csv', calibrationCsv(calib));
  write('calibration.md', calibrationMarkdown(calib, label));

  let scenarioCount = 0;
  if (!flag('no-scenarios')) {
    const ctx = buildContext(ds, league, config);
    const opponents = flag('opponents-preseason') ? 'MARKET_OR_PRESEASON' : 'MARKET';
    const results = runAllScenarios(ctx, opponents);
    extraNotes.push(`Scenario opponents: ${opponents}`);
    scenarioCount = results.length;
    for (const r of results)
      write(
        path.join('scenarios', `slot${String(r.slot).padStart(2, '0')}-${r.foundation}.json`),
        JSON.stringify(r, null, 1),
      );
    write('scenarios.md', scenariosMarkdown(results));
  }
  write(
    'manifest.json',
    JSON.stringify(
      {
        label,
        season: SEASON,
        configVersion: config.version,
        inputs,
        notes: extraNotes,
        counts: recon.counts,
        calibration: calib.summary,
        scenarios: scenarioCount,
      },
      null,
      1,
    ),
  );
  console.log(`Wrote reports to ${outDir}`);
  console.log(`Reconciliation: ${JSON.stringify(recon.counts)}`);
  console.log(`Calibration: ${JSON.stringify(calib.summary)}`);
  for (const n of extraNotes) console.log(`- ${n}`);
}

main();
