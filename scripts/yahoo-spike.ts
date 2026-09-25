/**
 * Yahoo Fantasy API feasibility spike (docs/YAHOO_API.md). Local, read-only, run by the league owner.
 *
 *   npx tsx scripts/yahoo-spike.ts auth                      # one-time consent; stores an ENCRYPTED token file
 *   npx tsx scripts/yahoo-spike.ts probe [--league KEY]      # hits each resource once, writes the availability matrix
 *   npx tsx scripts/yahoo-spike.ts draft-poll --league KEY [--interval 15] [--max-minutes 180]
 *
 * Credentials come from environment variables (.env.local is loaded if present); see .env.example.
 * Everything written (token, raw responses, matrix) goes under git-ignored data/private/ and reports/private/.
 * Nothing is printed that contains a secret or a token.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  extractDraftPicks,
  extractDraftStatus,
  fantasyGet,
  findFirst,
  isThrottled,
  walk,
  type ApiResult,
} from '../src/server/yahoo/api';
import {
  buildAuthorizeUrl,
  createOAuthState,
  ensureFreshTokens,
  exchangeCode,
  loadYahooConfig,
  openTokens,
  sealTokens,
  verifyOAuthState,
  type TokenSet,
  type YahooOAuthConfig,
} from '../src/server/yahoo/oauth';
import { matrix, matrixMarkdown, probePlan } from '../src/server/yahoo/probe';

const DIR = 'data/private/yahoo';
const TOKEN_FILE = path.join(DIR, 'token.sealed');
const STATE_FILE = path.join(DIR, 'pending-state');
const MIN_INTERVAL_S = 10;
const MAX_BACKOFF_S = 300;

const arg = (n: string) => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function config(): YahooOAuthConfig {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  return loadYahooConfig(process.env);
}

function saveTokens(cfg: YahooOAuthConfig, t: TokenSet) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(TOKEN_FILE, sealTokens(cfg, t), { mode: 0o600 });
}

async function freshTokens(cfg: YahooOAuthConfig): Promise<TokenSet> {
  const current = existsSync(TOKEN_FILE) ? openTokens(cfg, readFileSync(TOKEN_FILE, 'utf8')) : null;
  if (!current) throw new Error('No valid stored token. Run: npx tsx scripts/yahoo-spike.ts auth');
  const { tokens, refreshed } = await ensureFreshTokens(cfg, current, fetch, Date.now());
  if (refreshed) {
    saveTokens(cfg, tokens); // persist a rotated refresh token before using the access token
    console.log(
      `Access token refreshed; refresh token ${tokens.refreshToken === current.refreshToken ? 'unchanged' : 'ROTATED'}.`,
    );
  }
  return tokens;
}

async function auth() {
  const cfg = config();
  const { state, cookieValue } = createOAuthState(cfg, Date.now());
  mkdirSync(DIR, { recursive: true });
  writeFileSync(STATE_FILE, cookieValue, { mode: 0o600 }); // plays the role of the HttpOnly state cookie
  console.log('Open this URL in your browser, sign in to Yahoo and approve access:\n');
  console.log(buildAuthorizeUrl(cfg, state));
  console.log(
    cfg.redirectUri === 'oob'
      ? '\nThen paste the code Yahoo shows you.'
      : '\nYahoo then redirects to your redirect URI (the page may not load — that is fine).\nPaste the FULL address from the browser bar.',
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('> ')).trim();
  rl.close();
  let code: string | null;
  if (/^https?:\/\//.test(answer)) {
    const u = new URL(answer);
    if (u.searchParams.get('error')) throw new Error(`Yahoo returned error: ${u.searchParams.get('error')}`);
    if (!verifyOAuthState(cfg, u.searchParams.get('state'), readFileSync(STATE_FILE, 'utf8'), Date.now()))
      throw new Error('OAuth state check failed (CSRF protection). Start again.');
    code = u.searchParams.get('code');
  } else {
    if (cfg.redirectUri !== 'oob')
      throw new Error('Paste the full redirected URL so the state can be verified.');
    code = answer;
  }
  if (!code) throw new Error('No authorization code found.');
  writeFileSync(STATE_FILE, ''); // single use
  const tokens = await exchangeCode(cfg, code, fetch, Date.now());
  saveTokens(cfg, tokens);
  console.log(
    `Authorized. Encrypted token stored in ${TOKEN_FILE}. Access token lifetime: ${Math.round((tokens.expiresAt - Date.now()) / 60000)} min.`,
  );
}

function leagueKeys(r: ApiResult | undefined): { key: string; season: string; name: string }[] {
  const out: { key: string; season: string; name: string }[] = [];
  walk(r?.body, (_k, _v, p) => {
    if (typeof p.league_key === 'string' && !out.some((x) => x.key === p.league_key))
      out.push({ key: p.league_key, season: String(p.season ?? ''), name: String(p.name ?? '') });
  });
  return out;
}

async function probe() {
  const cfg = config();
  const outDir = path.join(DIR, 'responses', stamp());
  mkdirSync(outDir, { recursive: true });
  const results: Record<string, ApiResult> = {};
  const run = async (name: string, p: string) => {
    const t = await freshTokens(cfg);
    const r = await fantasyGet(p, t.accessToken, fetch);
    results[name] = r;
    writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(r, null, 1));
    console.log(
      `${r.status}  ${r.ms}ms  ${name}  ${p}${Object.keys(r.throttleHeaders).length ? `  ${JSON.stringify(r.throttleHeaders)}` : ''}`,
    );
    await sleep(1500); // deliberately gentle: one request every ~1.5 s
  };
  const base = probePlan({ leagueKey: null, teamKey: null });
  for (const p of base.slice(0, 4)) await run(p.name, p.path!);
  const leagues = leagueKeys(results.userLeagues);
  console.log(
    `\nNBA leagues visible: ${leagues.map((l) => `${l.key} (${l.season} ${l.name})`).join(', ') || 'none'}`,
  );
  const leagueKey =
    arg('league') ?? [...leagues].sort((a, b) => b.season.localeCompare(a.season))[0]?.key ?? null;
  let teamKey: string | null = null;
  walk(results.userTeams?.body, (_k, _v, p) => {
    if (!teamKey && leagueKey && typeof p.team_key === 'string' && p.team_key.startsWith(`${leagueKey}.t.`))
      teamKey = p.team_key;
  });
  console.log(`Using league ${leagueKey ?? '(none)'} team ${teamKey ?? '(none)'}\n`);
  for (const p of probePlan({ leagueKey, teamKey }).slice(4)) if (p.path) await run(p.name, p.path);

  const rows = matrix(results);
  const md = [
    `# Yahoo API field availability — probe ${stamp()}`,
    '',
    `League ${leagueKey ?? 'n/a'}; draft_status: ${extractDraftStatus(results.leagueSettings?.body) ?? extractDraftStatus(results.userLeagues?.body) ?? 'n/a'}`,
    `Draft picks visible: ${extractDraftPicks(results.leagueDraftResults?.body).filter((p) => p.playerKey).length}`,
    '',
    matrixMarkdown(rows),
    '',
  ].join('\n');
  mkdirSync('reports/private/yahoo-api', { recursive: true });
  const mdPath = `reports/private/yahoo-api/matrix-${stamp()}.md`;
  writeFileSync(mdPath, md);
  console.log(`\n${md}\nRaw responses: ${outDir}\nMatrix: ${mdPath}`);
}

async function draftPoll() {
  const cfg = config();
  const league = arg('league');
  if (!league) throw new Error('--league KEY is required');
  const interval = Math.max(MIN_INTERVAL_S, Number(arg('interval') ?? 15));
  const deadline = Date.now() + Number(arg('max-minutes') ?? 180) * 60_000;
  const log = path.join(DIR, `draft-poll-${stamp()}.jsonl`);
  mkdirSync(DIR, { recursive: true });
  const seen = new Map<number, string>();
  let backoff = interval;
  console.log(`Polling ${league} every ${interval}s (min ${MIN_INTERVAL_S}s). Log: ${log}. Ctrl+C to stop.`);
  while (Date.now() < deadline) {
    const t = await freshTokens(cfg);
    const r = await fantasyGet(`/league/${league}/draftresults`, t.accessToken, fetch);
    const now = new Date().toISOString();
    const status =
      extractDraftStatus(r.body) ?? String(findFirst(r.body, ['draft_status']).draft_status ?? 'unknown');
    const picks = r.ok ? extractDraftPicks(r.body) : [];
    const made = picks.filter((p) => p.playerKey);
    const fresh = made.filter((p) => !seen.has(p.pick));
    for (const p of fresh) seen.set(p.pick, now);
    appendFileSync(
      log,
      `${JSON.stringify({ at: now, http: r.status, ms: r.ms, throttle: r.throttleHeaders, draftStatus: status, slots: picks.length, made: made.length, newPicks: fresh })}\n`,
    );
    console.log(
      `${now}  HTTP ${r.status}  ${r.ms}ms  status=${status}  picks=${made.length}/${picks.length}${fresh.length ? `  NEW: ${fresh.map((p) => `#${p.pick} ${p.playerKey} → ${p.teamKey}`).join(', ')}` : ''}`,
    );
    if (status === 'postdraft') {
      console.log('Draft complete (postdraft). Stopping.');
      break;
    }
    if (isThrottled(r.status) || r.status >= 500) {
      backoff = Math.min(MAX_BACKOFF_S, backoff * 2);
      console.log(`Backing off to ${backoff}s.`);
    } else backoff = interval;
    await sleep(backoff * 1000);
  }
}

const cmd = process.argv[2];
const main = cmd === 'auth' ? auth : cmd === 'probe' ? probe : cmd === 'draft-poll' ? draftPoll : null;
if (!main) {
  console.error(
    'Usage: yahoo-spike.ts auth | probe [--league KEY] | draft-poll --league KEY [--interval 15] [--max-minutes 180]',
  );
  process.exit(2);
}
main().catch((e: unknown) => {
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : 'Failed.');
  process.exit(1);
});
