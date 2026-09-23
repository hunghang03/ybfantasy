import type { ImportKind } from '../types/data';

/**
 * Canonical import fields per kind and the header synonyms used for automatic column mapping.
 * Users can always override the mapping in the preview step.
 */
export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  synonyms: string[];
  help?: string;
}

const NAME: FieldSpec = {
  key: 'name',
  label: 'Player name',
  required: true,
  synonyms: ['player', 'name', 'player name', 'playername', 'full name'],
};
const TEAM: FieldSpec = {
  key: 'team',
  label: 'NBA team',
  required: false,
  synonyms: ['team', 'tm', 'nba team', 'teamabbr'],
};
const POS: FieldSpec = {
  key: 'positions',
  label: 'Positions',
  required: false,
  synonyms: ['pos', 'position', 'positions', 'eligible', 'elig'],
};
const PID: FieldSpec = {
  key: 'providerPlayerId',
  label: 'Provider player ID',
  required: false,
  synonyms: ['id', 'player id', 'playerid', 'provider id', 'yahoo id', 'yahoo_id'],
};

export const FIELD_SPECS: Record<ImportKind, FieldSpec[]> = {
  PROJECTION: [
    NAME,
    TEAM,
    POS,
    PID,
    {
      key: 'gp',
      label: 'Games played',
      required: true,
      synonyms: ['gp', 'g', 'games', 'proj gp', 'projected gp'],
    },
    { key: 'mpg', label: 'Minutes/game', required: false, synonyms: ['mpg', 'min', 'minutes', 'mins'] },
    { key: 'fgm', label: 'FGM', required: false, synonyms: ['fgm', 'fg made'] },
    {
      key: 'fga',
      label: 'FGA',
      required: false,
      synonyms: ['fga', 'fg att', 'fg attempts'],
      help: 'Required unless FG% cell contains (makes/attempts)',
    },
    { key: 'fgPct', label: 'FG%', required: false, synonyms: ['fg%', 'fg pct', 'fgpct', 'fg_pct', 'fg'] },
    { key: 'ftm', label: 'FTM', required: false, synonyms: ['ftm', 'ft made'] },
    {
      key: 'fta',
      label: 'FTA',
      required: false,
      synonyms: ['fta', 'ft att', 'ft attempts'],
      help: 'Required unless FT% cell contains (makes/attempts)',
    },
    { key: 'ftPct', label: 'FT%', required: false, synonyms: ['ft%', 'ft pct', 'ftpct', 'ft_pct', 'ft'] },
    {
      key: 'threes',
      label: '3PM',
      required: true,
      synonyms: ['3pm', '3ptm', '3p', 'threes', '3pt', 'tpm', '3-pt'],
    },
    { key: 'pts', label: 'PTS', required: true, synonyms: ['pts', 'points'] },
    { key: 'reb', label: 'REB', required: true, synonyms: ['reb', 'rebounds', 'trb'] },
    { key: 'ast', label: 'AST', required: true, synonyms: ['ast', 'assists'] },
    { key: 'stl', label: 'STL', required: true, synonyms: ['stl', 'steals', 'st'] },
    { key: 'blk', label: 'BLK', required: true, synonyms: ['blk', 'blocks', 'bk'] },
    { key: 'to', label: 'TO', required: true, synonyms: ['to', 'tov', 'turnovers', 'turnover'] },
    {
      key: 'statBasis',
      label: 'Stat basis (PER_GAME/TOTAL)',
      required: false,
      synonyms: ['basis', 'stat basis'],
    },
    { key: 'upside', label: 'Provider upside (0–1)', required: false, synonyms: ['upside', 'upside score'] },
  ],
  YAHOO_MARKET: [
    NAME,
    TEAM,
    POS,
    PID,
    {
      key: 'xrank',
      label: 'Yahoo XRank',
      required: false,
      synonyms: ['xrank', 'x rank', 'x-rank', 'o-rank', 'orank'],
    },
    { key: 'rank', label: 'Yahoo Rank', required: false, synonyms: ['rank', 'rk', 'current rank'] },
    {
      key: 'adp',
      label: 'Yahoo Last 7 Days ADP',
      required: false,
      synonyms: ['adp', 'l7 adp', 'last 7 days adp', 'adp7', 'adp (l7)', 'avg pick', 'last 7 days'],
    },
    { key: 'status', label: 'Status / injury', required: false, synonyms: ['status', 'inj', 'injury'] },
  ],
  AVAILABILITY: [
    NAME,
    TEAM,
    PID,
    { key: 'season', label: 'Season', required: true, synonyms: ['season', 'year'] },
    { key: 'gamesPlayed', label: 'Games played', required: true, synonyms: ['gp', 'games played', 'games'] },
    {
      key: 'teamGames',
      label: 'Team games',
      required: false,
      synonyms: ['team games', 'teamgames', 'team gp'],
      help: 'Defaults to season length',
    },
    { key: 'missedLow', label: 'Missed — LOW recurrence', required: false, synonyms: ['missed low', 'low'] },
    {
      key: 'missedModerate',
      label: 'Missed — MODERATE',
      required: false,
      synonyms: ['missed moderate', 'moderate'],
    },
    {
      key: 'missedHigh',
      label: 'Missed — HIGH recurrence',
      required: false,
      synonyms: ['missed high', 'high'],
    },
    {
      key: 'missedUnclassified',
      label: 'Missed — unclassified',
      required: false,
      synonyms: ['missed unclassified', 'unclassified'],
    },
    { key: 'note', label: 'Note', required: false, synonyms: ['note', 'notes', 'reason'] },
  ],
  CONTEXT: [
    NAME,
    TEAM,
    PID,
    { key: 'age', label: 'Age', required: false, synonyms: ['age'] },
    {
      key: 'status',
      label: 'Current status',
      required: false,
      synonyms: ['status', 'current status', 'injury'],
    },
    { key: 'recoveryNote', label: 'Recovery note', required: false, synonyms: ['recovery', 'recovery note'] },
    {
      key: 'manualRiskDelta',
      label: 'Risk adjustment (−0.3…0.3)',
      required: false,
      synonyms: ['risk delta', 'risk adj', 'manual risk'],
    },
    {
      key: 'manualUpside',
      label: 'Manual upside (0–1)',
      required: false,
      synonyms: ['manual upside', 'upside'],
    },
    { key: 'providerUpside', label: 'Provider upside (0–1)', required: false, synonyms: ['provider upside'] },
    {
      key: 'roleTags',
      label: 'Role tags (; separated)',
      required: false,
      synonyms: ['role tags', 'tags', 'role'],
    },
    {
      key: 'previousSeasonMpg',
      label: 'Previous-season MPG',
      required: false,
      synonyms: ['prev mpg', 'previous mpg', 'last season mpg'],
    },
    { key: 'note', label: 'Note', required: false, synonyms: ['note', 'notes'] },
  ],
  PLAYOFF: [
    { key: 'team', label: 'NBA team', required: true, synonyms: ['team', 'tm', 'nba team'] },
    // week columns are detected dynamically as W<number> / Week <number>
  ],
};

function canon(h: string): string {
  return h.toLowerCase().replace(/[_]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Auto-map headers to fields by synonyms. First exact synonym match wins; each header used once. */
export function autoMapColumns(kind: ImportKind, headers: readonly string[]): Record<string, string | null> {
  const specs = FIELD_SPECS[kind];
  const used = new Set<string>();
  const map: Record<string, string | null> = {};
  for (const spec of specs) {
    const hit = headers.find(
      (h) => !used.has(h) && (spec.synonyms.includes(canon(h)) || canon(h) === spec.key.toLowerCase()),
    );
    map[spec.key] = hit ?? null;
    if (hit) used.add(hit);
  }
  return map;
}

/** For PLAYOFF imports: header → week number. */
export function detectWeekColumns(headers: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of headers) {
    const m = /^(?:w|wk|week)\s*(\d{1,2})$/i.exec(h.trim());
    if (m) out[h] = Number(m[1]);
  }
  return out;
}
