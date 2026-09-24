import type { StrategyConfig } from '../config/strategyConfig';
import type { InjuryStatus, Position, RoleTag } from '../types/core';
import type { Absence, ImportKind, SourceConfidence, SourceMeta } from '../types/data';
import { parseNumber, parsePctCell, parsePositions, parseRoleTags, parseStatus, sanitizeText } from './parse';

/** Validated, typed row values (before identity reconciliation). */
export interface IdentityFields {
  name: string;
  team: string | null;
  positions: Position[];
  providerPlayerId: string | null;
}
export interface ProjectionRow extends IdentityFields {
  gp: number;
  mpg: number | null;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  threes: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  sourcePct: { fg: number | null; ft: number | null };
  upside: number | null;
  providerRank: number | null;
  providerAdp: number | null;
  weekGames: Record<number, number>;
  raw: Record<string, string>;
}
export interface MarketRow extends IdentityFields {
  xrank: number | null;
  rank: number | null;
  adp: number | null;
  status: InjuryStatus | null;
  meta: SourceMeta;
  raw: Record<string, string>;
}
export interface AvailabilityRow extends IdentityFields {
  season: string;
  gamesPlayed: number;
  teamGames: number;
  absences: Absence[];
}
export interface ContextRow extends IdentityFields {
  age: number | null;
  status: InjuryStatus;
  recoveryNote: string;
  manualRiskDelta: number | null;
  manualUpside: number | null;
  providerUpside: number | null;
  roleTags: RoleTag[];
  previousSeasonMpg: number | null;
  note: string;
}
export interface PlayoffRow {
  team: string;
  gamesByWeek: Record<number, number>;
}

export type RowValue = ProjectionRow | MarketRow | AvailabilityRow | ContextRow | PlayoffRow;

export type RowResult<T> = { ok: true; value: T; warnings: string[] } | { ok: false; errors: string[] };

type Cells = (key: string) => string | undefined;

/** Raw source cells for the mapped fields (and detected week columns), preserved verbatim. */
function rawCells(
  row: Record<string, string>,
  map: Record<string, string | null>,
  weekColumns: Record<string, number>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of Object.values(map)) if (h && row[h] !== undefined) out[h] = sanitizeText(row[h], 120);
  for (const h of Object.keys(weekColumns)) if (row[h] !== undefined) out[h] = sanitizeText(row[h], 20);
  return out;
}

/** Yahoo field keys that a screenshot transcription may flag as unreadable. */
export const YAHOO_REVIEWABLE_FIELDS = ['xrank', 'rank', 'adp', 'status', 'positions', 'team'] as const;
const REVIEW_ALIASES: Record<string, string> = {
  xrank: 'xrank',
  'x rank': 'xrank',
  rank: 'rank',
  adp: 'adp',
  l7: 'adp',
  'l7 adp': 'adp',
  'last 7 days adp': 'adp',
  status: 'status',
  pos: 'positions',
  positions: 'positions',
  team: 'team',
};

function cellsFor(row: Record<string, string>, map: Record<string, string | null>): Cells {
  return (key) => {
    const h = map[key];
    return h ? row[h] : undefined;
  };
}

class Collector {
  errors: string[] = [];
  warnings: string[] = [];
  num(
    cells: Cells,
    key: string,
    label: string,
    opts: { required?: boolean; min?: number; max?: number } = {},
  ): number | null {
    const v = parseNumber(cells(key));
    if (v === null) {
      if (opts.required) this.errors.push(`${label} is required.`);
      return null;
    }
    if (Number.isNaN(v)) {
      this.errors.push(`${label} is not a number.`);
      return null;
    }
    if (opts.min !== undefined && v < opts.min) this.errors.push(`${label} must be ≥ ${opts.min}.`);
    if (opts.max !== undefined && v > opts.max) this.errors.push(`${label} must be ≤ ${opts.max}.`);
    return v;
  }
}

