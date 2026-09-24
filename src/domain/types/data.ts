import type { InjuryStatus, Position, ProviderId, Recurrence, RoleTag } from './core';
export type { ProviderId } from './core';

// ---------- IDENTITY ----------
export interface PlayerIdentity {
  canonicalPlayerId: string;
  canonicalName: string;
  normalizedName: string;
  nbaTeam: string | null;
  aliases: string[];
  yahooPlayerId?: string;
  providerIds: Record<ProviderId, string>;
  positions: Position[];
  /** Where the position list came from. Yahoo is authoritative (A7). */
  positionsSource: 'YAHOO' | 'PROVIDER' | 'MANUAL' | 'NONE';
}

// ---------- SOURCE DATA ----------
export interface YahooMarket {
  canonicalPlayerId: string;
  season: string;
  importBatchId: string;
  yahooXRank: number | null;
  yahooRank: number | null;
  yahooAdp7d: number | null;
  status: InjuryStatus | null;
  /** Capture metadata (e.g. manual screenshot transcription). Never used by the engine's math. */
  meta?: SourceMeta;
  /** Raw source cells exactly as imported (mapped fields only). */
  raw?: Record<string, string>;
}

export type SourceConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SourceMeta {
  source: string | null;
  capturedAt: string | null;
  confidence: SourceConfidence | null;
  /** Field keys that could not be read confidently; their values are null and need review. */
  reviewFields: string[];
}

/** Always stored PER GAME. */
export interface ProjectionLine {
  canonicalPlayerId: string;
  provider: ProviderId;
  season: string;
  importBatchId: string;
  gp: number;
  mpg: number | null;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  threes: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  sourcePct: { fg: number | null; ft: number | null };
  /** Optional provider upside tag, 0..1. */
  providerUpside?: number | null;
  /** Provider's own overall rank (report/comparison only; never used by the engine). */
  providerRank?: number | null;
  /** Provider-published ADP, e.g. Hashtag's public Yahoo ADP (report only; NEVER written to YahooMarket). */
  providerAdp?: number | null;
  /** Per-player games in specific weeks (e.g. W18–W21), as published by the provider. */
  weekGames?: Record<number, number>;
  /** Raw source cells exactly as imported (mapped fields only). */
  raw?: Record<string, string>;
}

export interface Absence {
  games: number;
  recurrence: Recurrence;
  note?: string;
}

export interface AvailabilitySeason {
  canonicalPlayerId: string;
  season: string;
  importBatchId: string;
  gamesPlayed: number;
  teamGames: number;
  absences: Absence[];
}

export interface PlayerContext {
  canonicalPlayerId: string;
  importBatchId?: string;
  age: number | null;
  currentStatus: InjuryStatus;
  recoveryNote?: string;
  manualRiskDelta?: number;
  manualUpside?: number;
  providerUpside?: number;
  roleTags?: RoleTag[];
  previousSeasonMpg?: number | null;
  note?: string;
}

export interface TeamPlayoffSchedule {
  nbaTeam: string;
  season: string;
  importBatchId: string;
  gamesByWeek: Record<number, number>;
}

export const IMPORT_KINDS = ['YAHOO_MARKET', 'PROJECTION', 'AVAILABILITY', 'CONTEXT', 'PLAYOFF'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export interface ImportBatch {
  id: string;
  kind: ImportKind;
  provider: ProviderId;
  season: string;
  importedAt: string;
  description: string;
  counts: { rows: number; matched: number; created: number; unmatched: number; rejected: number };
  status: 'ACTIVE' | 'SUPERSEDED' | 'REVERTED';
}

export interface ManualMapping {
  provider: ProviderId;
  providerKey: string;
  target: { canonicalPlayerId: string } | { ignore: true };
  createdAt: string;
}

/** A row that could not be matched automatically and awaits manual review. */
export interface UnmatchedRow {
  id: string;
  batchId: string;
  kind: ImportKind;
  provider: ProviderId;
  providerKey: string;
  rawName: string;
  rawTeam: string | null;
  reason: 'NO_MATCH' | 'AMBIGUOUS';
  candidateIds: string[];
  /** The validated, normalized row payload, applied when the user resolves the mapping. */
  payload: unknown;
}

/** Everything the engine needs, restricted to ACTIVE batches. */
export interface Dataset {
  identities: PlayerIdentity[];
  market: YahooMarket[];
  projections: ProjectionLine[];
  availability: AvailabilitySeason[];
  context: PlayerContext[];
  playoffSchedule: TeamPlayoffSchedule[];
}

export const EMPTY_DATASET: Dataset = {
  identities: [],
  market: [],
  projections: [],
  availability: [],
  context: [],
  playoffSchedule: [],
};
