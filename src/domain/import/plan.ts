import type { StrategyConfig } from '../config/strategyConfig';
import {
  addToIndex,
  buildIdentityIndex,
  matchPlayer,
  sameTeamNearMatches,
  providerKeyFor,
  type MatchResult,
} from '../identity/matcher';
import { normalizeName, normalizeTeam } from '../identity/normalize';
import type {
  AvailabilitySeason,
  ImportBatch,
  ImportKind,
  ManualMapping,
  PlayerContext,
  PlayerIdentity,
  ProjectionLine,
  ProviderId,
  TeamPlayoffSchedule,
  UnmatchedRow,
  YahooMarket,
} from '../types/data';
import { detectWeekColumns } from './fields';
import type { ParsedTable } from './parse';
import {
  validateRow,
  type AvailabilityRow,
  type ContextRow,
  type IdentityFields,
  type MarketRow,
  type PlayoffRow,
  type ProjectionRow,
  type RowValue,
} from './rows';

/**
 * Import planning (pure). Produces everything a commit needs; nothing is written until the
 * repository commits the plan in a single atomic transaction (DATA_IMPORT.md).
 */

export type CreatePolicy = 'AUTO' | 'CREATE_UNMATCHED' | 'NEVER';

export interface ImportRequest {
  kind: ImportKind;
  provider: ProviderId;
  season: string;
  description: string;
  table: ParsedTable;
  columnMap: Record<string, string | null>;
  identities: readonly PlayerIdentity[];
  mappings: readonly ManualMapping[];
  config: StrategyConfig;
  createPolicy: CreatePolicy;
  batchId: string;
  now: string;
  newId: () => string;
}

export interface ImportRecords {
  market: YahooMarket[];
  projections: ProjectionLine[];
  availability: AvailabilitySeason[];
  context: PlayerContext[];
  playoff: TeamPlayoffSchedule[];
}

export interface ImportPlan {
  batch: ImportBatch;
  records: ImportRecords;
  newIdentities: PlayerIdentity[];
  identityUpdates: PlayerIdentity[];
  unmatched: UnmatchedRow[];
  rejected: { rowNumber: number; name: string; errors: string[] }[];
  duplicates: { rowNumber: number; name: string; canonicalPlayerId: string }[];
  rowWarnings: { rowNumber: number; name: string; warnings: string[] }[];
  /** File-level warnings (e.g. rows from more than one capture in a projection snapshot). */
  batchWarnings: string[];
  matchedVia: Record<string, number>;
  missingRequiredColumns: string[];
}

export function emptyRecords(): ImportRecords {
  return { market: [], projections: [], availability: [], context: [], playoff: [] };
}

/** Build the per-kind record for a canonical player from a validated row value. */
export function recordFor(
  kind: ImportKind,
  value: RowValue,
  canonicalPlayerId: string,
  batchId: string,
  provider: ProviderId,
  season: string,
  records: ImportRecords,
): void {
  switch (kind) {
    case 'PROJECTION': {
      const v = value as ProjectionRow;
      records.projections.push({
        canonicalPlayerId,
        provider,
        season,
        importBatchId: batchId,
        gp: v.gp,
        mpg: v.mpg,
        fgm: v.fgm,
        fga: v.fga,
        ftm: v.ftm,
        fta: v.fta,
        threes: v.threes,
        pts: v.pts,
        reb: v.reb,
        ast: v.ast,
        stl: v.stl,
        blk: v.blk,
        to: v.to,
        sourcePct: v.sourcePct,
        meta: v.meta,
        sourceTeam: normalizeTeam(v.team),
        sourcePositions: v.positions,
        providerUpside: v.upside,
        providerRank: v.providerRank,
        providerAdp: v.providerAdp,
        ...(Object.keys(v.weekGames).length ? { weekGames: v.weekGames } : {}),
        raw: v.raw,
      });
      return;
    }
    case 'YAHOO_MARKET': {
      const v = value as MarketRow;
      records.market.push({
        canonicalPlayerId,
        season,
        importBatchId: batchId,
        yahooXRank: v.xrank,
        yahooRank: v.rank,
        yahooAdp7d: v.adp,
        status: v.status,
        meta: v.meta,
        raw: v.raw,
      });
      return;
    }
    case 'AVAILABILITY': {
      const v = value as AvailabilityRow;
      records.availability.push({
        canonicalPlayerId,
        season: v.season,
        importBatchId: batchId,
        gamesPlayed: v.gamesPlayed,
        teamGames: v.teamGames,
        gamesAvailable: v.gamesAvailable,
        absences: v.absences,
        suspensionGames: v.suspensionGames,
        otherNonInjuryGames: v.otherNonInjuryGames,
        teams: v.teams,
        ...(v.statusNote ? { statusNote: v.statusNote } : {}),
        meta: v.meta,
        raw: v.raw,
      });
      return;
    }
    case 'CONTEXT': {
      const v = value as ContextRow;
      records.context.push({
        canonicalPlayerId,
        importBatchId: batchId,
        age: v.age,
        currentStatus: v.status,
        ...(v.recoveryNote ? { recoveryNote: v.recoveryNote } : {}),
        ...(v.manualRiskDelta !== null ? { manualRiskDelta: v.manualRiskDelta } : {}),
        ...(v.manualUpside !== null ? { manualUpside: v.manualUpside } : {}),
        ...(v.providerUpside !== null ? { providerUpside: v.providerUpside } : {}),
        ...(v.roleTags.length ? { roleTags: v.roleTags } : {}),
        previousSeasonMpg: v.previousSeasonMpg,
        ...(v.note ? { note: v.note } : {}),
      });
      return;
    }
    case 'PLAYOFF':
      return;
  }
}

