/**
 * Feasibility-spike probes and the field-availability matrix (docs/YAHOO_API.md §5).
 *
 * A field is SUPPORTED only if an authenticated response actually contained it with a value.
 * NOT EXPOSED means the relevant resource answered HTTP 2xx and the field was absent.
 * UNKNOWN means the resource was not probed, failed, or cannot be decided from a single response.
 */
import { type ApiResult, walk } from './api';

export type Availability = 'SUPPORTED' | 'NOT EXPOSED' | 'UNKNOWN';

export interface ProbeContext {
  leagueKey: string | null;
  teamKey: string | null;
}

/** Resource paths are relative to /fantasy/v2. `null` → cannot be built without the league/team key. */
export function probePlan(ctx: ProbeContext): { name: string; path: string | null }[] {
  const lk = ctx.leagueKey;
  const tk = ctx.teamKey;
  const L = (p: string) => (lk ? `/league/${lk}${p}` : null);
  const T = (p: string) => (tk ? `/team/${tk}${p}` : null);
  return [
    { name: 'game', path: '/game/nba' },
    { name: 'gameStatCategories', path: '/game/nba/stat_categories' },
    { name: 'userLeagues', path: '/users;use_login=1/games;game_codes=nba/leagues' },
    { name: 'userTeams', path: '/users;use_login=1/games;game_codes=nba/teams' },
    { name: 'leagueSettings', path: L('/settings') },
    { name: 'leagueTeams', path: L('/teams') },
    { name: 'leagueDraftResults', path: L('/draftresults') },
    { name: 'teamRoster', path: T('/roster') },
    { name: 'teamDraftResults', path: T('/draftresults') },
    { name: 'playersSortOR', path: L('/players;sort=OR;count=25') },
    { name: 'playersSortAR', path: L('/players;sort=AR;count=25') },
    { name: 'playersDraftAnalysis', path: L('/players;count=25/draft_analysis') },
    { name: 'playersOwnership', path: L('/players;count=25/ownership') },
    { name: 'playersPercentOwned', path: L('/players;count=25/percent_owned') },
    { name: 'playersStatsSeason', path: L('/players;count=10/stats;type=season') },
    { name: 'playersStatsLastWeek', path: L('/players;count=10/stats;type=lastweek') },
    // Speculative: no current official source confirms a projected-stats type. The response decides.
    { name: 'playersStatsProjected', path: L('/players;count=10/stats;type=projected_season') },
  ];
}

interface Detector {
  area: string;
  field: string;
  probes: string[];
  keys?: string[];
  keyPattern?: RegExp;
  custom?: (hits: ApiResult[]) => string | null;
}

const hasPosition = (hits: ApiResult[], re: RegExp) => {
  let found: string | null = null;
  for (const h of hits)
    walk(h.body, (k, v) => {
      if (!found && k === 'position' && typeof v === 'string' && re.test(v)) found = v;
    });
  return found ? `roster_positions includes "${found}"` : null;
};

/** Stat categories (id → display name) from settings or game stat_categories. */
export function statCategoryIds(results: ApiResult[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of results)
    walk(r.body, (_k, _v, parent) => {
      const id = parent.stat_id;
      const name = parent.display_name ?? parent.abbr ?? parent.name;
      if (
        (typeof id === 'string' || typeof id === 'number') &&
        typeof name === 'string' &&
        !m.has(String(id))
      )
        m.set(String(id), name);
    });
  return m;
}

function statValueDetector(displayNames: string[], statsProbe: string): Detector['custom'] {
  return (hits) => {
    const cats = statCategoryIds(hits);
    const ids = [...cats].filter(([, n]) => displayNames.includes(n)).map(([id]) => id);
    if (!ids.length) return null;
    const statHits = hits.filter((h) => h.path.includes(statsProbe));
    let value: string | null = null;
    for (const h of statHits)
      walk(h.body, (_k, _v, parent) => {
        if (
          value === null &&
          ids.includes(String(parent.stat_id)) &&
          parent.value !== undefined &&
          parent.value !== ''
        )
          value = String(parent.value);
      });
    return value !== null ? `stat_id ${ids.join('/')} (${displayNames.join('/')}) has values` : null;
  };
}

