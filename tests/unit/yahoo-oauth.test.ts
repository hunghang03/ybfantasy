import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { extractDraftPicks, extractDraftStatus, type ApiResult } from '@/server/yahoo/api';
import {
  buildAuthorizeUrl,
  createOAuthState,
  ensureFreshTokens,
  exchangeCode,
  loadYahooConfig,
  openTokens,
  refreshTokenSet,
  sealTokens,
  STATE_TTL_MS,
  verifyOAuthState,
  YahooOAuthError,
  type TokenSet,
} from '@/server/yahoo/oauth';
import { matrix } from '@/server/yahoo/probe';

// Fictional test credentials. Not real Yahoo values.
const ENV = {
  YAHOO_CLIENT_ID: 'test-client-id',
  YAHOO_CLIENT_SECRET: 'test-client-secret-DO-NOT-LEAK',
  YAHOO_REDIRECT_URI: 'https://example.test/api/yahoo/callback',
  YAHOO_STATE_SECRET: 'ab'.repeat(32),
  YAHOO_TOKEN_ENCRYPTION_KEY: 'cd'.repeat(32),
};
const cfg = loadYahooConfig(ENV);
const T0 = 1_760_000_000_000;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
const tokens = (over: Partial<TokenSet> = {}): TokenSet => ({
  accessToken: 'acc-1',
  refreshToken: 'ref-1',
  expiresAt: T0 + 3600_000,
  tokenType: 'bearer',
  yahooGuid: null,
  ...over,
});

describe('Yahoo OAuth configuration', () => {
  it('names missing variables without echoing any value', () => {
    const e = (() => {
      try {
        loadYahooConfig({ ...ENV, YAHOO_CLIENT_ID: '', YAHOO_STATE_SECRET: undefined });
      } catch (x) {
        return x as Error;
      }
    })();
    expect(e?.message).toBe('Missing environment variables: YAHOO_CLIENT_ID, YAHOO_STATE_SECRET.');
    expect(e?.message).not.toContain(ENV.YAHOO_CLIENT_SECRET);
  });
  it('refuses a secret exposed through a NEXT_PUBLIC_ variable', () => {
    expect(() => loadYahooConfig({ ...ENV, NEXT_PUBLIC_YAHOO_CLIENT_SECRET: 'x' })).toThrow(/NEXT_PUBLIC_/);
  });
  it('requires an https redirect URI and full-length keys', () => {
    expect(() => loadYahooConfig({ ...ENV, YAHOO_REDIRECT_URI: 'http://example.test/cb' })).toThrow(/https/);
    expect(() => loadYahooConfig({ ...ENV, YAHOO_TOKEN_ENCRYPTION_KEY: 'cd'.repeat(16) })).toThrow(
      /32 bytes/,
    );
    expect(() => loadYahooConfig({ ...ENV, YAHOO_STATE_SECRET: 'ab' })).toThrow(/32 bytes/);
  });
  it('the authorize URL carries the client id and state, never the secret', () => {
    const url = new URL(buildAuthorizeUrl(cfg, 'st'));
    expect(url.origin + url.pathname).toBe('https://api.login.yahoo.com/oauth2/request_auth');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.toString()).not.toContain('secret');
  });
});

describe('CSRF state', () => {
  it('accepts the matching state + cookie within the TTL', () => {
    const { state, cookieValue } = createOAuthState(cfg, T0);
    expect(verifyOAuthState(cfg, state, cookieValue, T0 + 1000)).toBe(true);
  });
  it('rejects a missing cookie, another session, a tampered MAC, and an expired state', () => {
    const a = createOAuthState(cfg, T0);
    const b = createOAuthState(cfg, T0);
    expect(verifyOAuthState(cfg, a.state, null, T0)).toBe(false);
    expect(verifyOAuthState(cfg, a.state, b.cookieValue, T0)).toBe(false);
    expect(verifyOAuthState(cfg, `${a.state.slice(0, -2)}xx`, a.cookieValue, T0)).toBe(false);
    expect(verifyOAuthState(cfg, a.state, a.cookieValue, T0 + STATE_TTL_MS + 1)).toBe(false);
    expect(verifyOAuthState(cfg, 'garbage', a.cookieValue, T0)).toBe(false);
  });
  it('rejects a state signed with a different key', () => {
    const other = loadYahooConfig({ ...ENV, YAHOO_STATE_SECRET: 'ef'.repeat(32) });
    const { state, cookieValue } = createOAuthState(other, T0);
    expect(verifyOAuthState(cfg, state, cookieValue, T0)).toBe(false);
  });
});