/** Apply identity-side facts from a row (positions, team, provider ID). Returns a new object or null if unchanged. */
export function applyIdentityFacts(
  kind: ImportKind,
  provider: ProviderId,
  identity: PlayerIdentity,
  row: IdentityFields,
): PlayerIdentity | null {
  const next: PlayerIdentity = {
    ...identity,
    providerIds: { ...identity.providerIds },
    aliases: [...identity.aliases],
  };
  let changed = false;
  const team = normalizeTeam(row.team);
  if (kind === 'YAHOO_MARKET') {
    if (
      row.positions.length &&
      (next.positionsSource !== 'YAHOO' || next.positions.join() !== row.positions.join())
    ) {
      if (next.positionsSource !== 'MANUAL') {
        next.positions = row.positions;
        next.positionsSource = 'YAHOO';
        changed = true;
      }
    }
    if (team && team !== next.nbaTeam) {
      next.nbaTeam = team;
      changed = true;
    }
    if (row.providerPlayerId && next.yahooPlayerId !== row.providerPlayerId) {
      next.yahooPlayerId = row.providerPlayerId;
      changed = true;
    }
  } else {
    // Historical availability rows never change the identity's current team or eligibility.
    const historical = kind === 'AVAILABILITY';
    if (
      !historical &&
      row.positions.length &&
      (next.positionsSource === 'NONE' || next.positions.length === 0)
    ) {
      next.positions = row.positions;
      next.positionsSource = 'PROVIDER';
      changed = true;
    }
    if (!historical && team && !next.nbaTeam) {
      next.nbaTeam = team;
      changed = true;
    }
    if (row.providerPlayerId && next.providerIds[provider] !== row.providerPlayerId) {
      next.providerIds[provider] = row.providerPlayerId;
      changed = true;
    }
  }
  const n = normalizeName(row.name);
  if (n && n !== next.normalizedName && !next.aliases.some((a) => normalizeName(a) === n)) {
    next.aliases.push(row.name);
    changed = true;
  }
  return changed ? next : null;
}

export function newIdentityFromRow(
  kind: ImportKind,
  provider: ProviderId,
  row: IdentityFields,
  id: string,
): PlayerIdentity {
  return {
    canonicalPlayerId: id,
    canonicalName: row.name,
    normalizedName: normalizeName(row.name),
    nbaTeam: normalizeTeam(row.team),
    aliases: [],
    ...(kind === 'YAHOO_MARKET' && row.providerPlayerId ? { yahooPlayerId: row.providerPlayerId } : {}),
    providerIds: kind !== 'YAHOO_MARKET' && row.providerPlayerId ? { [provider]: row.providerPlayerId } : {},
    positions: row.positions,
    positionsSource: row.positions.length ? (kind === 'YAHOO_MARKET' ? 'YAHOO' : 'PROVIDER') : 'NONE',
    origin: provider,
  };
}

function dedupeKey(kind: ImportKind, canonicalId: string, value: RowValue): string {
  return kind === 'AVAILABILITY' ? `${canonicalId}|${(value as AvailabilityRow).season}` : canonicalId;
}

