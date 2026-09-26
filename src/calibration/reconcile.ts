import type { StrategyConfig } from '@/domain/config/strategyConfig';
import { autoMapColumns } from '@/domain/import/fields';
import { normalizeTeam } from '@/domain/identity/normalize';
import type { ParsedTable } from '@/domain/import/parse';
import { planImport, type ImportPlan } from '@/domain/import/plan';
import type { Dataset, ImportKind, PlayerIdentity } from '@/domain/types/data';
import { applyAliases, type AliasEntry } from '@/domain/identity/aliases';

/**
 * Yahoo (market) ↔ primary projection provider reconciliation for the calibration workflow (provider-generic;
 * Yahoo projections are the default primary source, Hashtag/BBM are optional validation sources).
 *
 * Matching order is the app's normal import order (DATA_IMPORT.md): manual mapping → provider id →
 * normalized name + team → alias → unique normalized name → review. Aliases come from a user-maintained
 * alias table. Nothing is silently discarded: every market and projection row lands in exactly one bucket.
 */

export type { AliasEntry } from '@/domain/identity/aliases';
export { applyAliases } from '@/domain/identity/aliases';

export interface SourceInput {
  table: ParsedTable;
  columnMap?: Record<string, string | null>;
  provider: string;
  description: string;
}

export interface ReconRow {
  name: string;
  team: string | null;
  otherName?: string | null;
  otherTeam?: string | null;
  canonicalPlayerId?: string;
  via?: string;
  candidates?: string[];
  note?: string;
}

export interface ReconciliationReport {
  season: string;
  counts: {
    projectionRows: number;
    yahooRows: number;
    matched: number;
    yahooOnly: number;
    projectionOnly: number;
    ambiguous: number;
    teamMismatch: number;
    projectionRejected: number;
    yahooRejected: number;
    duplicates: number;
  };
  matched: ReconRow[];
  yahooOnly: ReconRow[];
  projectionOnly: ReconRow[];
  ambiguous: ReconRow[];
  teamMismatch: ReconRow[];
  rejected: { source: string; rowNumber: number; name: string; errors: string[] }[];
  duplicates: { source: string; rowNumber: number; name: string }[];
  aliasProblems: string[];
  matchedVia: Record<string, number>;
}

function seqIds(prefix: string): () => string {
  let i = 0;
  return () => `${prefix}-${String(++i).padStart(5, '0')}`;
}

function plan(
  kind: ImportKind,
  src: SourceInput,
  identities: readonly PlayerIdentity[],
  season: string,
  config: StrategyConfig,
  createPolicy: 'AUTO' | 'CREATE_UNMATCHED' | 'NEVER',
  idPrefix: string,
): ImportPlan {
  return planImport({
    kind,
    provider: src.provider,
    season,
    description: src.description,
    table: src.table,
    columnMap: src.columnMap ?? autoMapColumns(kind, src.table.headers),
    identities,
    mappings: [],
    config,
    createPolicy,
    batchId: `${idPrefix}-batch`,
    now: '1970-01-01T00:00:00.000Z',
    newId: seqIds(idPrefix),
  });
}

