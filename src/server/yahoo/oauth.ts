/**
 * Yahoo OAuth 2.0 (authorization-code grant), server-side only. docs/YAHOO_API.md §2–3.
 *
 * SERVER-ONLY. Never import this module from src/app, src/components or src/state: it reads the
 * client secret and handles refresh tokens, which must never reach browser JavaScript.
 * (tests/unit/yahoo-oauth.test.ts enforces the import boundary.)
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const YAHOO_AUTHORIZE_URL = 'https://api.login.yahoo.com/oauth2/request_auth';
export const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';

/** OAuth `state` lifetime. The user has this long to complete the Yahoo consent screen. */
export const STATE_TTL_MS = 10 * 60 * 1000;
/** Refresh this long before the access token's stated expiry. */
export const REFRESH_SKEW_MS = 2 * 60 * 1000;

export interface YahooOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** HMAC key for `state` (≥ 32 bytes). */
  stateKey: Buffer;
  /** AES-256-GCM key for sealed token storage (exactly 32 bytes). */
  tokenKey: Buffer;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms at which the access token expires (from `expires_in`). */
  expiresAt: number;
  tokenType: string;
  /** Yahoo user GUID if the token response includes it. */
  yahooGuid: string | null;
}

export class YahooOAuthError extends Error {
  constructor(
    message: string,
    /** Yahoo's `error` code (e.g. invalid_grant) when present. Never a token or secret. */
    readonly code: string | null = null,
    readonly httpStatus: number | null = null,
  ) {
    super(message);
    this.name = 'YahooOAuthError';
  }
}

type Env = Record<string, string | undefined>;
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

const ENV_VARS = [
  'YAHOO_CLIENT_ID',
  'YAHOO_CLIENT_SECRET',
  'YAHOO_REDIRECT_URI',
  'YAHOO_STATE_SECRET',
  'YAHOO_TOKEN_ENCRYPTION_KEY',
] as const;

function decodeKey(value: string, name: string): Buffer {
  const b =
    /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0
      ? Buffer.from(value, 'hex')
      : Buffer.from(value, 'base64');
  if (b.length < 32) throw new YahooOAuthError(`${name} must decode to at least 32 bytes (hex or base64).`);
  return b;
}

/** Read the OAuth configuration from server environment variables. Error messages name variables, never values. */
export function loadYahooConfig(env: Env = process.env): YahooOAuthConfig {
  const missing = ENV_VARS.filter((k) => !env[k]?.trim());
  if (missing.length) throw new YahooOAuthError(`Missing environment variables: ${missing.join(', ')}.`);
  for (const k of Object.keys(env))
    if (k.startsWith('NEXT_PUBLIC_') && /YAHOO/i.test(k) && /SECRET|TOKEN|KEY/i.test(k))
      throw new YahooOAuthError(
        `${k} would expose a Yahoo secret to the browser. Remove the NEXT_PUBLIC_ prefix.`,
      );
  const redirectUri = env.YAHOO_REDIRECT_URI!.trim();
  if (redirectUri !== 'oob' && !/^https:\/\//.test(redirectUri))
    throw new YahooOAuthError('YAHOO_REDIRECT_URI must be an https:// URL (or "oob").');
  const tokenKey = decodeKey(env.YAHOO_TOKEN_ENCRYPTION_KEY!.trim(), 'YAHOO_TOKEN_ENCRYPTION_KEY');
  if (tokenKey.length !== 32)
    throw new YahooOAuthError('YAHOO_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return {
    clientId: env.YAHOO_CLIENT_ID!.trim(),
    clientSecret: env.YAHOO_CLIENT_SECRET!.trim(),
    redirectUri,
    stateKey: decodeKey(env.YAHOO_STATE_SECRET!.trim(), 'YAHOO_STATE_SECRET'),
    tokenKey,
  };
}

const b64u = (b: Buffer) => b.toString('base64url');
const hmac = (key: Buffer, data: string) => createHmac('sha256', key).update(data).digest();

/**
 * CSRF-safe `state`: `nonce.issuedAt.mac`. The nonce is also stored in an HttpOnly, SameSite=Lax cookie
 * (`cookieValue`). The callback must present both, the MAC must verify, and the state must be fresh.
 */
export function createOAuthState(cfg: YahooOAuthConfig, now: number): { state: string; cookieValue: string } {
  const nonce = b64u(randomBytes(32));
  const payload = `${nonce}.${now.toString(36)}`;
  return { state: `${payload}.${b64u(hmac(cfg.stateKey, payload))}`, cookieValue: nonce };
}

export function verifyOAuthState(
  cfg: YahooOAuthConfig,
  state: string | null | undefined,
  cookieValue: string | null | undefined,
  now: number,
): boolean {
  if (!state || !cookieValue) return false;
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [nonce, issued, mac] = parts as [string, string, string];
  const expected = hmac(cfg.stateKey, `${nonce}.${issued}`);
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  const a = Buffer.from(nonce);
  const b = Buffer.from(cookieValue);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const issuedAt = parseInt(issued, 36);
  return Number.isFinite(issuedAt) && now >= issuedAt && now - issuedAt <= STATE_TTL_MS;
}

/** The URL the browser is sent to. Contains the public client id only — never the secret. */
export function buildAuthorizeUrl(cfg: YahooOAuthConfig, state: string): string {
  const u = new URL(YAHOO_AUTHORIZE_URL);
  u.searchParams.set('client_id', cfg.clientId);
  u.searchParams.set('redirect_uri', cfg.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('state', state);
  return u.toString();
}

async function tokenRequest(
  cfg: YahooOAuthConfig,
  params: Record<string, string>,
  fetchImpl: FetchLike,
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(YAHOO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ redirect_uri: cfg.redirectUri, ...params }).toString(),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    const code = typeof json.error === 'string' ? json.error : null;
    throw new YahooOAuthError(`Yahoo token endpoint returned HTTP ${res.status}.`, code, res.status);
  }
  return json;
}

