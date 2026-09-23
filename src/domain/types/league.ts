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