const STAT_PROBES = ['leagueSettings', 'gameStatCategories'];
const stat = (
  field: string,
  names: string[],
  type = 'type=season',
  probe = 'playersStatsSeason',
): Detector => ({
  area: 'Statistics',
  field,
  probes: [...STAT_PROBES, probe],
  custom: statValueDetector(names, type),
});

export const DETECTORS: Detector[] = [
  { area: 'League', field: "user's NBA leagues", probes: ['userLeagues'], keys: ['league_key'] },
  {
    area: 'League',
    field: 'league key / ID',
    probes: ['userLeagues', 'leagueSettings'],
    keys: ['league_key', 'league_id'],
  },
  { area: 'League', field: 'season', probes: ['userLeagues', 'game'], keys: ['season'] },
  { area: 'League', field: 'league name', probes: ['userLeagues', 'leagueSettings'], keys: ['name'] },
  {
    area: 'League',
    field: 'number of teams',
    probes: ['userLeagues', 'leagueSettings'],
    keys: ['num_teams'],
  },
  {
    area: 'League',
    field: 'scoring type',
    probes: ['userLeagues', 'leagueSettings'],
    keys: ['scoring_type'],
  },
  { area: 'League', field: 'scoring categories', probes: ['leagueSettings'], keys: ['stat_categories'] },
  { area: 'League', field: 'roster positions', probes: ['leagueSettings'], keys: ['roster_positions'] },
  { area: 'League', field: 'IL slots', probes: ['leagueSettings'], custom: (h) => hasPosition(h, /^IL\+?$/) },
  {
    area: 'League',
    field: 'acquisition limits/settings',
    probes: ['leagueSettings'],
    keys: ['max_weekly_adds', 'max_adds', 'waiver_type', 'waiver_rule', 'max_teams_acquisitions'],
  },
  {
    area: 'League',
    field: 'playoff weeks/settings',
    probes: ['leagueSettings'],
    keys: ['playoff_start_week', 'num_playoff_teams', 'uses_playoff'],
  },
  {
    area: 'League',
    field: 'draft status / type',
    probes: ['userLeagues', 'leagueSettings'],
    keys: ['draft_status', 'draft_type'],
  },
  { area: 'User/team', field: "user's fantasy team", probes: ['userTeams'], keys: ['team_key'] },
  { area: 'User/team', field: 'team key', probes: ['userTeams', 'leagueTeams'], keys: ['team_key'] },
  {
    area: 'User/team',
    field: 'draft position',
    probes: ['leagueTeams', 'userTeams'],
    keys: ['draft_position'],
  },
  { area: 'User/team', field: 'roster', probes: ['teamRoster'], keys: ['roster'] },
  {
    area: 'Players',
    field: 'Yahoo player ID/key',
    probes: ['playersSortOR', 'teamRoster'],
    keys: ['player_key', 'player_id'],
  },
  { area: 'Players', field: 'player name', probes: ['playersSortOR', 'teamRoster'], keys: ['full'] },
  {
    area: 'Players',
    field: 'NBA team',
    probes: ['playersSortOR', 'teamRoster'],
    keys: ['editorial_team_abbr'],
  },
  {
    area: 'Players',
    field: 'position eligibility',
    probes: ['playersSortOR', 'teamRoster'],
    keys: ['eligible_positions'],
  },
  // Absent for healthy players, so a 200 without it on 25 players is still UNKNOWN (see matrix()).
  {
    area: 'Players',
    field: 'injury/status',
    probes: ['playersSortOR', 'playersSortAR', 'teamRoster'],
    keys: ['status', 'injury_note'],
  },
  {
    area: 'Players',
    field: 'ownership',
    probes: ['playersOwnership', 'playersPercentOwned'],
    keys: ['ownership_type', 'percent_owned'],
  },
  {
    area: 'Market',
    field: 'Rank',
    probes: ['playersSortOR', 'playersSortAR', 'playersDraftAnalysis'],
    keyPattern: /(^|_)rank($|_)/i,
  },
  {
    area: 'Market',
    field: 'XRank',
    probes: ['playersSortOR', 'playersSortAR', 'playersDraftAnalysis'],
    keyPattern: /x_?rank|o_?rank/i,
  },
  {
    area: 'Market',
    field: 'ADP',
    probes: ['playersDraftAnalysis'],
    keys: ['average_pick', 'average_round', 'percent_drafted'],
  },
  {
    area: 'Market',
    field: 'Last 7 Days ADP',
    probes: ['playersDraftAnalysis'],
    keyPattern: /(last_?7|7_?day|recent|week).*(pick|adp)|(pick|adp).*(last_?7|7_?day|recent)/i,
  },
  {
    area: 'Market',
    field: 'Fantasy Plus-specific data',
    probes: ['playersDraftAnalysis', 'playersSortOR'],
    keyPattern: /plus|premium/i,
  },
  {
    area: 'Statistics',
    field: 'current stats (season)',
    probes: ['playersStatsSeason'],
    keys: ['player_stats'],
  },
  {
    area: 'Statistics',
    field: 'projected statistics',
    probes: ['playersStatsProjected'],
    keys: ['player_stats'],
  },
  stat('GP', ['GP']),
  stat('FGM/FGA', ['FGM/A', 'FGM', 'FGA']),
  stat('FTM/FTA', ['FTM/A', 'FTM', 'FTA']),
  stat('FG%', ['FG%']),
  stat('FT%', ['FT%']),
  stat('3PM', ['3PTM', '3PM']),
  stat('PTS', ['PTS']),
  stat('REB', ['REB']),
  stat('AST', ['AST']),
  stat('STL', ['ST', 'STL']),
  stat('BLK', ['BLK']),
  stat('TO', ['TO']),
  {
    area: 'Draft',
    field: 'draft results',
    probes: ['leagueDraftResults'],
    keys: ['draft_results', 'draft_result'],
  },
  { area: 'Draft', field: 'overall pick', probes: ['leagueDraftResults'], keys: ['pick'] },
  { area: 'Draft', field: 'round', probes: ['leagueDraftResults'], keys: ['round'] },
  { area: 'Draft', field: 'drafting team', probes: ['leagueDraftResults'], keys: ['team_key'] },
  { area: 'Draft', field: 'player ID in pick', probes: ['leagueDraftResults'], keys: ['player_key'] },
];

