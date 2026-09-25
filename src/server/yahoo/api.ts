/**
 * Minimal read-only Yahoo Fantasy Sports API client for the feasibility spike. SERVER-ONLY.
 * Records status, timing and any throttling-related headers so real behavior can be documented.
 */
import type { FetchLike } from './oauth';

export const FANTASY_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

export interface ApiResult {
  path: string;
  status: number;
  ok: boolean;
  ms: number;
  /** Headers that may describe throttling (rate/limit/retry). Other headers are not kept. */
  throttleHeaders: Record<string, string>;
  body: unknown;
}

export async function fantasyGet(
  path: string,
  accessToken: string,
  fetchImpl: FetchLike,
  clock: () => number = Date.now,
): Promise<ApiResult> {
  const url = `${FANTASY_API_BASE}${path}${path.includes('?') ? '&' : '?'}format=json`;
  const t0 = clock();
  const res = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text (Yahoo errors are sometimes XML/HTML) */
  }
  const throttleHeaders: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (/rate|limit|retry/i.test(k)) throttleHeaders[k] = v;
  });
  return { path, status: res.status, ok: res.ok, ms: clock() - t0, throttleHeaders, body };
}

/** Yahoo signals throttling with 429 and, historically, 999. Both are treated as "back off". */
export const isThrottled = (status: number) => status === 429 || status === 999;

/** Depth-first walk over Yahoo's nested JSON (objects inside arrays inside objects). */
export function walk(
  node: unknown,
  visit: (key: string, value: unknown, parent: Record<string, unknown>) => void,
) {
  if (Array.isArray(node)) {
    for (const x of node) walk(x, visit);
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      visit(k, v, o);
      walk(v, visit);
    }
  }
}

/** First non-empty value found for each key name (deep). */
export function findFirst(node: unknown, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  walk(node, (k, v) => {
    if (keys.includes(k) && !(k in out) && v !== '' && v !== null && v !== undefined) out[k] = v;
  });
  return out;
}

export interface DraftPick {
  pick: number;
  round: number | null;
  teamKey: string | null;
  playerKey: string | null;
}

/**
 * Collect draft picks from a draftresults response: every object carrying `pick` plus `player_key`
 * or `team_key`. A pick without `player_key` is an empty slot (not yet made).
 */
export function extractDraftPicks(body: unknown): DraftPick[] {
  const picks = new Map<number, DraftPick>();
  walk(body, (k, _v, parent) => {
    if (k !== 'pick') return;
    const pick = Number(parent.pick);
    if (!Number.isFinite(pick) || picks.has(pick)) return;
    if (!('player_key' in parent) && !('team_key' in parent)) return;
    picks.set(pick, {
      pick,
      round: parent.round !== undefined ? Number(parent.round) : null,
      teamKey: typeof parent.team_key === 'string' ? parent.team_key : null,
      playerKey: typeof parent.player_key === 'string' && parent.player_key ? parent.player_key : null,
    });
  });
  return [...picks.values()].sort((a, b) => a.pick - b.pick);
}

export function extractDraftStatus(body: unknown): string | null {
  const v = findFirst(body, ['draft_status']).draft_status;
  return typeof v === 'string' ? v : null;
}
