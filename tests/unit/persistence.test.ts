import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { autoMapColumns } from '@/domain/import/fields';
import { parseTable } from '@/domain/import/parse';
import { planImport } from '@/domain/import/plan';
import type { ImportKind } from '@/domain/types/data';
import type { LeagueDraft } from '@/domain/types/league';
import { parseBackup } from '@/persistence/backup';
import { createDexieRepository } from '@/persistence/dexieRepository';
import { createMemoryRepository } from '@/persistence/memoryRepository';
import type { Repository } from '@/persistence/repository';
import { league, seqId } from '../helpers/fixtures';

const cfg = defaultConfig();
const HEADER = 'PLAYER,TEAM,POS,GP,FG%,FT%,3PM,PTS,REB,AST,STL,BLK,TO';
const rowFor = (name: string, team: string, pts = 20) => `${name},${team},PG,70,0.5 (5/10),0.9 (9/10),2,${pts},5,8,1.5,0.3,3`;

async function doImport(repo: Repository, kind: ImportKind, provider: string, csv: string, batchId: string, now = '2026-01-01') {
  const table = parseTable(csv);
  const ds = await repo.loadDataset();
  const plan = planImport({
    kind,
    provider,
    season: '2026-27',
    description: batchId,
    table,
    columnMap: autoMapColumns(kind, table.headers),
    identities: ds.identities,
    mappings: await repo.listMappings(),
    config: cfg,
    createPolicy: 'AUTO',
    batchId,
    now,
    newId: seqId(batchId),
  });
  await repo.commitImport(plan);
  return plan;
}

const backends: [string, () => Repository][] = [
  ['memory', () => createMemoryRepository()],
  ['dexie', () => createDexieRepository(`test-${Math.random()}`)],
];

for (const [name, make] of backends) {
  describe(`repository (${name})`, () => {
    it('import → supersede → revert keeps sources versioned', async () => {
      const repo = make();
      await doImport(repo, 'PROJECTION', 'hashtag', `${HEADER}\n${rowFor('A One', 'AAA', 20)}\n`, 'b1', '2026-01-01');
      await doImport(repo, 'PROJECTION', 'hashtag', `${HEADER}\n${rowFor('A One', 'AAA', 25)}\n`, 'b2', '2026-01-02');
      let ds = await repo.loadDataset();
      expect(ds.projections).toHaveLength(1);
      expect(ds.projections[0]!.pts).toBe(25);
      await repo.revertBatch('b2');
      ds = await repo.loadDataset();
      expect(ds.projections[0]!.pts).toBe(20);
      const batches = await repo.listBatches();
      expect(batches.map((b) => [b.id, b.status]).sort()).toEqual([
        ['b1', 'ACTIVE'],
        ['b2', 'REVERTED'],
      ]);
    });

    it('a failed commit writes nothing (atomic rollback)', async () => {
      const repo = make();
      await doImport(repo, 'PROJECTION', 'hashtag', `${HEADER}\n${rowFor('A One', 'AAA')}\n`, 'b1');
      const before = await repo.exportAll();
      const table = parseTable(`${HEADER}\n${rowFor('B Two', 'BBB')}\n`);
      const ds = await repo.loadDataset();
      const plan = planImport({
        kind: 'PROJECTION', provider: 'hashtag', season: 's', description: 'bad', table,
        columnMap: autoMapColumns('PROJECTION', table.headers), identities: ds.identities, mappings: [],
        config: cfg, createPolicy: 'CREATE_UNMATCHED', batchId: 'bad', now: 'n', newId: seqId('bad'),
      });
      // Corrupt the plan so a write throws mid-transaction.
      (plan.records.projections as unknown[]).push({ get canonicalPlayerId(): string { throw new Error('boom'); } });
      await expect(repo.commitImport(plan)).rejects.toThrow();
      const after = await repo.exportAll();
      expect({ ...after, exportedAt: '' }).toEqual({ ...before, exportedAt: '' });
    });

    it('manual unmatched resolution persists and applies to future imports', async () => {
      const repo = make();
      await doImport(repo, 'PROJECTION', 'hashtag', `${HEADER}\n${rowFor('Alex Stone', 'AAA')}\n`, 'b1');
      const plan = await doImport(repo, 'YAHOO_MARKET', 'yahoo', 'Player,Team,ADP\nAlexander Stoner,ZZZ,12\n', 'm1');
      expect(plan.unmatched).toHaveLength(1);
      const ds = await repo.loadDataset();
      const target = ds.identities[0]!.canonicalPlayerId;
      await repo.resolveUnmatched(plan.unmatched[0]!.id, { canonicalPlayerId: target }, 'x', 'now');
      expect(await repo.listUnmatched()).toHaveLength(0);
      expect((await repo.loadDataset()).market[0]).toMatchObject({ canonicalPlayerId: target, yahooAdp7d: 12 });
      // A future market import with the same provider row now auto-matches via MANUAL.
      const again = await doImport(repo, 'YAHOO_MARKET', 'yahoo', 'Player,Team,ADP\nAlexander Stoner,ZZZ,15\n', 'm2');
      expect(again.unmatched).toHaveLength(0);
      expect(again.matchedVia.MANUAL).toBe(1);
    });

    it('league drafts are isolated and backups round-trip', async () => {
      const repo = make();
      const a = league({ id: 'A', createdAt: '1' });
      const b = league({ id: 'B', draftPosition: 4, createdAt: '2' });
      await repo.saveLeague(a);
      await repo.saveLeague(b);
      const draftA: LeagueDraft = { leagueId: 'A', events: [{ seq: 1, at: 't', type: 'PICK', playerId: 'p1', by: 'ME', advance: true, overallPick: 1 }], flags: {}, puntOverrides: {} };
      await repo.saveDraft(draftA);
      await repo.saveDraft({ leagueId: 'B', events: [], flags: {}, puntOverrides: { TO: 'HARD' } });
      expect((await repo.getDraft('A'))!.events).toHaveLength(1);
      expect((await repo.getDraft('B'))!.events).toHaveLength(0);
      const backup = await repo.exportAll();
      const parsed = parseBackup(JSON.stringify(backup));
      expect(parsed.ok).toBe(true);
      const fresh = make();
      if (parsed.ok) await fresh.restoreAll(parsed.backup);
      expect(await fresh.getDraft('A')).toEqual(draftA);
      expect((await fresh.listLeagues()).map((l) => l.id)).toEqual(['A', 'B']);
    });
  });
}

describe('backup validation', () => {
  it('rejects malformed backups', () => {
    expect(parseBackup('nope').ok).toBe(false);
    expect(parseBackup('{"app":"other"}').ok).toBe(false);
  });
});