export function reconcile(args: {
  /** Primary projection source (its `provider` is used in labels). */
  projections: SourceInput;
  yahoo: SourceInput;
  aliases?: readonly AliasEntry[];
  season: string;
  config: StrategyConfig;
}): {
  report: ReconciliationReport;
  dataset: Dataset;
  plans: { projections: ImportPlan; yahoo: ImportPlan };
} {
  const { season, config } = args;
  // 1. Primary projections define identities.
  const hb = plan('PROJECTION', args.projections, [], season, config, 'CREATE_UNMATCHED', 'hb');
  const aliased = applyAliases(hb.newIdentities, args.aliases ?? []);
  const identities = aliased.identities;

  // 2. Classify Yahoo rows without creating anything.
  const classify = plan('YAHOO_MARKET', args.yahoo, identities, season, config, 'NEVER', 'yc');
  const byId = new Map(identities.map((i) => [i.canonicalPlayerId, i]));
  const yahooMap = args.yahoo.columnMap ?? autoMapColumns('YAHOO_MARKET', args.yahoo.table.headers);
  const nameH = yahooMap.name ?? '';
  const teamH = yahooMap.team ?? '';

  const matched: ReconRow[] = [];
  const teamMismatch: ReconRow[] = [];
  const matchedIds = new Set<string>();
  for (const m of classify.records.market) {
    const id = byId.get(m.canonicalPlayerId)!;
    const yName = m.raw?.[nameH] ?? '';
    const yTeam = normalizeTeam(m.raw?.[teamH] ?? null);
    matchedIds.add(m.canonicalPlayerId);
    const row: ReconRow = {
      name: id.canonicalName,
      team: id.nbaTeam,
      otherName: yName,
      otherTeam: yTeam,
      canonicalPlayerId: id.canonicalPlayerId,
    };
    matched.push(row);
    if (yTeam && id.nbaTeam && yTeam !== id.nbaTeam)
      teamMismatch.push({
        ...row,
        note: `${args.projections.provider} ${id.nbaTeam} vs Yahoo ${yTeam} (Yahoo team is kept for identity)`,
      });
  }
  const yahooOnly: ReconRow[] = classify.unmatched
    .filter((u) => u.reason === 'NO_MATCH')
    .map((u) => ({ name: u.rawName, team: normalizeTeam(u.rawTeam) }));
  const ambiguous: ReconRow[] = classify.unmatched
    .filter((u) => u.reason === 'AMBIGUOUS')
    .map((u) => ({
      name: u.rawName,
      team: normalizeTeam(u.rawTeam),
      candidates: u.candidateIds.map((c) => `${byId.get(c)?.canonicalName} (${byId.get(c)?.nbaTeam ?? '—'})`),
    }));
  const projectionOnly: ReconRow[] = identities
    .filter((i) => !matchedIds.has(i.canonicalPlayerId))
    .map((i) => ({ name: i.canonicalName, team: i.nbaTeam, canonicalPlayerId: i.canonicalPlayerId }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // 3. Build the working dataset: Yahoo-only players are created (so they are never discarded — they
  //    appear as unranked, market-only players); ambiguous rows stay out and are listed for review.
  const yahoo = plan('YAHOO_MARKET', args.yahoo, identities, season, config, 'CREATE_UNMATCHED', 'yo');
  const updated = new Map(yahoo.identityUpdates.map((p) => [p.canonicalPlayerId, p]));
  const dataset: Dataset = {
    identities: [...identities.map((p) => updated.get(p.canonicalPlayerId) ?? p), ...yahoo.newIdentities],
    market: yahoo.records.market,
    projections: hb.records.projections,
    availability: [],
    context: [],
    playoffSchedule: [],
  };

  const rejected = [
    ...hb.rejected.map((r) => ({ source: args.projections.provider, ...r })),
    ...classify.rejected.map((r) => ({ source: 'yahoo', ...r })),
  ];
  const duplicates = [
    ...hb.duplicates.map((d) => ({
      source: args.projections.provider,
      rowNumber: d.rowNumber,
      name: d.name,
    })),
    ...classify.duplicates.map((d) => ({ source: 'yahoo', rowNumber: d.rowNumber, name: d.name })),
  ];
  const report: ReconciliationReport = {
    season,
    counts: {
      projectionRows: args.projections.table.rows.length,
      yahooRows: args.yahoo.table.rows.length,
      matched: matched.length,
      yahooOnly: yahooOnly.length,
      projectionOnly: projectionOnly.length,
      ambiguous: ambiguous.length,
      teamMismatch: teamMismatch.length,
      projectionRejected: hb.rejected.length,
      yahooRejected: classify.rejected.length,
      duplicates: duplicates.length,
    },
    matched: matched.sort((a, b) => a.name.localeCompare(b.name)),
    yahooOnly,
    projectionOnly,
    ambiguous,
    teamMismatch,
    rejected,
    duplicates,
    aliasProblems: aliased.problems,
    matchedVia: classify.matchedVia,
  };
  return { report, dataset, plans: { projections: hb, yahoo } };
}
