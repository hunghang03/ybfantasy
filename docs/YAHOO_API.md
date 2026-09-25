# Yahoo Fantasy API / OAuth — feasibility spike

**Status (2026-09-25): spike code and design are ready; no authenticated Yahoo response has been observed yet.** Two blockers stopped the live half of the spike. This document separates what is **verified**, what is **documented by Yahoo**, and what is only **reported unofficially**. Nothing is marked SUPPORTED without an actual authenticated response.

Evidence levels used below:

| Tag            | Meaning                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **OBSERVED**   | Seen in an authenticated API response. **None yet.**                                                                                                                           |
| **YAHOO-DOC**  | Stated by current Yahoo documentation. Seen only as search-engine excerpts, because this build environment's egress proxy blocks `sports.yahoo.com` and `developer.yahoo.com`. |
| **LEGACY**     | From the long-standing Yahoo Developer Network Fantasy Sports guide as I know it. I could not re-read it this session, so treat as a hypothesis to verify.                     |
| **UNOFFICIAL** | Third-party wrappers or projects. Not proof that a field exists today (per Codex).                                                                                             |

## 1. Blockers found

1. **Network.** From this environment, `api.login.yahoo.com`, `fantasysports.yahooapis.com`, `sports.yahoo.com` and `developer.yahoo.com` are all unreachable (egress proxy denies them). The probe tooling (§4) therefore has to be run where Yahoo is reachable: on your own machine, or here after those hosts are added to the environment's allowed domains.
2. **API access now requires an application.** YAHOO-DOC: the Yahoo Sports Developer Portal ([sports.yahoo.com/developer](https://sports.yahoo.com/developer/)) has an _Apply for Yahoo Fantasy Sports API_ flow ([/developer/access](https://sports.yahoo.com/developer/access/)): you describe your organization, product and use case, Yahoo reviews it, and follows up if approved. Separately, an OAuth app is created on the Yahoo Developer Network with **Fantasy Sports: Read** permission.
3. **No credentials** were supplied (expected — they must come from you, via environment variables).

Also YAHOO-DOC: the Fantasy Sports API is **read-only** ("write access is not available at this time"), and Yahoo "may temporarily throttle or limit access" when usage is excessive over short periods. **No numeric rate limit is published.**

## 2. OAuth architecture (server-side authorization-code flow)

Endpoints (YAHOO-DOC): authorize `https://api.login.yahoo.com/oauth2/request_auth`, token `https://api.login.yahoo.com/oauth2/get_token`. Token responses include `access_token`, `refresh_token`, `expires_in`; Yahoo's guidance is to **store the latest refresh token because it may change** (rotation).

```
browser                    our server (Vercel Function)                 Yahoo
  │ GET /api/yahoo/login ─────►│ state = nonce.issuedAt.HMAC            │
  │ ◄── 302 + Set-Cookie ──────│ yahoo_oauth_state=nonce (HttpOnly,     │
  │     (authorize URL)        │   Secure, SameSite=Lax, 10 min)        │
  │ ───────────────── consent screen ──────────────────────────────────►│
  │ ◄──────────────── 302 redirect_uri?code&state ─────────────────────│
  │ GET /api/yahoo/callback ──►│ verify HMAC + cookie nonce + age       │
  │                            │ POST get_token (Basic client auth) ───►│
  │                            │ ◄── access + refresh token ────────────│
  │ ◄── 302 /data + Set-Cookie │ yahoo_session = AES-GCM(tokens)        │
  │     (HttpOnly, Secure, SameSite=Lax, Path=/api/yahoo)               │
  │ GET /api/yahoo/draft?… ───►│ open cookie → refresh if ≤2 min left   │
  │                            │ (persist rotated token FIRST) ─────────►│
  │ ◄── normalized JSON only ──│ ◄── Fantasy API response ──────────────│
```

Implemented for the spike in `src/server/yahoo/oauth.ts` (framework-agnostic, unit-tested):

- **Secrets stay server-side.** `loadYahooConfig` reads `YAHOO_CLIENT_ID`, `YAHOO_CLIENT_SECRET`, `YAHOO_REDIRECT_URI`, `YAHOO_STATE_SECRET`, `YAHOO_TOKEN_ENCRYPTION_KEY`. It refuses any `NEXT_PUBLIC_…YAHOO…SECRET/TOKEN/KEY` variable and error messages name variables, never values. The authorize URL carries only the public client id. The secret is sent only as HTTP Basic auth to the token endpoint. A test fails the build if any browser-side module (`src/app`, `components`, `state`, `lib`, `domain`, `persistence`) imports `src/server`.
- **CSRF-safe state.** 32-byte random nonce + issue time, HMAC-SHA256-signed; the nonce is also in an HttpOnly cookie. The callback requires a valid MAC, the matching cookie (constant-time compare) and an age ≤ 10 minutes. Single use.
- **Refresh-token rotation.** Every refresh stores whatever `refresh_token` Yahoo returns; the previous one is kept only if the response omits it. The rotated set must be persisted **before** the access token is used. Concurrent refreshes of the same token are de-duplicated per server instance, so two parallel requests cannot race a rotation and strand an invalidated token.
- **Token storage.** `sealTokens`/`openTokens`: AES-256-GCM with a 32-byte server key; tampered, truncated or foreign-key values open as `null` (→ re-authorize).
- **Placeholders only** in `.env.example`; real values in `.env.local` (git-ignored) or Vercel project environment variables.

**Hosting decision needed (not changed in this spike).** The app is currently a Next.js static export (`output: 'export'`), which cannot host route handlers. Options:

| Option                                                                                                            | Cost                               | Notes                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Drop `output: 'export'`; add Next route handlers under `/api/yahoo/*`** (recommended)                        | Vercel Hobby Functions (free tier) | Pages stay statically prerendered; only `/api/yahoo/*` runs server code. Offline/PWA and E2E harness (`serve out`) must move to `next start`. One codebase. |
| B. Keep the static export; deploy the OAuth handlers as a separate small Vercel project on the same parent domain | Free                               | Two deployments; cookies must be scoped carefully.                                                                                                          |
| C. Local-only CLI (what the spike uses)                                                                           | Free                               | Fine for a single user on one machine; no live sync in the browser app.                                                                                     |

CSP needs no change for A (`connect-src 'self'` — the browser only ever calls our own `/api/yahoo/*`).

## 3. Token persistence — recommendation

Is persistent refresh-token storage required? **Yes, but only per browser, not in a database.** The access token lives about an hour (`expires_in`; the exact value is to be OBSERVED), a live draft plus preparation can exceed that, and re-consenting on every visit is poor UX. But nothing needs to run while the app is closed: sync happens only while you have the draft page open. So no server-side store is needed.

| Approach                                                 | Rotation-safe            | Free         | Verdict                                                                                                       |
| -------------------------------------------------------- | ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------- |
| **Encrypted HttpOnly cookie** (sealed token set)         | Yes (re-set on rotation) | Yes          | **Recommended.** No database; token never readable by JS. Clearing cookies = one-click re-auth.               |
| Refresh token in a Vercel env var                        | **No**                   | Yes          | Rejected: cannot be updated when Yahoo rotates it; a secret baked into config.                                |
| Upstash Redis / Vercel KV (free tier)                    | Yes                      | Yes (limits) | Only if a background job must sync with no browser open. Not needed now.                                      |
| Supabase                                                 | Yes                      | Yes (limits) | Rejected: adds a service and a service-role key for one secret. Not introduced "merely because OAuth exists". |
| Encrypted local file (`data/private/yahoo/token.sealed`) | Yes                      | Yes          | Used by the spike CLI only.                                                                                   |

Open point to verify with a real token: cookie size. The sealed set must stay under ~4 KB. If Yahoo's access token makes it too large, seal only the refresh token in the cookie and keep the access token in a short-lived second cookie.

## 4. Spike tooling (run this where Yahoo is reachable)

```bash
cp .env.example .env.local   # fill YAHOO_* (openssl rand -hex 32 for the two keys)
npm run yahoo:spike -- auth                     # consent once; encrypted token → data/private/yahoo/
npm run yahoo:spike -- probe [--league KEY]     # one request per resource, ~1.5 s apart
npm run yahoo:spike -- draft-poll --league KEY --interval 15   # during a live draft
```

- `probe` saves every raw response to `data/private/yahoo/responses/<time>/` and writes the availability matrix to `reports/private/yahoo-api/matrix-<time>.md`, both git-ignored (they contain your league data).
- `draft-poll` logs every poll (HTTP status, latency, throttling headers, `draft_status`, picks made, **new picks with first-seen time**) to `data/private/yahoo/draft-poll-<time>.jsonl`. It enforces ≥ 10 s between requests, backs off ×2 up to 5 min on 429/999/5xx, and stops at `postdraft`.
- Code: `src/server/yahoo/{oauth,api,probe}.ts`, `scripts/yahoo-spike.ts`; tests: `tests/unit/yahoo-oauth.test.ts`.

### Resources probed (paths under `https://fantasysports.yahooapis.com/fantasy/v2`, `?format=json`)

| Probe                                  | Path                                                   | Purpose                                      | Result      |
| -------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | ----------- |
| game                                   | `/game/nba`                                            | current game key, season                     | not yet run |
| gameStatCategories                     | `/game/nba/stat_categories`                            | stat id ↔ name                               | not yet run |
| userLeagues                            | `/users;use_login=1/games;game_codes=nba/leagues`      | your leagues, keys, draft status             | not yet run |
| userTeams                              | `/users;use_login=1/games;game_codes=nba/teams`        | your team key                                | not yet run |
| leagueSettings                         | `/league/{lk}/settings`                                | categories, roster/IL slots, adds, playoffs  | not yet run |
| leagueTeams                            | `/league/{lk}/teams`                                   | teams, draft position                        | not yet run |
| leagueDraftResults / teamDraftResults  | `/league/{lk}/draftresults`, `/team/{tk}/draftresults` | picks                                        | not yet run |
| teamRoster                             | `/team/{tk}/roster`                                    | roster                                       | not yet run |
| playersSortOR / playersSortAR          | `/league/{lk}/players;sort=OR\|AR;count=25`            | whether any rank value is returned           | not yet run |
| playersDraftAnalysis                   | `/league/{lk}/players;count=25/draft_analysis`         | ADP-like fields                              | not yet run |
| playersOwnership / playersPercentOwned | `…/players;count=25/ownership`, `…/percent_owned`      | ownership                                    | not yet run |
| playersStatsSeason / LastWeek          | `…/players;count=10/stats;type=season\|lastweek`       | actual stats per category                    | not yet run |
| playersStatsProjected                  | `…/players;count=10/stats;type=projected_season`       | **speculative** — does any projection exist? | not yet run |

Resource paths follow the LEGACY guide's URI grammar (`/resource/{key}/subresource;param=value`), which YAHOO-DOC excerpts confirm in general form (e.g. `/fantasy/v2/players;player_keys=…`).

## 5. Field-availability matrix

Every **Status** is **UNKNOWN** until `probe` has run against your league: nothing has been OBSERVED. The **Expectation** column records what the sources suggest, so the probe can confirm or refute it. After the probe, `reports/private/yahoo-api/matrix-*.md` gives the SUPPORTED / NOT EXPOSED / UNKNOWN verdicts automatically (rule: SUPPORTED only with a value in a 2xx response; NOT EXPOSED = resource answered 2xx without the field; UNKNOWN = not probed, failed, or absence is inconclusive).

| Area       | Field                                                            | Status  | Expectation (source)                                                                                                                     |
| ---------- | ---------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| League     | user's NBA leagues                                               | UNKNOWN | expected (LEGACY `users;use_login=1/games/leagues`)                                                                                      |
| League     | league key / ID                                                  | UNKNOWN | expected (LEGACY `league_key`, `league_id`)                                                                                              |
| League     | season                                                           | UNKNOWN | expected (LEGACY)                                                                                                                        |
| League     | league name                                                      | UNKNOWN | expected (LEGACY)                                                                                                                        |
| League     | number of teams                                                  | UNKNOWN | expected (LEGACY `num_teams`)                                                                                                            |
| League     | scoring type                                                     | UNKNOWN | expected (LEGACY `scoring_type`, e.g. head-to-head categories)                                                                           |
| League     | scoring categories                                               | UNKNOWN | expected (LEGACY settings `stat_categories`)                                                                                             |
| League     | roster positions                                                 | UNKNOWN | expected (LEGACY settings `roster_positions`)                                                                                            |
| League     | IL slots                                                         | UNKNOWN | expected as `IL`/`IL+` entries in `roster_positions` (LEGACY)                                                                            |
| League     | acquisition limits/settings                                      | UNKNOWN | partly expected (LEGACY `max_weekly_adds`/waiver fields); exact keys unverified                                                          |
| League     | playoff weeks/settings                                           | UNKNOWN | expected (LEGACY `playoff_start_week`, `num_playoff_teams`)                                                                              |
| User/team  | user's fantasy team                                              | UNKNOWN | expected (LEGACY `users;use_login=1/…/teams`)                                                                                            |
| User/team  | team key                                                         | UNKNOWN | expected (`{league_key}.t.{n}`, LEGACY)                                                                                                  |
| User/team  | draft position                                                   | UNKNOWN | unclear — LEGACY team `draft_position` may appear only once the order is set                                                             |
| User/team  | roster                                                           | UNKNOWN | expected (LEGACY `team/{tk}/roster`)                                                                                                     |
| Players    | Yahoo player ID/key                                              | UNKNOWN | expected (`player_key` = `{game_key}.p.{player_id}`, LEGACY)                                                                             |
| Players    | player name                                                      | UNKNOWN | expected (LEGACY `name.full`)                                                                                                            |
| Players    | NBA team                                                         | UNKNOWN | expected (LEGACY `editorial_team_abbr`)                                                                                                  |
| Players    | position eligibility                                             | UNKNOWN | expected (LEGACY `eligible_positions`)                                                                                                   |
| Players    | injury/status                                                    | UNKNOWN | expected (LEGACY `status`, `injury_note`); present only for flagged players                                                              |
| Players    | ownership                                                        | UNKNOWN | expected (LEGACY `ownership`, `percent_owned`)                                                                                           |
| Market     | Rank                                                             | UNKNOWN | **doubtful** — LEGACY exposes `sort=OR/AR` as an _ordering_, not a rank value field                                                      |
| Market     | XRank                                                            | UNKNOWN | **not expected** — no source mentions it in the API                                                                                      |
| Market     | ADP                                                              | UNKNOWN | possible: `draft_analysis` with `average_pick`, `average_round`, `average_cost`, `percent_drafted` (UNOFFICIAL). **Season-long, not L7** |
| Market     | Last 7 Days ADP                                                  | UNKNOWN | **not expected** — no source mentions it                                                                                                 |
| Market     | Fantasy Plus-specific data                                       | UNKNOWN | **not expected** — no source mentions subscription data in the API                                                                       |
| Statistics | current stats                                                    | UNKNOWN | expected (LEGACY `stats;type=season/lastweek/…`)                                                                                         |
| Statistics | projected statistics                                             | UNKNOWN | **doubtful** — no current source documents NBA projections in the API; the probe tries one guess                                         |
| Statistics | GP, FGM/FGA, FTM/FTA, FG%, FT%, 3PM, PTS, REB, AST, STL, BLK, TO | UNKNOWN | expected as stat ids with values; FGM/A and FTM/A may come as one "made/attempted" display stat — verify the split                       |
| Draft      | draft results                                                    | UNKNOWN | expected (LEGACY `league/{lk}/draftresults`)                                                                                             |
| Draft      | overall pick, round, drafting team, player ID                    | UNKNOWN | expected (`pick`, `round`, `team_key`, `player_key`, LEGACY/UNOFFICIAL)                                                                  |
| Draft      | available **during** a live draft                                | UNKNOWN | UNOFFICIAL projects report yes, trailing the draft room by seconds. **Must be tested** (§6)                                              |

## 6. Live-draft synchronization

Target: `Yahoo pick → app learns player ID → player marked drafted → engine recalculates`, with manual tracking always available.

**Findings so far**

- **Push/webhook: none found.** YAHOO-DOC describes a RESTful, read-only API and mentions no webhooks or streaming. UNOFFICIAL projects state there is no websocket/webhook and that clients poll `draftresults`, using `draft_status` (`predraft` → `drafting` → `postdraft`) to decide when to poll. So polling is the only candidate.
- **Rate limits: unpublished.** Only "may temporarily throttle" (YAHOO-DOC). UNOFFICIAL: throttling has shown up as HTTP 999 as well as 429; the spike treats both as "back off".
- **Live availability: UNKNOWN** until observed.

**Experiment protocol (needs your credentials and a draft)**

1. Before the draft: run `probe`. Check whether `draftresults` lists empty pick slots with `team_key` (that alone would give the full draft order), and read `draft_status`.
2. During a real or test-league live draft: `draft-poll --league KEY --interval 15`. Note wall-clock times of a few picks in the draft room.
3. Compare those times with first-seen times in the `.jsonl` log. Record: are picks visible mid-draft at all? Typical lag? Any 429/999 or throttling headers at 15 s? Does `draft_status` flip to `postdraft`?
4. Only if picks lag badly, try 10 s once. Never below 10 s (enforced).

**Proposed polling policy (to confirm)**: poll only while the draft page is open and `draft_status = drafting`; 15 s interval, one user ⇒ ≤ 240 requests/hour; exponential backoff to 5 min on 429/999/5xx; stop on `postdraft`. Mock drafts in Yahoo's public lobby are probably not league resources and probably not reachable; that is UNKNOWN.

**Applying picks (design, not implemented)**: each Yahoo pick is keyed by its overall pick number. The app appends a `PICK` event only for picks it does not already have. When a Yahoo pick conflicts with a manually entered pick at the same number, the app flags it for you and never silently rewrites the log. The existing event-sourced draft log (PICK / RESYNC / VOID) already supports this.

## 7. Player identity strategy

- `PlayerIdentity.yahooPlayerId` already exists, and the matcher already uses provider IDs as **step 1**, before name + team, alias and name. No schema change is needed to make the Yahoo ID authoritative.
- Store the numeric **`player_id`** as `yahooPlayerId`. The `player_key` prefix is the season's game key, which changes every season. Whether `player_id` itself is stable across seasons is UNKNOWN; assume it is not until checked.
- **Target chain:** `Yahoo player_id ↔ canonical player ↔ Hashtag projection`. Hashtag has no Yahoo IDs, so the Hashtag leg still uses name + team + alias, but it now attaches to an identity anchored by the Yahoo ID.

**Migration design (not executed):**

1. The first API sync fetches players (`player_key`, name, team, eligibility).
2. For each existing identity without `yahooPlayerId`, attach the Yahoo ID **only** on a unique normalized-name + team match. Ambiguous or unmatched players go to the existing review queue; nothing is auto-merged.
3. Record each attachment as an import batch (source `yahoo-api`), so it can be reverted.
4. From then on, screenshot, Hashtag and API imports hit the ID step first wherever an ID is present.
5. Report identities that remain without an ID. Today's 275 screenshot players carry no IDs.

## 8. Screenshot vs API precedence

The screenshot dataset stays and remains authoritative for anything the API does not expose. API data **never silently overwrites** it.

| Field                                      | Authority                     | Rule                                                                                                                                                                             |
| ------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XRank, Rank, Last 7 Days ADP, Fantasy Plus | **Screenshot** (only source)  | If the API turns out to expose something ADP-like (e.g. season `average_pick`), it is stored as a **separate** field with its own provenance and never fills or replaces L7 ADP. |
| Yahoo player ID                            | **API**                       | Screenshots have none.                                                                                                                                                           |
| Name, NBA team, positions, status          | API when **newer**, both kept | Timestamped. Differences are shown as review items and both values are kept. Status mapping as in the importer (INJ stays INJ).                                                  |
| League settings, roster, draft order       | **API**                       | Replaces manual league setup only after you confirm the diff.                                                                                                                    |
| Draft picks                                | **API**, manual as fallback   | See §6. Conflicts are flagged, never overwritten.                                                                                                                                |
| Statistics / projections                   | **Hashtag** stays primary     | Yahoo stats (actual or projected, if any) are validation or display only. They never become the primary projection provider automatically.                                       |

Strategy architecture unchanged: **Yahoo** → league + identity + market + live draft; **Hashtag** → primary projections; **engine** → 9-cat valuation, roster fit, scarcity, punts, timing.

## 9. Remaining unknowns and next steps

1. **You:** apply for Fantasy Sports API access (Yahoo Sports Developer Portal) and create a YDN app with Fantasy Sports Read. Register a redirect URI (https, or `oob` if Yahoo still allows it — UNKNOWN).
2. Run `auth` and `probe` somewhere Yahoo is reachable: locally, or here after allowing the four Yahoo hosts in the environment's network settings with credentials in environment variables. Then fill §5 from the generated matrix.
3. Run `draft-poll` during a live draft to settle live availability, lag and throttling (§6).
4. To verify: access-token lifetime, whether refresh tokens rotate in practice, sealed-cookie size, whether `oob` is still accepted, `player_id` stability across seasons, and the FGM/A stat split.
5. Codex decisions: hosting option (§2 A/B/C), cookie-based token storage (§3), precedence rules (§8).