describe('token exchange and refresh-token rotation', () => {
  it('exchanges the code with HTTP Basic client auth on the server', async () => {
    const f = vi.fn(async (_url: string, _init: RequestInit) =>
      jsonResponse(200, {
        access_token: 'A',
        refresh_token: 'R',
        expires_in: 3600,
        token_type: 'bearer',
        xoauth_yahoo_guid: 'G',
      }),
    );
    const t = await exchangeCode(cfg, 'the-code', f, T0);
    expect(t).toEqual({
      accessToken: 'A',
      refreshToken: 'R',
      expiresAt: T0 + 3600_000,
      tokenType: 'bearer',
      yahooGuid: 'G',
    });
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe('https://api.login.yahoo.com/oauth2/get_token');
    const auth = (init.headers as Record<string, string>).Authorization!;
    expect(Buffer.from(auth.replace('Basic ', ''), 'base64').toString()).toBe(
      'test-client-id:test-client-secret-DO-NOT-LEAK',
    );
    const body = new URLSearchParams(String(init.body));
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('redirect_uri')).toBe(ENV.YAHOO_REDIRECT_URI);
    expect(body.has('client_secret')).toBe(false);
  });
  it('stores the rotated refresh token when Yahoo returns a new one', async () => {
    const f = vi.fn(async () =>
      jsonResponse(200, { access_token: 'acc-2', refresh_token: 'ref-2', expires_in: 3600 }),
    );
    const t = await refreshTokenSet(cfg, tokens(), f, T0);
    expect(t.refreshToken).toBe('ref-2');
    expect(t.accessToken).toBe('acc-2');
  });
  it('keeps the previous refresh token when the refresh response omits one', async () => {
    const f = vi.fn(async () => jsonResponse(200, { access_token: 'acc-2', expires_in: 3600 }));
    expect((await refreshTokenSet(cfg, tokens(), f, T0)).refreshToken).toBe('ref-1');
  });
  it('surfaces Yahoo error codes without leaking tokens or the secret', async () => {
    const f = vi.fn(async () => jsonResponse(400, { error: 'invalid_grant', error_description: 'x' }));
    const err = (await refreshTokenSet(cfg, tokens(), f, T0).catch((e: unknown) => e)) as YahooOAuthError;
    expect(err).toBeInstanceOf(YahooOAuthError);
    expect(err.code).toBe('invalid_grant');
    expect(err.httpStatus).toBe(400);
    expect(err.message).not.toMatch(/ref-1|acc-1|DO-NOT-LEAK/);
  });
  it('refreshes only near expiry, and concurrent callers share one refresh', async () => {
    const f = vi.fn(async () =>
      jsonResponse(200, { access_token: 'acc-2', refresh_token: 'ref-2', expires_in: 3600 }),
    );
    expect((await ensureFreshTokens(cfg, tokens(), f, T0)).refreshed).toBe(false);
    const stale = tokens({ expiresAt: T0 + 60_000 });
    const [a, b] = await Promise.all([
      ensureFreshTokens(cfg, stale, f, T0),
      ensureFreshTokens(cfg, stale, f, T0),
    ]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(a.tokens.refreshToken).toBe('ref-2');
    expect(b.refreshed).toBe(true);
  });
});

describe('sealed token storage', () => {
  it('round-trips and never contains the plaintext tokens', () => {
    const sealed = sealTokens(cfg, tokens());
    expect(sealed).not.toContain('ref-1');
    expect(openTokens(cfg, sealed)).toEqual(tokens());
  });
  it('rejects tampering, another key and junk', () => {
    const sealed = sealTokens(cfg, tokens());
    const flipped = `${sealed.slice(0, -3)}${sealed.at(-3) === 'A' ? 'B' : 'A'}${sealed.slice(-2)}`;
    expect(openTokens(cfg, flipped)).toBeNull();
    const other = loadYahooConfig({ ...ENV, YAHOO_TOKEN_ENCRYPTION_KEY: 'ef'.repeat(32) });
    expect(openTokens(other, sealed)).toBeNull();
    expect(openTokens(cfg, 'v1.abc')).toBeNull();
    expect(openTokens(cfg, null)).toBeNull();
  });
});

