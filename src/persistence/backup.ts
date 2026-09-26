import { z } from 'zod';
import { StrategyConfigSchema } from '@/domain/config/strategyConfig';
import { BACKUP_SCHEMA_VERSION, type BackupFile } from './repository';

/**
 * Backup validation. The envelope and the draft-critical records (leagues, drafts, config) are
 * validated strictly; bulk data tables are validated structurally (arrays of objects) because
 * their row shapes are enforced at import time.
 */
const rosterSchema = z.object({
  active: z.object({
    PG: z.number().int().min(0),
    SG: z.number().int().min(0),
    G: z.number().int().min(0),
    SF: z.number().int().min(0),
    PF: z.number().int().min(0),
    F: z.number().int().min(0),
    C: z.number().int().min(0),
    UTIL: z.number().int().min(0),
  }),
  bench: z.number().int().min(0),
  il: z.number().int().min(0),
});

export const LeagueProfileSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(100),
  season: z.string().max(20),
  teamCount: z.number().int().min(2).max(30),
  draftPosition: z.number().int().min(1).max(30),
  draftType: z.literal('SNAKE'),
  roster: rosterSchema,
  acquisitionsPerWeek: z.number().int().min(0).max(50),
  playoffWeeks: z.array(z.number().int().min(1).max(30)),
  primaryProjectionProvider: z.string().max(40),
  validationProviders: z.array(z.string().max(40)),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const snapshot = z
  .object({ ddpRaw: z.number(), baseValue: z.number(), teamFit: z.number(), label: z.string() })
  .optional();
const eventSchema = z.discriminatedUnion('type', [
  z.object({
    seq: z.number().int(),
    at: z.string(),
    type: z.literal('PICK'),
    playerId: z.string(),
    by: z.enum(['ME', 'OTHER']),
    advance: z.boolean(),
    overallPick: z.number().int().nullable(),
    snapshot,
    // Decision telemetry (DecisionRecord). Free-form audit data: kept verbatim, never read by the engine.
    decision: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    seq: z.number().int(),
    at: z.string(),
    type: z.literal('RESYNC'),
    setCurrentOverall: z.number().int().min(1),
    previousCurrentOverall: z.number().int().min(1),
  }),
  z.object({ seq: z.number().int(), at: z.string(), type: z.literal('VOID'), targetSeq: z.number().int() }),
]);
const flagsSchema = z.object({
  favorite: z.boolean(),
  avoid: z.boolean(),
  doNotDraft: z.boolean(),
  lockTarget: z.boolean(),
});
export const LeagueDraftSchema = z.object({
  leagueId: z.string(),
  events: z.array(eventSchema),
  flags: z.record(z.string(), flagsSchema),
  puntOverrides: z.record(z.string(), z.enum(['AUTO', 'NONE', 'SOFT', 'HARD'])),
});

const rows = z.array(z.record(z.string(), z.unknown()));

export const BackupSchema = z.object({
  app: z.literal('ybfantasy-draft-engine'),
  schemaVersion: z.number().int().max(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  leagues: z.array(LeagueProfileSchema),
  drafts: z.array(LeagueDraftSchema),
  identities: rows,
  market: rows,
  projections: rows,
  availability: rows,
  context: rows,
  playoff: rows,
  batches: rows,
  mappings: rows,
  unmatched: rows,
  config: StrategyConfigSchema.nullable(),
  settings: z.object({
    activeLeagueId: z.string().nullable(),
    compactMode: z.boolean(),
    theme: z.enum(['system', 'light', 'dark']),
  }),
});

export function parseBackup(
  text: string,
): { ok: true; backup: BackupFile } | { ok: false; errors: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Not valid JSON.'] };
  }
  const r = BackupSchema.safeParse(json);
  if (!r.success)
    return { ok: false, errors: r.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`) };
  return { ok: true, backup: r.data as unknown as BackupFile };
}

/** Per-league draft export (events, flags, punt overrides + the league profile). */
export const LeagueExportSchema = z.object({
  app: z.literal('ybfantasy-draft-engine'),
  kind: z.literal('league-draft'),
  exportedAt: z.string(),
  league: LeagueProfileSchema,
  draft: LeagueDraftSchema,
});
