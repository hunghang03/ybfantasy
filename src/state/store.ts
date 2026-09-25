'use client';

import { create } from 'zustand';
import { defaultConfig, upgradeStoredConfig } from '@/domain/config/defaults';
import type { StrategyConfig } from '@/domain/config/strategyConfig';
import { appendPick, appendResync, appendVoid, undoLast } from '@/domain/draft/replay';
import type { ImportPlan } from '@/domain/import/plan';
import type { Category } from '@/domain/types/core';
import {
  EMPTY_DATASET,
  type Dataset,
  type ImportBatch,
  type ManualMapping,
  type UnmatchedRow,
} from '@/domain/types/data';
import {
  DEFAULT_ROSTER,
  NO_FLAGS,
  rosterSize,
  type LeagueDraft,
  type LeagueProfile,
  type PickSnapshot,
  type PlayerFlags,
  type PuntOverride,
} from '@/domain/types/league';
import { newId, nowIso } from '@/lib/ids';
import { createDexieRepository } from '@/persistence/dexieRepository';
import { createMemoryRepository } from '@/persistence/memoryRepository';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type BackupFile,
  type Repository,
  type UnmatchedResolution,
} from '@/persistence/repository';

/**
 * Application store. In-memory state updates synchronously (instant UI); every change is written
 * through to the local repository asynchronously and the save status is surfaced in the header.
 * Nothing here talks to a network.
 */

export type SaveStatus = 'saved' | 'saving' | 'error';
type FlagKey = keyof PlayerFlags;

export interface AppState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  storage: 'indexeddb' | 'memory';
  saveStatus: SaveStatus;
  leagues: LeagueProfile[];
  drafts: Record<string, LeagueDraft>;
  dataset: Dataset;
  batches: ImportBatch[];
  unmatched: UnmatchedRow[];
  mappings: ManualMapping[];
  config: StrategyConfig;
  settings: AppSettings;
  lastMessage: string | null;

  init(): Promise<void>;
  reloadData(): Promise<void>;
  notify(msg: string | null): void;

  createLeague(partial?: Partial<LeagueProfile>): LeagueProfile;
  updateLeague(league: LeagueProfile): void;
  deleteLeague(id: string): void;
  setActiveLeague(id: string | null): void;

  draftPick(
    playerId: string,
    by: 'ME' | 'OTHER',
    opts?: { advance?: boolean; snapshot?: PickSnapshot },
  ): string | null;
  undo(): void;
  resync(overall: number): string | null;
  voidPick(seq: number): string | null;
  resetDraft(): void;
  toggleFlag(playerId: string, flag: FlagKey): void;
  setPuntOverride(category: Category, value: PuntOverride): void;

  commitImport(plan: ImportPlan): Promise<void>;
  revertBatch(batchId: string): Promise<void>;
  resolveUnmatched(rowId: string, resolution: UnmatchedResolution): Promise<void>;

  setConfig(config: StrategyConfig): void;
  resetConfig(): void;
  updateSettings(patch: Partial<AppSettings>): void;

  exportBackup(): Promise<BackupFile>;
  restoreBackup(backup: BackupFile): Promise<void>;
  clearAll(): Promise<void>;
}

let repo: Repository | null = null;
let writeChain: Promise<unknown> = Promise.resolve();
let pendingWrites = 0;

export function getRepository(): Repository {
  if (!repo) throw new Error('Repository not initialized');
  return repo;
}

function emptyDraft(leagueId: string): LeagueDraft {
  return { leagueId, events: [], flags: {}, puntOverrides: {} };
}

