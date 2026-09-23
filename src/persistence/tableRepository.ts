import type { StrategyConfig } from '@/domain/config/strategyConfig';
import { providerKeyFor } from '@/domain/identity/matcher';
import { emptyRecords, newIdentityFromRow, recordFor, type ImportPlan } from '@/domain/import/plan';
import type { IdentityFields, RowValue } from '@/domain/import/rows';
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
import {
  BACKUP_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  type AppSettings,
  type BackupFile,
  type Repository,
  type UnmatchedResolution,
} from './repository';

/**
 * Shared repository logic over a minimal keyed-table backend. Both the IndexedDB (Dexie) and the
 * in-memory backends implement `Backend`, so the import/revert/resolve rules are written once.
 */

export interface Table<T> {
  all(): Promise<T[]>;
  get(key: string): Promise<T | undefined>;
  put(key: string, value: T): Promise<void>;
  bulkPut(entries: [string, T][]): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Tables {
  leagues: Table<LeagueProfile>;
  drafts: Table<LeagueDraft>;
  identities: Table<PlayerIdentity>;
  market: Table<YahooMarket>;
  projections: Table<ProjectionLine>;
  availability: Table<AvailabilitySeason>;
  context: Table<PlayerContext>;
  playoff: Table<TeamPlayoffSchedule>;
  batches: Table<ImportBatch>;
  mappings: Table<ManualMapping>;
  unmatched: Table<UnmatchedRow>;
  kv: Table<unknown>;
}

export interface Backend {
  tables: Tables;
  /** Run fn atomically: on throw, nothing it wrote persists. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const keys = {
  market: (r: YahooMarket) => `${r.importBatchId}|${r.canonicalPlayerId}`,
  projection: (r: ProjectionLine) => `${r.importBatchId}|${r.provider}|${r.canonicalPlayerId}`,
  availability: (r: AvailabilitySeason) => `${r.importBatchId}|${r.canonicalPlayerId}|${r.season}`,
  context: (r: PlayerContext) => `${r.importBatchId ?? 'manual'}|${r.canonicalPlayerId}`,
  playoff: (r: TeamPlayoffSchedule) => `${r.importBatchId}|${r.nbaTeam}`,
  mapping: (m: ManualMapping) => `${m.provider}|${m.providerKey}`,
};

export class TableRepository implements Repository {
  constructor(private readonly db: Backend) {}

  private get t(): Tables {
    return this.db.tables;
  }

  listLeagues() {
    return this.t.leagues.all().then((l) => l.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1)));
  }
  saveLeague(league: LeagueProfile) {
    return this.t.leagues.put(league.id, league);
  }
  deleteLeague(id: string) {
    return this.db.transaction(async () => {
      await this.t.leagues.delete(id);
      await this.t.drafts.delete(id);
    });
  }
  async getDraft(leagueId: string) {
    return (await this.t.drafts.get(leagueId)) ?? null;
  }
  saveDraft(draft: LeagueDraft) {
    return this.t.drafts.put(draft.leagueId, draft);
  }

  async loadDataset(): Promise<Dataset> {
    const batches = await this.t.batches.all();
    const active = new Set(batches.filter((b) => b.status === 'ACTIVE').map((b) => b.id));
    const [identities, market, projections, availability, context, playoff] = await Promise.all([
      this.t.identities.all(),
      this.t.market.all(),
      this.t.projections.all(),
      this.t.availability.all(),
      this.t.context.all(),
      this.t.playoff.all(),
    ]);
    const isActive = (id: string | undefined) => id === undefined || id === 'manual' || active.has(id);
    return {
      identities,
      market: market.filter((r) => isActive(r.importBatchId)),
      projections: projections.filter((r) => isActive(r.importBatchId)),
      availability: availability.filter((r) => isActive(r.importBatchId)),
      context: context.filter((r) => isActive(r.importBatchId)),
      playoffSchedule: playoff.filter((r) => isActive(r.importBatchId)),
    };
  }

  listBatches() {
    return this.t.batches.all().then((b) => b.sort((x, y) => (x.importedAt < y.importedAt ? 1 : -1)));
  }

  commitImport(plan: ImportPlan): Promise<void> {
    return this.db.transaction(async () => {
      const batches = await this.t.batches.all();
      for (const b of batches)
        if (b.status === 'ACTIVE' && b.kind === plan.batch.kind && b.provider === plan.batch.provider)
          await this.t.batches.put(b.id, { ...b, status: 'SUPERSEDED' });
      await this.t.batches.put(plan.batch.id, plan.batch);
      await this.t.identities.bulkPut([...plan.newIdentities, ...plan.identityUpdates].map((p) => [p.canonicalPlayerId, p]));
      await this.writeRecords(plan.records);
      await this.t.unmatched.bulkPut(plan.unmatched.map((u) => [u.id, u]));
    });
  }

  private async writeRecords(r: ImportPlan['records']) {
    await this.t.market.bulkPut(r.market.map((x) => [keys.market(x), x]));
    await this.t.projections.bulkPut(r.projections.map((x) => [keys.projection(x), x]));
    await this.t.availability.bulkPut(r.availability.map((x) => [keys.availability(x), x]));
    await this.t.context.bulkPut(r.context.map((x) => [keys.context(x), x]));
    await this.t.playoff.bulkPut(r.playoff.map((x) => [keys.playoff(x), x]));
  }

  revertBatch(batchId: string): Promise<void> {
    return this.db.transaction(async () => {
      const b = await this.t.batches.get(batchId);
      if (!b) throw new Error('Unknown import batch.');
      const wasActive = b.status === 'ACTIVE';
      await this.t.batches.put(b.id, { ...b, status: 'REVERTED' });
      if (!wasActive) return;
      const prev = (await this.t.batches.all())
        .filter((x) => x.kind === b.kind && x.provider === b.provider && x.status === 'SUPERSEDED')
        .sort((x, y) => (x.importedAt < y.importedAt ? 1 : -1))[0];
      if (prev) await this.t.batches.put(prev.id, { ...prev, status: 'ACTIVE' });
    });
  }

  listUnmatched() {
    return this.t.unmatched.all();
  }

  resolveUnmatched(rowId: string, resolution: UnmatchedResolution, newId: string, now: string): Promise<void> {
    return this.db.transaction(async () => {
      const row = await this.t.unmatched.get(rowId);
      if (!row) throw new Error('Unmatched row not found.');
      const payload = row.payload as RowValue & IdentityFields;
      let target: ManualMapping['target'];
      if ('ignore' in resolution) target = { ignore: true };
      else if ('create' in resolution) {
        const identity = newIdentityFromRow(row.kind, row.provider, payload, newId);
        await this.t.identities.put(identity.canonicalPlayerId, identity);
        target = { canonicalPlayerId: identity.canonicalPlayerId };
      } else {
        if (!(await this.t.identities.get(resolution.canonicalPlayerId))) throw new Error('Unknown player.');
        target = { canonicalPlayerId: resolution.canonicalPlayerId };
      }
      const mapping: ManualMapping = { provider: row.provider, providerKey: row.providerKey, target, createdAt: now };
      await this.t.mappings.put(keys.mapping(mapping), mapping);
      if ('canonicalPlayerId' in target) {
        const batch = await this.t.batches.get(row.batchId);
        const recs = emptyRecords();
        recordFor(row.kind, payload, target.canonicalPlayerId, row.batchId, row.provider, batch?.season ?? '', recs);
        await this.writeRecords(recs);
      }
      await this.t.unmatched.delete(rowId);
    });
  }

  listMappings() {
    return this.t.mappings.all();
  }
  saveIdentity(identity: PlayerIdentity) {
    return this.t.identities.put(identity.canonicalPlayerId, identity);
  }

  async getConfig() {
    return ((await this.t.kv.get('config')) as StrategyConfig | undefined) ?? null;
  }
  saveConfig(config: StrategyConfig) {
    return this.t.kv.put('config', config);
  }
  async getSettings(): Promise<AppSettings> {
    return { ...DEFAULT_SETTINGS, ...(((await this.t.kv.get('settings')) as Partial<AppSettings> | undefined) ?? {}) };
  }
  saveSettings(settings: AppSettings) {
    return this.t.kv.put('settings', settings);
  }

  async exportAll(): Promise<BackupFile> {
    const t = this.t;
    return {
      app: 'ybfantasy-draft-engine',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      leagues: await t.leagues.all(),
      drafts: await t.drafts.all(),
      identities: await t.identities.all(),
      market: await t.market.all(),
      projections: await t.projections.all(),
      availability: await t.availability.all(),
      context: await t.context.all(),
      playoff: await t.playoff.all(),
      batches: await t.batches.all(),
      mappings: await t.mappings.all(),
      unmatched: await t.unmatched.all(),
      config: await this.getConfig(),
      settings: await this.getSettings(),
    };
  }

  restoreAll(b: BackupFile): Promise<void> {
    return this.db.transaction(async () => {
      await this.clearTables();
      const t = this.t;
      await t.leagues.bulkPut(b.leagues.map((x) => [x.id, x]));
      await t.drafts.bulkPut(b.drafts.map((x) => [x.leagueId, x]));
      await t.identities.bulkPut(b.identities.map((x) => [x.canonicalPlayerId, x]));
      await t.market.bulkPut(b.market.map((x) => [keys.market(x), x]));
      await t.projections.bulkPut(b.projections.map((x) => [keys.projection(x), x]));
      await t.availability.bulkPut(b.availability.map((x) => [keys.availability(x), x]));
      await t.context.bulkPut(b.context.map((x) => [keys.context(x), x]));
      await t.playoff.bulkPut(b.playoff.map((x) => [keys.playoff(x), x]));
      await t.batches.bulkPut(b.batches.map((x) => [x.id, x]));
      await t.mappings.bulkPut(b.mappings.map((x) => [keys.mapping(x), x]));
      await t.unmatched.bulkPut(b.unmatched.map((x) => [x.id, x]));
      if (b.config) await t.kv.put('config', b.config);
      await t.kv.put('settings', b.settings);
    });
  }

  clearAll(): Promise<void> {
    return this.db.transaction(() => this.clearTables());
  }

  private async clearTables() {
    for (const table of Object.values(this.t) as Table<unknown>[]) await table.clear();
  }
}

export { providerKeyFor };