export function planImport(req: ImportRequest): ImportPlan {
  const { kind, provider, season, table, columnMap, config } = req;
  const records = emptyRecords();
  const rejected: ImportPlan['rejected'] = [];
  const duplicates: ImportPlan['duplicates'] = [];
  const rowWarnings: ImportPlan['rowWarnings'] = [];
  const captures = new Set<string>();
  const unmatched: UnmatchedRow[] = [];
  const matchedVia: Record<string, number> = {};
  const newIdentities: PlayerIdentity[] = [];
  const updates = new Map<string, PlayerIdentity>();

  const specs = requiredFieldsFor(kind);
  const missingRequiredColumns = specs.filter((k) => !columnMap[k]);
  const weekColumns = kind === 'PLAYOFF' || kind === 'PROJECTION' ? detectWeekColumns(table.headers) : {};

  const idx = buildIdentityIndex(req.identities, req.mappings);
  // AUTO creates identities for NO_MATCH rows (never for ambiguous ones) when:
  //  - the identity table is empty (first projection or market import), or
  //  - this is a Yahoo import and every existing identity came from Yahoo. Yahoo is authoritative for Yahoo
  //    identities and both Yahoo datasets use Yahoo's own spelling, so an unmatched Yahoo row is a genuinely
  //    different player (e.g. projected but outside the captured market list).
  // Otherwise (mixed providers) unmatched rows go to the review queue: a spelling variant must not silently
  // become a second player.
  const allYahoo = req.identities.every((i) => i.origin === 'yahoo');
  // The Yahoo rule creates into an existing identity table, so guard it: a NO_MATCH row with a same-team player
  // of a similar name (a likely transcription/spelling variant) goes to review with those candidates instead of
  // silently becoming a second player. (Not applied to an empty table or to an explicit CREATE_UNMATCHED.)
  const nearGuard = req.createPolicy === 'AUTO' && req.identities.length > 0;
  let near: string[] = [];
  const allowCreate =
    req.createPolicy === 'CREATE_UNMATCHED' ||
    (req.createPolicy === 'AUTO' &&
      (kind === 'PROJECTION' || kind === 'YAHOO_MARKET') &&
      (req.identities.length === 0 || (provider === 'yahoo' && allYahoo)));
  const seen = new Map<string, number>();
  const createdIds = new Set<string>();
  const claimedIds = new Set<string>();
  const seenTeams = new Set<string>();
  const claimedOrCreated = () => new Set([...claimedIds, ...createdIds]);

  if (missingRequiredColumns.length === 0) {
    table.rows.forEach((row, i) => {
      const rowNumber = i + 2; // header is row 1
      const res = validateRow(kind, row, columnMap, config, weekColumns);
      const name = row[columnMap.name ?? ''] ?? row[columnMap.team ?? ''] ?? '';
      if (!res.ok) {
        rejected.push({ rowNumber, name, errors: res.errors });
        return;
      }
      if (res.warnings.length) rowWarnings.push({ rowNumber, name, warnings: res.warnings });
      const cap = (res.value as { meta?: { capturedAt: string | null } }).meta?.capturedAt;
      if (cap) captures.add(cap);

      if (kind === 'PLAYOFF') {
        const v = res.value as PlayoffRow;
        const team = normalizeTeam(v.team) ?? v.team;
        if (seenTeams.has(team)) {
          duplicates.push({ rowNumber, name: team, canonicalPlayerId: team });
          return;
        }
        seenTeams.add(team);
        records.playoff.push({
          nbaTeam: team,
          season,
          importBatchId: req.batchId,
          gamesByWeek: v.gamesByWeek,
        });
        return;
      }

      const v = res.value as RowValue & IdentityFields;
      const input = { provider, providerPlayerId: v.providerPlayerId, name: v.name, team: v.team };
      let m: MatchResult = matchPlayer(idx, input);
      near = [];
      // History rows can list several teams (a trade). Try each through the normal matcher (name + team);
      // a single consistent hit wins, otherwise the team-less match (alias → unique name → review) stands.
      if (
        kind === 'AVAILABILITY' &&
        (v as AvailabilityRow).teams.length > 1 &&
        (m.kind !== 'MATCHED' || m.via === 'NAME')
      ) {
        const hits = new Set<string>();
        for (const t of (v as AvailabilityRow).teams) {
          const r = matchPlayer(idx, { ...input, team: t });
          if (r.kind === 'MATCHED' && r.via === 'NAME_TEAM') hits.add(r.canonicalPlayerId);
        }
        if (hits.size === 1) m = { kind: 'MATCHED', canonicalPlayerId: [...hits][0]!, via: 'NAME_TEAM' };
      }
      // A weak (name/alias-only) match onto an identity that THIS import already created or claimed
      // means two different rows want one player — never merge them silently.
      if (kind !== 'AVAILABILITY' && m.kind === 'MATCHED' && (m.via === 'NAME' || m.via === 'ALIAS')) {
        const claimed = createdIds.has(m.canonicalPlayerId) || claimedIds.has(m.canonicalPlayerId);
        if (claimed)
          m =
            createdIds.has(m.canonicalPlayerId) && allowCreate
              ? { kind: 'NO_MATCH' }
              : { kind: 'AMBIGUOUS', candidateIds: [m.canonicalPlayerId], step: m.via };
      }
      let canonicalId: string | null = null;
      if (m.kind === 'IGNORED') return;
      if (m.kind === 'MATCHED') {
        canonicalId = m.canonicalPlayerId;
        matchedVia[m.via] = (matchedVia[m.via] ?? 0) + 1;
      } else if (
        m.kind === 'NO_MATCH' &&
        allowCreate &&
        (nearGuard
          ? (near = sameTeamNearMatches(idx, v.name, v.team, claimedOrCreated())).length === 0
          : true)
      ) {
        const identity = newIdentityFromRow(kind, provider, v, req.newId());
        newIdentities.push(identity);
        createdIds.add(identity.canonicalPlayerId);
        addToIndex(idx, identity);
        canonicalId = identity.canonicalPlayerId;
        matchedVia.CREATED = (matchedVia.CREATED ?? 0) + 1;
      } else {
        unmatched.push({
          id: req.newId(),
          batchId: req.batchId,
          kind,
          provider,
          providerKey: providerKeyFor(input),
          rawName: v.name,
          rawTeam: v.team,
          reason: m.kind === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NO_MATCH',
          candidateIds: m.kind === 'AMBIGUOUS' ? m.candidateIds : near,
          payload: v,
        });
        return;
      }
      const key = dedupeKey(kind, canonicalId, v);
      if (seen.has(key)) {
        duplicates.push({ rowNumber, name: v.name, canonicalPlayerId: canonicalId });
        return;
      }
      seen.set(key, rowNumber);
      claimedIds.add(canonicalId);
      recordFor(kind, v, canonicalId, req.batchId, provider, season, records);
      const created = newIdentities.find((p) => p.canonicalPlayerId === canonicalId);
      if (!created) {
        const base = updates.get(canonicalId) ?? idx.byId.get(canonicalId)!;
        const upd = applyIdentityFacts(kind, provider, base, v);
        if (upd) {
          updates.set(canonicalId, upd);
          idx.byId.set(canonicalId, upd);
        }
      }
    });
  }

  const counts = {
    rows: table.rows.length,
    matched:
      records.market.length +
      records.projections.length +
      records.availability.length +
      records.context.length +
      records.playoff.length,
    created: newIdentities.length,
    unmatched: unmatched.length,
    rejected: rejected.length + duplicates.length,
  };
  return {
    batch: {
      id: req.batchId,
      kind,
      provider,
      season,
      importedAt: req.now,
      description: req.description,
      counts,
      status: 'ACTIVE',
      ...(captures.size ? { capturedAt: [...captures].sort() } : {}),
    },
    records,
    newIdentities,
    identityUpdates: [...updates.values()],
    unmatched,
    rejected,
    duplicates,
    rowWarnings,
    batchWarnings:
      kind === 'PROJECTION' && captures.size > 1
        ? [
            `This file mixes ${captures.size} captures (${[...captures].sort().join(', ')}). A projection snapshot should come from one capture; statistics from different captures are not combined silently — confirm before committing.`,
          ]
        : [],
    matchedVia,
    missingRequiredColumns,
  };
}

function requiredFieldsFor(kind: ImportKind): string[] {
  switch (kind) {
    case 'PROJECTION':
      return ['name', 'gp', 'threes', 'pts', 'reb', 'ast', 'stl', 'blk', 'to'];
    case 'YAHOO_MARKET':
      return ['name'];
    case 'AVAILABILITY':
      return ['name', 'season', 'gamesPlayed'];
    case 'CONTEXT':
      return ['name'];
    case 'PLAYOFF':
      return ['team'];
  }
}
