/**
 * Validate a Yahoo projection snapshot against the Yahoo market dataset through the PRODUCTION import path
 * (parseFileText → buildPlan(AUTO) → repository.commitImport → loadDataset → engine). Local files only.
 *
 *   npx tsx scripts/yahoo-projections.ts --market data/private/yahoo-screenshot-2026-27.csv \
 *        --projections data/private/yahoo-projections-2026-27.csv [--out reports/private/yahoo-projections]
 *
 * Prints import counts, rejected rows, warnings, captures, reconciliation buckets and engine status, and writes
 * the full JSON report under the (git-ignored) output directory. Never edits either input file.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { runEngine } from '../src/domain';
import { defaultConfig } from '../src/domain/config/defaults';
import { autoMapColumns } from '../src/domain/import/fields';
import { reconcileMarketAndProjections } from '../src/domain/dataset/reconcileSources';
import { DEFAULT_ROSTER, type LeagueProfile } from '../src/domain/types/league';
import { buildPlan, parseFileText, type ImportSpec } from '../src/lib/importRunner';
import { createMemoryRepository } from '../src/persistence/memoryRepository';

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const marketFile = arg('market');
  const projFile = arg('projections');
  if (!marketFile || !projFile) {
    console.error('Usage: --market <yahoo market csv> --projections <yahoo projection csv> [--out dir]');
    process.exit(2);
  }
  const outDir = arg('out') ?? 'reports/private/yahoo-projections';
  const cfg = defaultConfig();
  const repo = createMemoryRepository();
  const summary: Record<string, unknown> = {};

  const steps: { file: string; spec: ImportSpec }[] = [
    {
      file: marketFile,
      spec: {
        kind: 'YAHOO_MARKET',
        provider: 'yahoo',
        season: '2026-27',
        description: 'Yahoo market',
        createPolicy: 'AUTO',
      },
    },
    {
      file: projFile,
      spec: {
        kind: 'PROJECTION',
        provider: 'yahoo',
        season: '2026-27',
        description: 'Yahoo projection snapshot',
        createPolicy: 'AUTO',
      },
    },
  ];
  for (const s of steps) {
    const text = readFileSync(s.file, 'utf8');
    const table = parseFileText(s.file, text);
    const ds = await repo.loadDataset();
    const plan = buildPlan(s.spec, table, null, ds.identities, await repo.listMappings(), cfg);
    const hist: Record<string, number> = {};
    for (const w of plan.rowWarnings) for (const m of w.warnings) hist[m] = (hist[m] ?? 0) + 1;
    const key = s.spec.kind;
    summary[key] = {
      file: path.basename(s.file),
      sha256: createHash('sha256').update(text).digest('hex'),
      headers: table.headers,
      unmappedHeaders: table.headers.filter(
        (h) => !Object.values(autoMapColumns(s.spec.kind, table.headers)).includes(h),
      ),
      counts: plan.batch.counts,
      missingRequiredColumns: plan.missingRequiredColumns,
      rejected: plan.rejected,
      duplicates: plan.duplicates,
      warnings: plan.rowWarnings.reduce((n, w) => n + w.warnings.length, 0),
      warningKinds: hist,
      batchWarnings: plan.batchWarnings,
      capturedAt: plan.batch.capturedAt ?? [],
      matchedVia: plan.matchedVia,
    };
    console.log(`\n== ${key} (${path.basename(s.file)}) ==`);
    console.log(
      JSON.stringify({
        counts: plan.batch.counts,
        rejected: plan.rejected.length,
        warnings: plan.rowWarnings.reduce((n, w) => n + w.warnings.length, 0),
        capturedAt: plan.batch.capturedAt,
        matchedVia: plan.matchedVia,
        unmappedHeaders: (summary[key] as { unmappedHeaders: string[] }).unmappedHeaders,
      }),
    );
    for (const r of plan.rejected.slice(0, 20))
      console.log(`  REJECTED row ${r.rowNumber} ${r.name}: ${r.errors.join(' ')}`);
    for (const w of plan.batchWarnings) console.log(`  BATCH WARNING: ${w}`);
    if (plan.missingRequiredColumns.length)
      console.log(`  MISSING COLUMNS: ${plan.missingRequiredColumns.join(', ')}`);
    await repo.commitImport(plan);
  }

  const ds = await repo.loadDataset();
  const batches = await repo.listBatches();
  const recon = reconcileMarketAndProjections(
    ds,
    'yahoo',
    await repo.listUnmatched(),
    new Set(batches.filter((b) => b.status === 'ACTIVE').map((b) => b.id)),
  );
  summary.reconciliation = recon;
  console.log('\n== Reconciliation (Yahoo market ↔ Yahoo projections) ==');
  console.log(JSON.stringify(recon.counts));

  const league: LeagueProfile = {
    id: 'check',
    name: 'check',
    season: '2026-27',
    teamCount: 14,
    draftPosition: 1,
    draftType: 'SNAKE',
    roster: structuredClone(DEFAULT_ROSTER),
    acquisitionsPerWeek: 4,
    playoffWeeks: [18, 19, 20, 21],
    primaryProjectionProvider: 'yahoo',
    validationProviders: [],
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
  const { ctx, evaluation } = runEngine(ds, league, cfg, { events: [], flags: {}, puntOverrides: {} });
  summary.engine = {
    status: evaluation.status,
    ranked: ctx.ranked.length,
    unranked: ctx.unranked.length,
    warnings: evaluation.warnings.map((w) => w.code),
  };
  console.log('\n== Engine ==');
  console.log(JSON.stringify(summary.engine));

  mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, 'yahoo-projections-validation.json');
  writeFileSync(out, JSON.stringify(summary, null, 1));
  console.log(`\nReport: ${out}`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