function identityFields(c: Collector, cells: Cells): IdentityFields {
  const name = sanitizeText(cells('name'), 80);
  if (!name) c.errors.push('Player name is required.');
  const { positions, invalid } = parsePositions(cells('positions'));
  if (invalid.length) c.errors.push(`Unknown position(s): ${invalid.join(', ')}.`);
  const team = sanitizeText(cells('team'), 8) || null;
  const pid = sanitizeText(cells('providerPlayerId'), 40) || null;
  return { name, team, positions, providerPlayerId: pid };
}

/** Resolve makes/attempts/pct triple (DESIGN §5.1). */
function shooting(
  c: Collector,
  cells: Cells,
  prefix: 'fg' | 'ft',
  tol: number,
): { makes: number; attempts: number; pct: number | null } {
  const label = prefix.toUpperCase();
  const pctCell = parsePctCell(cells(`${prefix}Pct`));
  let makes = c.num(cells, `${prefix}m`, `${label}M`, { min: 0 });
  let attempts = c.num(cells, `${prefix}a`, `${label}A`, { min: 0 });
  if (makes === null && pctCell.makes !== null) makes = pctCell.makes;
  if (attempts === null && pctCell.attempts !== null) attempts = pctCell.attempts;
  const pct = pctCell.pct !== null && Number.isNaN(pctCell.pct) ? null : pctCell.pct;
  if (pctCell.pct !== null && Number.isNaN(pctCell.pct)) c.errors.push(`${label}% is not a number.`);
  if (attempts === null) {
    c.errors.push(`${label}A (attempts) is required — percentages need volume.`);
    return { makes: 0, attempts: 0, pct };
  }
  if (makes === null) {
    if (pct === null) {
      c.errors.push(`${label}M or ${label}% is required.`);
      return { makes: 0, attempts, pct };
    }
    makes = pct * attempts;
  }
  if (makes > attempts + 1e-9) c.errors.push(`${label}M cannot exceed ${label}A.`);
  if (pct !== null && attempts > 0 && Math.abs(makes / attempts - pct) > tol)
    c.warnings.push(
      `${label}% ${pct.toFixed(3)} disagrees with ${label}M/${label}A ${(makes / attempts).toFixed(3)}; makes/attempts used.`,
    );
  if (pct !== null && (pct < 0 || pct > 1)) c.errors.push(`${label}% must be between 0 and 1.`);
  return { makes, attempts, pct };
}