function toTokenSet(json: Record<string, unknown>, now: number, previousRefresh: string | null): TokenSet {
  const access = json.access_token;
  if (typeof access !== 'string' || !access) throw new YahooOAuthError('Token response has no access_token.');
  // Rotation: always keep the refresh token Yahoo returned most recently; fall back to the previous one
  // only if this response carries none.
  const refresh =
    typeof json.refresh_token === 'string' && json.refresh_token ? json.refresh_token : previousRefresh;
  if (!refresh) throw new YahooOAuthError('Token response has no refresh_token.');
  const expiresIn = Number(json.expires_in);
  return {
    accessToken: access,
    refreshToken: refresh,
    expiresAt: now + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000,
    tokenType: typeof json.token_type === 'string' ? json.token_type : 'bearer',
    yahooGuid: typeof json.xoauth_yahoo_guid === 'string' ? json.xoauth_yahoo_guid : null,
  };
}

export async function exchangeCode(
  cfg: YahooOAuthConfig,
  code: string,
  fetchImpl: FetchLike,
  now: number,
): Promise<TokenSet> {
  const json = await tokenRequest(cfg, { grant_type: 'authorization_code', code }, fetchImpl);
  return toTokenSet(json, now, null);
}

export async function refreshTokenSet(
  cfg: YahooOAuthConfig,
  current: TokenSet,
  fetchImpl: FetchLike,
  now: number,
): Promise<TokenSet> {
  const json = await tokenRequest(
    cfg,
    { grant_type: 'refresh_token', refresh_token: current.refreshToken },
    fetchImpl,
  );
  return toTokenSet(json, now, current.refreshToken);
}

export const needsRefresh = (t: TokenSet, now: number) => now >= t.expiresAt - REFRESH_SKEW_MS;

/** One refresh per refresh token at a time (per server instance), so parallel requests don't race a rotation. */
const inFlight = new Map<string, Promise<TokenSet>>();

/**
 * Return a usable token set, refreshing if needed. When `refreshed` is true the caller MUST persist the
 * returned set (it may carry a rotated refresh token) before responding.
 */
export async function ensureFreshTokens(
  cfg: YahooOAuthConfig,
  current: TokenSet,
  fetchImpl: FetchLike,
  now: number,
): Promise<{ tokens: TokenSet; refreshed: boolean }> {
  if (!needsRefresh(current, now)) return { tokens: current, refreshed: false };
  let p = inFlight.get(current.refreshToken);
  if (!p) {
    p = refreshTokenSet(cfg, current, fetchImpl, now).finally(() => inFlight.delete(current.refreshToken));
    inFlight.set(current.refreshToken, p);
  }
  return { tokens: await p, refreshed: true };
}

/** Seal a token set for storage (encrypted HttpOnly cookie, or a local git-ignored file). AES-256-GCM. */
export function sealTokens(cfg: YahooOAuthConfig, t: TokenSet): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', cfg.tokenKey, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(t), 'utf8'), c.final()]);
  return `v1.${b64u(Buffer.concat([iv, c.getAuthTag(), ct]))}`;
}

/** Returns null for anything tampered, truncated, sealed with another key, or malformed. */
export function openTokens(cfg: YahooOAuthConfig, sealed: string | null | undefined): TokenSet | null {
  if (!sealed?.startsWith('v1.')) return null;
  try {
    const raw = Buffer.from(sealed.slice(3), 'base64url');
    if (raw.length < 29) return null;
    const d = createDecipheriv('aes-256-gcm', cfg.tokenKey, raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    const t = JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')) as TokenSet;
    return typeof t.accessToken === 'string' && typeof t.refreshToken === 'string' ? t : null;
  } catch {
    return null;
  }
}
