import { defaultConfig } from '@/domain/config/defaults';
import type { StrategyConfig } from '@/domain/config/strategyConfig';
import { normalizeName } from '@/domain/identity/normalize';
import { parseTable } from '@/domain/import/parse';
import { autoMapColumns } from '@/domain/import/fields';
import { planImport } from '@/domain/import/plan';
import { buildContext } from '@/domain';
import { evaluateDraft, type DraftInput } from '@/domain/recommendations/engine';
import type { Dataset, ImportKind, PlayerIdentity, ProjectionLine, YahooMarket } from '@/domain/types/data';
import type { Position } from '@/domain/types/core';
import { DEFAULT_ROSTER, type LeagueProfile } from '@/domain/types/league';
import { generateSample } from '@/lib/sample/generator';

export function league(over: Partial<LeagueProfile> = {}): LeagueProfile {
  return {
    id: 'L1',
    name: 'Test League',
    season: '2026-27',
    teamCount: 14,
    draftPosition: 11,
    draftType: 'SNAKE',
    roster: structuredClone(DEFAULT_ROSTER),
    acquisitionsPerWeek: 4,
    playoffWeeks: [18, 19, 20, 21],
    primaryProjectionProvider: 'hashtag',
    validationProviders: ['bbm'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

let counter = 0;
export function seqId(prefix = 'id'): () => string {
  let i = 0;
  return () => `${prefix}-${String(++i).padStart(5, '0')}`;
}

/** Import one CSV text into a dataset through the real import pipeline. */
export function importInto(
  ds: Dataset,
  kind: ImportKind,
  provider: string,
  text: string,
  config: StrategyConfig = defaultConfig(),
  createPolicy: 'AUTO' | 'CREATE_UNMATCHED' | 'NEVER' = 'AUTO',
): Dataset {
  const table = parseTable(text);
  const plan = planImport({
    kind,
    provider,
    season: '2026-27',
    description: 'test',
    table,
    columnMap: autoMapColumns(kind, table.headers),
    identities: ds.identities,
    mappings: [],
    config,
    createPolicy,
    batchId: `batch-${kind}-${provider}-${++counter}`,
    now: '2026-01-01T00:00:00.000Z',
    newId: seqId(`${kind}-${provider}`),
  });
  const updated = new Map(plan.identityUpdates.map((p) => [p.canonicalPlayerId, p]));
  return {
    identities: [...ds.identities.map((p) => updated.get(p.canonicalPlayerId) ?? p), ...plan.newIdentities],
    market: kind === 'YAHOO_MARKET' ? plan.records.market : ds.market,
    projections:
      kind === 'PROJECTION'
        ? [...ds.projections.filter((p) => p.provider !== provider), ...plan.records.projections]
        : ds.projections,
    availability: kind === 'AVAILABILITY' ? plan.records.availability : ds.availability,
    context: kind === 'CONTEXT' ? plan.records.context : ds.context,
    playoffSchedule: kind === 'PLAYOFF' ? plan.records.playoff : ds.playoffSchedule,
  };
}

let sampleCache: Dataset | null = null;
/** The fictional sample dataset loaded through the import pipeline (projections first). */
export function sampleDataset(): Dataset {
  if (sampleCache) return structuredClone(sampleCache);
  const f = generateSample();
  let ds: Dataset = {
    identities: [],
    market: [],
    projections: [],
    availability: [],
    context: [],
    playoffSchedule: [],
  };
  ds = importInto(ds, 'PROJECTION', 'hashtag', f['projections-hashtag.sample.csv']);
  ds = importInto(ds, 'YAHOO_MARKET', 'yahoo', f['yahoo-market.sample.csv']);
  ds = importInto(ds, 'PROJECTION', 'bbm', f['projections-bbm.sample.csv']);
  ds = importInto(ds, 'AVAILABILITY', 'manual', f['availability.sample.csv']);
  ds = importInto(ds, 'CONTEXT', 'manual', f['context.sample.csv']);
  ds = importInto(ds, 'PLAYOFF', 'manual', f['playoff-schedule.sample.csv']);
  sampleCache = ds;
  return structuredClone(ds);
}

export interface SynthSpec {
  id: string;
  name?: string;
  team?: string;
  positions?: Position[];
  gp?: number;
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  threes?: number;
  to?: number;
  fgm?: number;
  fga?: number;
  ftm?: number;
  fta?: number;
  adp?: number | null;
  xrank?: number | null;
}

/** A synthetic league-average-ish line; override any stat. */
export function synthLine(s: SynthSpec, provider = 'hashtag'): ProjectionLine {
  return {
    canonicalPlayerId: s.id,
    provider,
    season: '2026-27',
    importBatchId: 'synthetic',
    gp: s.gp ?? 72,
    mpg: 30,
    fgm: s.fgm ?? 5.5,
    fga: s.fga ?? 12,
    ftm: s.ftm ?? 2.4,
    fta: s.fta ?? 3,
    threes: s.threes ?? 1.6,
    pts: s.pts ?? 15,
    reb: s.reb ?? 5.5,
    ast: s.ast ?? 3.5,
    stl: s.stl ?? 1.0,
    blk: s.blk ?? 0.6,
    to: s.to ?? 1.8,
    sourcePct: { fg: null, ft: null },
  };
}

export function synthIdentity(s: SynthSpec): PlayerIdentity {
  const name = s.name ?? `Synthetic ${s.id}`;
  return {
    canonicalPlayerId: s.id,
    canonicalName: name,
    normalizedName: normalizeName(name),
    nbaTeam: s.team ?? 'SYN',
    aliases: [],
    providerIds: {},
    positions: s.positions ?? ['SF'],
    positionsSource: 'YAHOO',
  };
}

export function synthMarket(s: SynthSpec): YahooMarket {
  return {
    canonicalPlayerId: s.id,
    season: '2026-27',
    importBatchId: 'synthetic',
    yahooXRank: s.xrank ?? null,
    yahooRank: null,
    yahooAdp7d: s.adp ?? null,
    status: null,
  };
}

/** Add synthetic players to a dataset (with market rows when adp/xrank set). */
export function withSynth(ds: Dataset, specs: SynthSpec[]): Dataset {
  return {
    ...ds,
    identities: [...ds.identities, ...specs.map(synthIdentity)],
    projections: [...ds.projections, ...specs.map((s) => synthLine(s))],
    market: [...ds.market, ...specs.filter((s) => s.adp != null || s.xrank != null).map(synthMarket)],
  };
}

export function emptyDraft(): DraftInput {
  return { events: [], flags: {}, puntOverrides: {} };
}

export function run(
  ds: Dataset,
  lg: LeagueProfile,
  draft: DraftInput = emptyDraft(),
  config: StrategyConfig = defaultConfig(),
) {
  const ctx = buildContext(ds, lg, config);
  return { ctx, ev: evaluateDraft(ctx, draft) };
}

export function idByName(ds: Dataset, name: string): string {
  const n = normalizeName(name);
  const p = ds.identities.find((x) => x.normalizedName === n);
  if (!p) throw new Error(`no player ${name}`);
  return p.canonicalPlayerId;
}

/**
 * Fully synthetic pool (no import): n players around league-average with seeded noise,
 * ADP = rank by a simple quality index (so market order ≈ value order), positions rotating.
 */
export function synthPool(
  n: number,
  seed = 7,
  opts: { withMarket?: boolean; idPrefix?: string } = {},
): SynthSpec[] {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pos: Position[][] = [['PG'], ['SG'], ['SF'], ['PF'], ['C'], ['PG', 'SG'], ['SF', 'PF'], ['C']];
  const specs: SynthSpec[] = [];
  for (let i = 0; i < n; i++) {
    const q = 1.4 - (1.0 * i) / n + 0.15 * (rnd() - 0.5);
    const fga = 12 * q;
    const fta = 3.5 * q;
    specs.push({
      id: `${opts.idPrefix ?? 'S'}${String(i).padStart(4, '0')}`,
      team: `T${i % 30}`,
      positions: pos[i % pos.length],
      gp: 60 + Math.round(20 * rnd()),
      pts: 16 * q,
      reb: 5.5 * q * (0.7 + 0.6 * rnd()),
      ast: 3.5 * q * (0.7 + 0.6 * rnd()),
      stl: 1.0 * q * (0.8 + 0.4 * rnd()),
      blk: 0.6 * q * (0.6 + 0.8 * rnd()),
      threes: 1.6 * q * (0.7 + 0.6 * rnd()),
      to: 1.8 * q * (0.8 + 0.4 * rnd()),
      fga,
      fgm: fga * (0.42 + 0.1 * rnd()),
      fta,
      ftm: fta * (0.68 + 0.2 * rnd()),
      adp: opts.withMarket === false ? null : i + 1,
    });
  }
  return specs;
}

export function synthDataset(specs: SynthSpec[]): Dataset {
  return withSynth(
    { identities: [], market: [], projections: [], availability: [], context: [], playoffSchedule: [] },
    specs,
  );
}

/** Build draft events: `others` picks by other teams (advancing), then my picks interleaved as given. */
export function eventsFrom(
  seq: { id: string; by: 'ME' | 'OTHER'; advance?: boolean }[],
): DraftInput['events'] {
  return seq.map((s, i) => ({
    seq: i + 1,
    at: 't',
    type: 'PICK' as const,
    playerId: s.id,
    by: s.by,
    advance: s.advance ?? true,
    overallPick: s.advance === false ? null : i + 1,
  }));
}