export function validateRow(
  kind: ImportKind,
  row: Record<string, string>,
  columnMap: Record<string, string | null>,
  config: StrategyConfig,
  weekColumns: Record<string, number> = {},
): RowResult<RowValue> {
  const c = new Collector();
  const cells = cellsFor(row, columnMap);
  const done = <T>(value: T): RowResult<T> =>
    c.errors.length ? { ok: false, errors: c.errors } : { ok: true, value, warnings: c.warnings };

  switch (kind) {
    case 'PROJECTION': {
      const id = identityFields(c, cells);
      const basis = sanitizeText(cells('statBasis'), 12).toUpperCase() || 'PER_GAME';
      if (basis !== 'PER_GAME' && basis !== 'TOTAL') c.errors.push('Stat basis must be PER_GAME or TOTAL.');
      const gp = c.num(cells, 'gp', 'GP', { required: true, min: 0, max: config.seasonGames }) ?? 0;
      const mpg = c.num(cells, 'mpg', 'MPG', { min: 0, max: 60 });
      const fg = shooting(c, cells, 'fg', config.pctConsistencyTolerance);
      const ft = shooting(c, cells, 'ft', config.pctConsistencyTolerance);
      const counting = {
        threes: c.num(cells, 'threes', '3PM', { required: true, min: 0 }) ?? 0,
        pts: c.num(cells, 'pts', 'PTS', { required: true, min: 0 }) ?? 0,
        reb: c.num(cells, 'reb', 'REB', { required: true, min: 0 }) ?? 0,
        ast: c.num(cells, 'ast', 'AST', { required: true, min: 0 }) ?? 0,
        stl: c.num(cells, 'stl', 'STL', { required: true, min: 0 }) ?? 0,
        blk: c.num(cells, 'blk', 'BLK', { required: true, min: 0 }) ?? 0,
        to: c.num(cells, 'to', 'TO', { required: true, min: 0 }) ?? 0,
      };
      const upside = c.num(cells, 'upside', 'Upside', { min: 0, max: 1 });
      const providerRank = c.num(cells, 'providerRank', 'Provider rank', { min: 1 });
      const providerAdp = c.num(cells, 'providerAdp', 'Provider ADP', { min: 1 });
      const weekGames: Record<number, number> = {};
      for (const [header, week] of Object.entries(weekColumns)) {
        const v = parseNumber(row[header]);
        if (v === null) continue;
        if (Number.isNaN(v) || v < 0 || v > 7) c.errors.push(`Week ${week} games must be 0–7.`);
        else weekGames[week] = v;
      }
      const div = basis === 'TOTAL' ? gp : 1;
      if (basis === 'TOTAL' && gp <= 0) c.errors.push('TOTAL stats need GP > 0 to convert to per game.');
      const pg = (x: number) => (div > 0 ? x / div : 0);
      const perGame = {
        fgm: pg(fg.makes),
        fga: pg(fg.attempts),
        ftm: pg(ft.makes),
        fta: pg(ft.attempts),
        threes: pg(counting.threes),
        pts: pg(counting.pts),
        reb: pg(counting.reb),
        ast: pg(counting.ast),
        stl: pg(counting.stl),
        blk: pg(counting.blk),
        to: pg(counting.to),
      };
      if (perGame.pts > 80 || perGame.reb > 40 || perGame.fga > 50)
        c.errors.push('Per-game values are implausibly large — is the stat basis TOTAL?');
      return done<ProjectionRow>({
        ...id,
        gp,
        mpg,
        ...perGame,
        sourcePct: { fg: fg.pct, ft: ft.pct },
        upside,
        providerRank,
        providerAdp,
        weekGames,
        raw: rawCells(row, columnMap, weekColumns),
      });
    }
    case 'YAHOO_MARKET': {
      const id = identityFields(c, cells);
      // Screenshot transcription metadata: fields marked unreadable are forced to null (never inferred).
      const reviewFields: string[] = [];
      for (const part of (cells('reviewFields') ?? '').split(/[;,|]+/)) {
        const key = REVIEW_ALIASES[part.trim().toLowerCase()];
        if (key && !reviewFields.includes(key)) reviewFields.push(key);
        else if (part.trim() && !key) c.warnings.push(`Unknown review field "${sanitizeText(part, 20)}".`);
      }
      const flagged = (k: string) => reviewFields.includes(k);
      const readNum = (k: string, label: string) => {
        if (flagged(k)) {
          if ((cells(k) ?? '').trim() !== '')
            c.warnings.push(`${label} is flagged unreadable; its value was ignored (null).`);
          return null;
        }
        return c.num(cells, k, label, { min: 1 });
      };
      const xrank = readNum('xrank', 'XRank');
      const rank = readNum('rank', 'Rank');
      const adp = readNum('adp', 'ADP');
      if (flagged('positions')) id.positions = [];
      if (flagged('team')) id.team = null;
      const confRaw = sanitizeText(cells('confidence'), 10).toUpperCase();
      let confidence: SourceConfidence | null = null;
      if (confRaw) {
        if (confRaw === 'HIGH' || confRaw === 'MEDIUM' || confRaw === 'LOW') confidence = confRaw;
        else c.errors.push('Confidence must be HIGH, MEDIUM or LOW.');
      }
      if (reviewFields.length) c.warnings.push(`Needs review: ${reviewFields.join(', ')}.`);
      const meta: SourceMeta = {
        source: sanitizeText(cells('source'), 40) || null,
        capturedAt: sanitizeText(cells('capturedAt'), 40) || null,
        confidence,
        reviewFields,
      };
      const rawStatus = flagged('status') ? undefined : cells('status');
      let status: InjuryStatus | null = null;
      if (rawStatus !== undefined && rawStatus.trim() !== '') {
        const s = parseStatus(rawStatus);
        if (s === 'INVALID') c.warnings.push(`Unrecognized status "${sanitizeText(rawStatus, 20)}" ignored.`);
        else status = s;
      }
      if (xrank === null && rank === null && adp === null)
        c.warnings.push('No market values (ADP/XRank/Rank) on this row.');
      return done<MarketRow>({ ...id, xrank, rank, adp, status, meta, raw: rawCells(row, columnMap, {}) });
    }
    case 'AVAILABILITY': {
      const id = identityFields(c, cells);
      const season = sanitizeText(cells('season'), 12);
      if (!season) c.errors.push('Season is required.');
      const teamGames = c.num(cells, 'teamGames', 'Team games', { min: 1, max: 100 }) ?? config.seasonGames;
      const gamesPlayed = c.num(cells, 'gamesPlayed', 'Games played', { required: true, min: 0 }) ?? 0;
      if (gamesPlayed > teamGames) c.errors.push('Games played cannot exceed team games.');
      const absences: Absence[] = [];
      const note = sanitizeText(cells('note'));
      const pairs: [string, Absence['recurrence']][] = [
        ['missedLow', 'LOW'],
        ['missedModerate', 'MODERATE'],
        ['missedHigh', 'HIGH'],
        ['missedUnclassified', 'UNCLASSIFIED'],
      ];
      for (const [key, rec] of pairs) {
        const g = c.num(cells, key, `Missed (${rec})`, { min: 0, max: 100 });
        if (g !== null && g > 0) absences.push({ games: g, recurrence: rec, ...(note ? { note } : {}) });
      }
      const missedTotal = absences.reduce((a, b) => a + b.games, 0);
      if (missedTotal > teamGames - gamesPlayed + 1e-9)
        c.warnings.push('Classified missed games exceed (team games − games played).');
      return done<AvailabilityRow>({ ...id, season, gamesPlayed, teamGames, absences });
    }
    case 'CONTEXT': {
      const id = identityFields(c, cells);
      const age = c.num(cells, 'age', 'Age', { min: 15, max: 50 });
      const rawStatus = cells('status');
      let status: InjuryStatus = 'HEALTHY';
      if (rawStatus !== undefined && rawStatus.trim() !== '') {
        const s = parseStatus(rawStatus);
        if (s === 'INVALID') c.errors.push(`Unknown status "${sanitizeText(rawStatus, 20)}".`);
        else status = s;
      }
      const tags = parseRoleTags(cells('roleTags'));
      if (tags.invalid.length) c.errors.push(`Unknown role tag(s): ${tags.invalid.join(', ')}.`);
      return done<ContextRow>({
        ...id,
        age,
        status,
        recoveryNote: sanitizeText(cells('recoveryNote')),
        manualRiskDelta: c.num(cells, 'manualRiskDelta', 'Risk adjustment', { min: -0.3, max: 0.3 }),
        manualUpside: c.num(cells, 'manualUpside', 'Manual upside', { min: 0, max: 1 }),
        providerUpside: c.num(cells, 'providerUpside', 'Provider upside', { min: 0, max: 1 }),
        roleTags: tags.tags,
        previousSeasonMpg: c.num(cells, 'previousSeasonMpg', 'Previous MPG', { min: 0, max: 60 }),
        note: sanitizeText(cells('note')),
      });
    }
    case 'PLAYOFF': {
      const team = sanitizeText(cells('team'), 8);
      if (!team) c.errors.push('Team is required.');
      const gamesByWeek: Record<number, number> = {};
      for (const [header, week] of Object.entries(weekColumns)) {
        const v = parseNumber(row[header]);
        if (v === null) continue;
        if (Number.isNaN(v) || v < 0 || v > 7) c.errors.push(`Week ${week} games must be 0–7.`);
        else gamesByWeek[week] = v;
      }
      if (Object.keys(gamesByWeek).length === 0) c.errors.push('No week columns (W18, W19, …) found.');
      return done<PlayoffRow>({ team, gamesByWeek });
    }
  }
}