describe('server-only boundary', () => {
  it('no browser-side module imports src/server', () => {
    const offenders: string[] = [];
    const scan = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = path.join(dir, f);
        if (statSync(p).isDirectory()) scan(p);
        else if (
          /\.(ts|tsx)$/.test(f) &&
          /from ['"](@\/server|(\.\.\/)+server)\//.test(readFileSync(p, 'utf8'))
        )
          offenders.push(p);
      }
    };
    for (const d of ['src/app', 'src/components', 'src/state', 'src/lib', 'src/domain', 'src/persistence'])
      scan(d);
    expect(offenders).toEqual([]);
  });
});

// Response shapes below are SYNTHETIC (hand-written in the nested style of Yahoo's legacy docs) and
// only exercise the parsers. They are not evidence of what Yahoo returns today.
const draftBody = (made: number) => ({
  fantasy_content: {
    league: [
      { league_key: 'nba.l.1', draft_status: made < 3 ? 'drafting' : 'postdraft' },
      {
        draft_results: {
          0: {
            draft_result: {
              pick: 1,
              round: 1,
              team_key: 'nba.l.1.t.1',
              player_key: made >= 1 ? 'nba.p.101' : '',
            },
          },
          1: {
            draft_result: {
              pick: 2,
              round: 1,
              team_key: 'nba.l.1.t.2',
              player_key: made >= 2 ? 'nba.p.102' : '',
            },
          },
          2: {
            draft_result: {
              pick: 3,
              round: 2,
              team_key: 'nba.l.1.t.2',
              player_key: made >= 3 ? 'nba.p.103' : '',
            },
          },
          count: 3,
        },
      },
    ],
  },
});
const ok = (path: string, body: unknown): ApiResult => ({
  path,
  status: 200,
  ok: true,
  ms: 1,
  throttleHeaders: {},
  body,
});

describe('spike parsers (synthetic shapes)', () => {
  it('extracts picks, treating an empty player_key as a pick not yet made', () => {
    const picks = extractDraftPicks(draftBody(1));
    expect(picks.map((p) => [p.pick, p.round, p.teamKey, p.playerKey])).toEqual([
      [1, 1, 'nba.l.1.t.1', 'nba.p.101'],
      [2, 1, 'nba.l.1.t.2', null],
      [3, 2, 'nba.l.1.t.2', null],
    ]);
    expect(extractDraftStatus(draftBody(1))).toBe('drafting');
    expect(extractDraftStatus(draftBody(3))).toBe('postdraft');
  });
  it('matrix: SUPPORTED needs a value, 2xx-without-field is NOT EXPOSED, failures are UNKNOWN', () => {
    const rows = matrix({
      leagueDraftResults: ok('/league/nba.l.1/draftresults', draftBody(3)),
      playersDraftAnalysis: ok('/league/nba.l.1/players;count=25/draft_analysis', {
        players: [
          { player_key: 'nba.p.101', draft_analysis: [{ average_pick: '3.4' }, { percent_drafted: '1.00' }] },
        ],
      }),
      leagueSettings: {
        path: '/league/nba.l.1/settings',
        status: 401,
        ok: false,
        ms: 1,
        throttleHeaders: {},
        body: '',
      },
    });
    const get = (f: string) => rows.find((r) => r.field === f)!;
    expect(get('player ID in pick').status).toBe('SUPPORTED');
    expect(get('ADP').status).toBe('SUPPORTED');
    expect(get('Last 7 Days ADP').status).toBe('NOT EXPOSED');
    expect(get('roster positions').status).toBe('UNKNOWN');
    expect(get('roster positions').evidence).toContain('HTTP 401');
    expect(get('projected statistics').status).toBe('UNKNOWN');
  });
});
