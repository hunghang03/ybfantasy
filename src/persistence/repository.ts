import type { StrategyConfig } from '@/domain/config/strategyConfig';
import type {
  AvailabilitySeason,
  Dataset,
  ImportBatch,
  ManualMapping,
  PlayerContext,
  PlayerIdentity,
  ProjectionLine,
  TeamPlayoffSchedule,
  UnmatchedRow,
  YahooMarket,
} from '@/domain/types/data';
import type { LeagueDraft, LeagueProfile } from '@/domain/types/league';
import type { ImportPlan } from '@/domain/import/plan';

/**
 * Persistence abstraction (DESIGN §11). Domain logic never touches storage directly.
 * v1: DexieRepository (IndexedDB) + MemoryRepository (tests). Phase 2: SupabaseRepository as an
 * asynchronous sync layer — local stays the source for immediate draft actions.
 */

export type UnmatchedResolution = { canonicalPlayerId: string } | { create: true } | { ignore: true };

export interface AppSettings {
  activeLeagueId: string | null;
  compactMode: boolean;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: AppSettings = { activeLeagueId: null, compactMode: false, theme: 'system' };

export interface Repository {
  listLeagues(): Promise<LeagueProfile[]>;
  saveLeague(league: LeagueProfile): Promise<void>;
  deleteLeague(id: string): Promise<void>;
  getDraft(leagueId: string): Promise<LeagueDraft | null>;
  saveDraft(draft: LeagueDraft): Promise<void>;

  loadDataset(): Promise<Dataset>;
  listBatches(): Promise<ImportBatch[]>;
  /** Atomic: either every record of the plan is written or nothing is. */
  commitImport(plan: ImportPlan): Promise<void>;
  /** Mark a batch REVERTED and reactivate the most recent SUPERSEDED batch of the same kind/provider. */
  revertBatch(batchId: string): Promise<void>;
  listUnmatched(): Promise<UnmatchedRow[]>;
  resolveUnmatched(rowId: string, resolution: UnmatchedResolution, newId: string, now: string): Promise<void>;
  listMappings(): Promise<ManualMapping[]>;
  saveIdentity(identity: PlayerIdentity): Promise<void>;

  getConfig(): Promise<StrategyConfig | null>;
  saveConfig(config: StrategyConfig): Promise<void>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  exportAll(): Promise<BackupFile>;
  /** Replace everything with a validated backup (atomic). */
  restoreAll(backup: BackupFile): Promise<void>;
  clearAll(): Promise<void>;
}

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  app: 'ybfantasy-draft-engine';
  schemaVersion: number;
  exportedAt: string;
  leagues: LeagueProfile[];
  drafts: LeagueDraft[];
  identities: PlayerIdentity[];
  market: YahooMarket[];
  projections: ProjectionLine[];
  availability: AvailabilitySeason[];
  context: PlayerContext[];
  playoff: TeamPlayoffSchedule[];
  batches: ImportBatch[];
  mappings: ManualMapping[];
  unmatched: UnmatchedRow[];
  config: StrategyConfig | null;
  settings: AppSettings;
}
