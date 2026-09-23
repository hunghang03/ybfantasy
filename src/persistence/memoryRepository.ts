import { TableRepository, type Backend, type Table, type Tables } from './tableRepository';

/** In-memory backend with snapshot/rollback transactions. Used by tests and as an emergency fallback. */
class MemoryTable<T> implements Table<T> {
  data = new Map<string, T>();
  async all() {
    return [...this.data.values()].map((v) => structuredClone(v));
  }
  async get(key: string) {
    const v = this.data.get(key);
    return v === undefined ? undefined : structuredClone(v);
  }
  async put(key: string, value: T) {
    this.data.set(key, structuredClone(value));
  }
  async bulkPut(entries: [string, T][]) {
    for (const [k, v] of entries) this.data.set(k, structuredClone(v));
  }
  async delete(key: string) {
    this.data.delete(key);
  }
  async clear() {
    this.data.clear();
  }
}

export function createMemoryBackend(): Backend {
  const tables = {
    leagues: new MemoryTable(),
    drafts: new MemoryTable(),
    identities: new MemoryTable(),
    market: new MemoryTable(),
    projections: new MemoryTable(),
    availability: new MemoryTable(),
    context: new MemoryTable(),
    playoff: new MemoryTable(),
    batches: new MemoryTable(),
    mappings: new MemoryTable(),
    unmatched: new MemoryTable(),
    kv: new MemoryTable(),
  } as unknown as Tables;
  let depth = 0;
  return {
    tables,
    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      if (depth > 0) return fn();
      const snapshot = new Map<string, Map<string, unknown>>();
      for (const [name, table] of Object.entries(tables)) snapshot.set(name, new Map((table as MemoryTable<unknown>).data));
      depth++;
      try {
        return await fn();
      } catch (e) {
        for (const [name, table] of Object.entries(tables)) (table as MemoryTable<unknown>).data = snapshot.get(name)!;
        throw e;
      } finally {
        depth--;
      }
    },
  };
}

export function createMemoryRepository(): TableRepository {
  return new TableRepository(createMemoryBackend());
}