export const useApp = create<AppState>((set, get) => {
  /** Serialize writes; surface status. Failures never block drafting (state is already in memory). */
  const persist = (fn: (r: Repository) => Promise<unknown>) => {
    const r = repo;
    if (!r) return;
    pendingWrites++;
    set({ saveStatus: 'saving' });
    writeChain = writeChain
      .then(() => fn(r))
      .then(() => {
        pendingWrites--;
        if (pendingWrites === 0 && get().saveStatus !== 'error') set({ saveStatus: 'saved' });
      })
      .catch((e: unknown) => {
        pendingWrites--;
        set({
          saveStatus: 'error',
          lastMessage: `Local save failed: ${e instanceof Error ? e.message : String(e)}`,
        });
      });
  };

  const activeLeague = () => get().leagues.find((l) => l.id === get().settings.activeLeagueId) ?? null;
  const activeDraft = () => {
    const l = activeLeague();
    return l ? (get().drafts[l.id] ?? emptyDraft(l.id)) : null;
  };
  const saveDraft = (d: LeagueDraft) => {
    set({ drafts: { ...get().drafts, [d.leagueId]: d } });
    persist((r) => r.saveDraft(d));
  };

  return {
    status: 'idle',
    error: null,
    storage: 'indexeddb',
    saveStatus: 'saved',
    leagues: [],
    drafts: {},
    dataset: EMPTY_DATASET,
    batches: [],
    unmatched: [],
    mappings: [],
    config: defaultConfig(),
    settings: DEFAULT_SETTINGS,
    lastMessage: null,

    async init() {
      if (get().status === 'loading' || get().status === 'ready') return;
      set({ status: 'loading' });
      try {
        let storage: AppState['storage'] = 'indexeddb';
        if (typeof indexedDB === 'undefined') {
          repo = createMemoryRepository();
          storage = 'memory';
        } else {
          repo = createDexieRepository();
        }
        const [leagues, settings, config] = await Promise.all([
          repo.listLeagues(),
          repo.getSettings(),
          repo.getConfig(),
        ]);
        const drafts: Record<string, LeagueDraft> = {};
        for (const l of leagues) drafts[l.id] = (await repo.getDraft(l.id)) ?? emptyDraft(l.id);
        const activeLeagueId =
          settings.activeLeagueId && leagues.some((l) => l.id === settings.activeLeagueId)
            ? settings.activeLeagueId
            : (leagues[0]?.id ?? null);
        set({
          leagues,
          drafts,
          settings: { ...settings, activeLeagueId },
          config: config ? upgradeStoredConfig(config) : defaultConfig(),
          storage,
        });
        await get().reloadData();
        set({ status: 'ready' });
      } catch (e) {
        set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      }
    },

    async reloadData() {
      const r = getRepository();
      const [dataset, batches, unmatched, mappings] = await Promise.all([
        r.loadDataset(),
        r.listBatches(),
        r.listUnmatched(),
        r.listMappings(),
      ]);
      set({ dataset, batches, unmatched, mappings });
    },

    notify(msg) {
      set({ lastMessage: msg });
    },

    createLeague(partial = {}) {
      const now = nowIso();
      const league: LeagueProfile = {
        id: newId(),
        name: `League ${get().leagues.length + 1}`,
        season: '2026-27',
        teamCount: 14,
        draftPosition: 1,
        draftType: 'SNAKE',
        roster: structuredClone(DEFAULT_ROSTER),
        acquisitionsPerWeek: 4,
        playoffWeeks: [18, 19, 20, 21],
        primaryProjectionProvider: 'hashtag',
        validationProviders: [],
        createdAt: now,
        updatedAt: now,
        ...partial,
      };
      const draft = emptyDraft(league.id);
      set({ leagues: [...get().leagues, league], drafts: { ...get().drafts, [league.id]: draft } });
      persist(async (r) => {
        await r.saveLeague(league);
        await r.saveDraft(draft);
      });
      get().setActiveLeague(league.id);
      return league;
    },

    updateLeague(league) {
      const next = { ...league, updatedAt: nowIso() };
      set({ leagues: get().leagues.map((l) => (l.id === league.id ? next : l)) });
      persist((r) => r.saveLeague(next));
    },

    deleteLeague(id) {
      const leagues = get().leagues.filter((l) => l.id !== id);
      const drafts = { ...get().drafts };
      delete drafts[id];
      set({ leagues, drafts });
      persist((r) => r.deleteLeague(id));
      if (get().settings.activeLeagueId === id) get().setActiveLeague(leagues[0]?.id ?? null);
    },

    setActiveLeague(id) {
      get().updateSettings({ activeLeagueId: id });
    },

    draftPick(playerId, by, opts = {}) {
      const league = activeLeague();
      const draft = activeDraft();
      if (!league || !draft) return 'No active league.';
      const r = appendPick(
        draft.events,
        { playerId, by, advance: opts.advance, snapshot: opts.snapshot },
        league.teamCount,
        rosterSize(league.roster),
      );
      if (!r.ok) return r.error;
      saveDraft({ ...draft, events: r.events });
      return null;
    },

    undo() {
      const draft = activeDraft();
      if (!draft || draft.events.length === 0) return;
      saveDraft({ ...draft, events: undoLast(draft.events) });
    },

    resync(overall) {
      const league = activeLeague();
      const draft = activeDraft();
      if (!league || !draft) return 'No active league.';
      const r = appendResync(draft.events, overall, league.teamCount, rosterSize(league.roster));
      if (!r.ok) return r.error;
      saveDraft({ ...draft, events: r.events });
      return null;
    },

    voidPick(seq) {
      const draft = activeDraft();
      if (!draft) return 'No active league.';
      const r = appendVoid(draft.events, seq);
      if (!r.ok) return r.error;
      saveDraft({ ...draft, events: r.events });
      return null;
    },

    resetDraft() {
      const draft = activeDraft();
      if (!draft) return;
      saveDraft({ ...draft, events: [] });
    },

    toggleFlag(playerId, flag) {
      const draft = activeDraft();
      if (!draft) return;
      const cur = draft.flags[playerId] ?? NO_FLAGS;
      const next: PlayerFlags = { ...cur, [flag]: !cur[flag] };
      if (flag === 'favorite' && next.favorite) next.avoid = false;
      if (flag === 'avoid' && next.avoid) next.favorite = false;
      const flags = { ...draft.flags };
      if (Object.values(next).some(Boolean)) flags[playerId] = next;
      else delete flags[playerId];
      saveDraft({ ...draft, flags });
    },

    setPuntOverride(category, value) {
      const draft = activeDraft();
      if (!draft) return;
      const puntOverrides = { ...draft.puntOverrides };
      if (value === 'AUTO') delete puntOverrides[category];
      else puntOverrides[category] = value;
      saveDraft({ ...draft, puntOverrides });
    },

    async commitImport(plan) {
      await getRepository().commitImport(plan);
      await get().reloadData();
    },

    async revertBatch(batchId) {
      await getRepository().revertBatch(batchId);
      await get().reloadData();
    },

    async resolveUnmatched(rowId, resolution) {
      await getRepository().resolveUnmatched(rowId, resolution, newId(), nowIso());
      await get().reloadData();
    },

    setConfig(config) {
      set({ config });
      persist((r) => r.saveConfig(config));
    },

    resetConfig() {
      get().setConfig(defaultConfig());
    },

    updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      persist((r) => r.saveSettings(settings));
    },

    exportBackup() {
      return getRepository().exportAll();
    },

    async restoreBackup(backup) {
      await getRepository().restoreAll(backup);
      set({ status: 'idle' });
      repo = null;
      await get().init();
    },

    async clearAll() {
      await getRepository().clearAll();
      set({ status: 'idle', leagues: [], drafts: {}, config: defaultConfig(), settings: DEFAULT_SETTINGS });
      repo = null;
      await get().init();
    },
  };
});

export function useActiveLeague(): LeagueProfile | null {
  return useApp((s) => s.leagues.find((l) => l.id === s.settings.activeLeagueId) ?? null);
}

export function useActiveDraft(): LeagueDraft | null {
  return useApp((s) => {
    const id = s.settings.activeLeagueId;
    return id ? (s.drafts[id] ?? null) : null;
  });
}
