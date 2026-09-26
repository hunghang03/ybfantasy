import type { ActiveSlot, Category, ProviderId } from './core';

export interface RosterSettings {
  active: Record<ActiveSlot, number>;
  bench: number;
  il: number;
}

export const DEFAULT_ROSTER: RosterSettings = {
  active: { PG: 1, SG: 1, G: 1, SF: 1, PF: 1, F: 1, C: 2, UTIL: 2 },
  bench: 3,
  il: 2,
};

export interface LeagueProfile {
  id: string;
  name: string;
  season: string;
  teamCount: number;
  draftPosition: number;
  draftType: 'SNAKE';
  roster: RosterSettings;
  acquisitionsPerWeek: number;
  playoffWeeks: number[];
  primaryProjectionProvider: ProviderId;
  validationProviders: ProviderId[];
  createdAt: string;
  updatedAt: string;
}

/** One candidate as the engine saw it at decision time. */
export interface DecisionCandidate {
  playerId: string;
  name: string;
  positions: string[];
  priorityRank: number;
  ddpRank: number;
  ddpRaw: number;
  ddpScore: number;
  basePlayerValue: number;
  teamFit: number;
  label: string;
  labelRule: string;
  band: string;
  adp: number | null;
  xrank: number | null;
  risk: string;
  fitTags: string[];
}

export interface DecisionProfileEntry {
  category: Category;
  state: string;
  d: number;
  need: number;
  pi: number;
  puntLevel: string;
  override: string;
}

/** Everything needed to audit one of the user's picks against the players actually available at that moment. */
export interface DecisionRecord {
  version: 1;
  overallPick: number;
  round: number;
  /** false when the pick was recorded off the user's snake schedule. */
  onSchedule: boolean;
  selected: DecisionCandidate | { playerId: string; unprojected: true };
  recommended: DecisionCandidate | null;
  followedRecommendation: boolean;
  /** Top of the engine's priority order at decision time. */
  alternatives: DecisionCandidate[];
  profileBefore: DecisionProfileEntry[];
  profileAfter: DecisionProfileEntry[] | null;
  punt: {
    buildBefore: string;
    buildAfter: string | null;
    before: { category: Category; pi: number; level: string }[];
    after: { category: Category; pi: number; level: string }[] | null;
    overrides: Partial<Record<Category, PuntOverride>>;
  };
  timing: {
    label: string | null;
    band: string | null;
    nextPick: number | null;
    picksBeforeNext: number;
    gapType: string | null;
  };
  available: { projected: number; unprojected: number; order: string[] };
  context: { activeBatchIds: string[]; configVersion: number; rosterSizeBefore: number };
  recordedAt: string;
}

export type TimingLabel = 'DRAFT_NOW' | 'LEAN_DRAFT' | 'WAIT' | 'SAFE_WAIT' | 'PASS';

export interface PickSnapshot {
  ddpRaw: number;
  baseValue: number;
  teamFit: number;
  label: TimingLabel;
}

export type PickEvent = {
  seq: number;
  at: string;
  type: 'PICK';
  playerId: string;
  by: 'ME' | 'OTHER';
  /** true: consumes the current overall pick. false: only marks the player unavailable (resync catch-up). */
  advance: boolean;
  overallPick: number | null;
  snapshot?: PickSnapshot;
  /** Decision telemetry for the user's own picks (docs/DRAFT_DAY.md). Removed with the pick on Undo. */
  decision?: DecisionRecord;
};

export type ResyncEvent = {
  seq: number;
  at: string;
  type: 'RESYNC';
  setCurrentOverall: number;
  previousCurrentOverall: number;
};

/** Voids an earlier PICK (roster correction). The player becomes available again; the clock does not move. */
export type VoidEvent = {
  seq: number;
  at: string;
  type: 'VOID';
  targetSeq: number;
};

export type DraftEvent = PickEvent | ResyncEvent | VoidEvent;

export interface PlayerFlags {
  favorite: boolean;
  avoid: boolean;
  doNotDraft: boolean;
  lockTarget: boolean;
}

export const NO_FLAGS: PlayerFlags = { favorite: false, avoid: false, doNotDraft: false, lockTarget: false };

export type PuntOverride = 'AUTO' | 'NONE' | 'SOFT' | 'HARD';

export interface LeagueDraft {
  leagueId: string;
  events: DraftEvent[];
  flags: Record<string, PlayerFlags>;
  puntOverrides: Partial<Record<Category, PuntOverride>>;
}

export function rosterSize(r: RosterSettings): number {
  return activeSlotCount(r) + r.bench;
}

export function activeSlotCount(r: RosterSettings): number {
  return Object.values(r.active).reduce((a, b) => a + b, 0);
}
