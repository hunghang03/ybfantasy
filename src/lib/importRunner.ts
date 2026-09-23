import { autoMapColumns } from '@/domain/import/fields';
import { parseTable, type ParsedTable } from '@/domain/import/parse';
import { planImport, type CreatePolicy, type ImportPlan } from '@/domain/import/plan';
import type { StrategyConfig } from '@/domain/config/strategyConfig';
import type { ImportKind, ManualMapping, PlayerIdentity } from '@/domain/types/data';
import { newId, nowIso } from './ids';

export interface ImportSpec {
  kind: ImportKind;
  provider: string;
  season: string;
  description: string;
  createPolicy: CreatePolicy;
}

export function parseFileText(name: string, text: string): ParsedTable {
  return parseTable(text, name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
}

export function buildPlan(
  spec: ImportSpec,
  table: ParsedTable,
  columnMap: Record<string, string | null> | null,
  identities: readonly PlayerIdentity[],
  mappings: readonly ManualMapping[],
  config: StrategyConfig,
): ImportPlan {
  return planImport({
    ...spec,
    table,
    columnMap: columnMap ?? autoMapColumns(spec.kind, table.headers),
    identities,
    mappings,
    config,
    batchId: newId(),
    now: nowIso(),
    newId,
  });
}

/** Bundled fictional sample files, in dependency order (primary projections create identities). */
export const SAMPLE_IMPORTS: { file: string; spec: ImportSpec }[] = [
  {
    file: 'projections-hashtag.sample.csv',
    spec: {
      kind: 'PROJECTION',
      provider: 'hashtag',
      season: '2026-27',
      description: 'Sample Hashtag-style projections (fictional)',
      createPolicy: 'AUTO',
    },
  },
  {
    file: 'yahoo-market.sample.csv',
    spec: {
      kind: 'YAHOO_MARKET',
      provider: 'yahoo',
      season: '2026-27',
      description: 'Sample Yahoo market (fictional)',
      createPolicy: 'AUTO',
    },
  },
  {
    file: 'projections-bbm.sample.csv',
    spec: {
      kind: 'PROJECTION',
      provider: 'bbm',
      season: '2026-27',
      description: 'Sample BBM-style validation projections (fictional)',
      createPolicy: 'NEVER',
    },
  },
  {
    file: 'availability.sample.csv',
    spec: {
      kind: 'AVAILABILITY',
      provider: 'manual',
      season: '2026-27',
      description: 'Sample availability history (fictional)',
      createPolicy: 'NEVER',
    },
  },
  {
    file: 'context.sample.csv',
    spec: {
      kind: 'CONTEXT',
      provider: 'manual',
      season: '2026-27',
      description: 'Sample player context (fictional)',
      createPolicy: 'NEVER',
    },
  },
  {
    file: 'playoff-schedule.sample.csv',
    spec: {
      kind: 'PLAYOFF',
      provider: 'manual',
      season: '2026-27',
      description: 'Sample playoff schedule (fictional)',
      createPolicy: 'NEVER',
    },
  },
];
