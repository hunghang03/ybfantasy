import Dexie, { type Table as DexieTable } from 'dexie';
import { TableRepository, type Backend, type Table, type Tables } from './tableRepository';

/**
 * IndexedDB backend via Dexie. Every table is a simple key → value store (out-of-line keys);
 * all querying happens in memory because datasets are small (a few thousand rows).
 */
const TABLE_NAMES = [
  'leagues',
  'drafts',
  'identities',
  'market',
  'projections',
  'availability',
  'context',
  'playoff',
  'batches',
  'mappings',
  'unmatched',
  'kv',
] as const;

class DraftDb extends Dexie {
  constructor(name: string) {
    super(name);
    this.version(1).stores(Object.fromEntries(TABLE_NAMES.map((n) => [n, ''])));
  }
}

class DexieKV<T> implements Table<T> {
  constructor(private readonly table: DexieTable<T, string>) {}
  all() {
    return this.table.toArray();
  }
  get(key: string) {
    return this.table.get(key);
  }
  async put(key: string, value: T) {
    await this.table.put(value, key);
  }
  async bulkPut(entries: [string, T][]) {
    if (entries.length === 0) return;
    await this.table.bulkPut(
      entries.map((e) => e[1]),
      entries.map((e) => e[0]),
    );
  }
  delete(key: string) {
    return this.table.delete(key);
  }
  clear() {
    return this.table.clear();
  }
}

export function createDexieBackend(name = 'ybfantasy-draft-engine'): Backend {
  const db = new DraftDb(name);
  const tables = Object.fromEntries(
    TABLE_NAMES.map((n) => [n, new DexieKV(db.table(n) as DexieTable<unknown, string>)]),
  ) as unknown as Tables;
  return {
    tables,
    transaction: <T>(fn: () => Promise<T>): Promise<T> => {
      const run = db.transaction as unknown as (
        mode: string,
        tables: unknown[],
        f: () => Promise<T>,
      ) => Promise<T>;
      return run.call(
        db,
        'rw',
        TABLE_NAMES.map((n) => db.table(n)),
        fn,
      );
    },
  };
}

export function createDexieRepository(name?: string): TableRepository {
  return new TableRepository(createDexieBackend(name));
}