/** Fields whose absence in one response does not prove they are never exposed. */
const ABSENCE_INCONCLUSIVE = new Set([
  'injury/status',
  'player ID in pick',
  'draft results',
  'overall pick',
  'round',
  'drafting team',
]);

export interface MatrixRow {
  area: string;
  field: string;
  status: Availability;
  evidence: string;
}

export function matrix(results: Record<string, ApiResult | undefined>): MatrixRow[] {
  return DETECTORS.map((d) => {
    const ran = d.probes.map((p) => [p, results[p]] as const);
    const ok = ran.filter(([, r]) => r?.ok).map(([, r]) => r!);
    const notes = ran.map(([p, r]) => `${p}: ${r ? `HTTP ${r.status}` : 'not probed'}`).join('; ');
    if (!ok.length) return { area: d.area, field: d.field, status: 'UNKNOWN', evidence: notes };
    let hit: string | null = null;
    if (d.custom) hit = d.custom(ok);
    else
      for (const r of ok)
        walk(r.body, (k, v) => {
          if (hit || v === '' || v === null || v === undefined) return;
          if (d.keys?.includes(k) || d.keyPattern?.test(k))
            hit = `"${k}" in ${d.probes.find((p) => results[p] === r)}`;
        });
    if (hit) return { area: d.area, field: d.field, status: 'SUPPORTED', evidence: hit };
    return {
      area: d.area,
      field: d.field,
      status: ABSENCE_INCONCLUSIVE.has(d.field) ? 'UNKNOWN' : 'NOT EXPOSED',
      evidence: `absent from 2xx responses (${notes})`,
    };
  });
}

export function matrixMarkdown(rows: MatrixRow[]): string {
  const lines = ['| Area | Field | Status | Evidence |', '| --- | --- | --- | --- |'];
  for (const r of rows)
    lines.push(`| ${r.area} | ${r.field} | ${r.status} | ${r.evidence.replace(/\|/g, '/')} |`);
  return lines.join('\n');
}
