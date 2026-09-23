# Technical Design — Yahoo Fantasy Basketball 9-Cat Draft Decision Engine

Status: **DRAFT FOR REVIEW. No implementation code has been written yet.**
Every formula below is a proposal. Once approved, it becomes the contract that `STRATEGY_ENGINE.md` and the tests are built from.

Notation used throughout:

- `N` = number of teams
- `D` = the user's draft slot
- `k` = number of players currently on the user's roster
- `c` = a category
- `i` = a player
- `z_ic` = per-game z-score of player `i` in category `c`
- `ẑ_ic` = capped z-score
- "z-units" = per-game value expressed in summed z-scores

---

## 1. Architecture

```
┌────────────────────────── Browser (all draft-critical logic) ──────────────────────────┐
│  Next.js UI (static export, React, Tailwind, shadcn/ui)                                 │
│     Setup · Data Management · Draft · Review/Debug · Settings                           │
│            │ reads selectors / dispatches actions                                       │
│  Zustand store (in-memory working set)  ── write-through (async, non-blocking) ──┐      │
│            │ calls pure functions                                                │      │
│  domain/ (pure TypeScript, no React, no I/O)                                     ▼      │
│     draft · identity · import · stats · value · availability · positions     Repository │
│     roster · punts · scarcity · playoffs · upside · market · recommendations  interface  │
│     advisor · confidence                                                      │         │
│                                                                    DexieRepository (IndexedDB)
│                                                                    MemoryRepository (tests)
│                                                                    SupabaseRepository (Phase 2 stub/doc only)
└─────────────────────────────────────────────────────────────────────────────────────────┘
Hosting: Vercel Hobby. Static export: no API routes, no server functions. Optional PWA service worker.
```

Key decisions:

1. **Static, client-only Next.js** (`output: 'export'`). All calculation runs in the browser, so once the page and data have loaded, the app keeps working with no network.
2. **Event-sourced draft state.** `LeagueDraft.events` is an append-only log. The whole draft state is `replay(events)`. Undo pops the last event, which guarantees an exact restore and allows unlimited undo.
3. **Two-stage engine:**
   - `buildStaticContext(dataset, league, config)` computes the population, z-scores, replacement level and base values. It is memoized and depends only on player data, league size and config. It does **not** depend on draft events.
   - `evaluateDraft(staticCtx, draftState, flags, config)` computes the roster profile, punts, need, scarcity, positions, DDP, market, pick-pair planning, labels and the advisor output. It re-runs on every action.
4. **Every output carries its breakdown.** `PlayerEvaluation` contains every intermediate term, so the Debug panel is a direct rendering of engine output. No separate "explanation" code can drift out of sync with the engine.
5. **Single source of tuning:** `domain/config/defaults.ts`, validated by a Zod schema. The engine contains no magic numbers.
6. **Supabase is not implemented in v1.** I'll provide the `Repository` interface and a Phase 2 document.

---

## 2. Directory structure

```
/
├─ README.md  ARCHITECTURE.md  STRATEGY_ENGINE.md  DATA_IMPORT.md
├─ TESTING.md DEPLOYMENT.md QA_HANDOFF.md  .env.example  vercel.json (only if needed)
├─ docs/DESIGN.md                      (this file)
├─ sample-data/                        fictional players + CSV import templates
│   ├─ templates/*.csv                 empty header-only templates per import kind
│   ├─ yahoo-market.sample.csv  projections-hashtag.sample.csv
│   ├─ projections-bbm.sample.csv  availability.sample.csv  playoff-schedule.sample.csv
│   └─ generate.ts                     seeded deterministic generator (~300 fictional players)
├─ src/
│   ├─ app/                            routes: / (leagues), /setup, /data, /draft, /review, /settings
│   │                                  (league selected via store/query param — no dynamic routes,
│   │                                   keeps static export simple)
│   ├─ components/  ui/ (shadcn) draft/ data/ setup/ review/ common/
│   ├─ state/       store.ts, selectors.ts, shortcuts.ts
│   ├─ persistence/ repository.ts  dexieRepository.ts  memoryRepository.ts  backup.ts
│   └─ domain/
│       ├─ types/            all domain + evaluation types
│       ├─ config/           strategyConfig.schema.ts  defaults.ts  phases.ts
│       ├─ draft/            snake.ts  events.ts  replay.ts
│       ├─ identity/         normalize.ts  matcher.ts  suggestions.ts
│       ├─ import/           csv.ts  columnMaps.ts  rowSchemas.ts  reconcile.ts  importPlan.ts
│       ├─ stats/            population.ts  zscores.ts  percentages.ts  aggregate.ts
│       ├─ value/            replacement.ts  perGame.ts  seasonValue.ts  basePlayerValue.ts
│       ├─ availability/     availabilityScore.ts  roundRisk.ts
│       ├─ positions/        slots.ts  matching.ts  feasibility.ts  positionNeed.ts
│       ├─ roster/           categoryProfile.ts  categoryNeed.ts  redundancy.ts
│       ├─ punts/            puntConfidence.ts  puntWeights.ts  correlations.ts
│       ├─ scarcity/         scarcity.ts
│       ├─ playoffs/         playoffAdjustment.ts
│       ├─ upside/           upside.ts
│       ├─ market/           survivalBands.ts  valueOverMarket.ts  timingLabels.ts
│       ├─ recommendations/  ddp.ts  pickPair.ts  engine.ts  compare.ts (A-vs-B diff for QA)
│       ├─ advisor/          advisor.ts  templates.ts
│       └─ confidence/       dataConfidence.ts  disagreement.ts
├─ tests/
│   ├─ unit/**               mirrors domain/ one-to-one
│   ├─ integration/          engine end-to-end on fixtures, invariants (§53/§60)
│   ├─ fixtures/             hand-built synthetic players with obvious answers
│   └─ perf/                 500-player recalculation budget
└─ e2e/                      Playwright scenarios (§51)
```

---

## 3. TypeScript domain models

```ts
// ---------- enums ----------
export const CATEGORIES = ['FG_PCT','FT_PCT','THREES','PTS','REB','AST','STL','BLK','TO'] as const;
export type Category = typeof CATEGORIES[number];
export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type ActiveSlot = 'PG' | 'SG' | 'G' | 'SF' | 'PF' | 'F' | 'C' | 'UTIL';
export type ProviderId = string;              // 'hashtag', 'bbm', 'yahoo', user-defined
export type InjuryStatus = 'HEALTHY' | 'DTD' | 'OUT_SHORT' | 'OUT_LONG' | 'OUT_SEASON' | 'SUSPENDED';
export type Recurrence = 'LOW' | 'MODERATE' | 'HIGH' | 'UNCLASSIFIED';

// ---------- IDENTITY ----------
export interface PlayerIdentity {
  canonicalPlayerId: string;       // stable UUID, never reused
  canonicalName: string;
  normalizedName: string;
  nbaTeam: string | null;          // 3-letter code
  aliases: string[];
  yahooPlayerId?: string;
  providerIds: Record<ProviderId, string>;
  positions: Position[];           // Yahoo eligibility is authoritative when present
  birthDate?: string;              // or age, if that is all the data has
}

// ---------- SOURCE DATA (one record per player × source batch) ----------
export interface YahooMarket {
  canonicalPlayerId: string; season: string; importBatchId: string;
  yahooXRank: number | null;       // kept separate
  yahooRank: number | null;        // kept separate
  yahooAdp7d: number | null;       // kept separate — primary timing signal
  status: InjuryStatus | null;
}
export interface ProjectionLine {  // always stored normalized to PER GAME
  canonicalPlayerId: string; provider: ProviderId; season: string; importBatchId: string;
  gp: number; mpg: number | null;
  fgm: number; fga: number; ftm: number; fta: number;
  threes: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number;
  sourcePct: { fg: number | null; ft: number | null };   // as supplied, for consistency checks
}
export interface AvailabilitySeason {
  canonicalPlayerId: string; season: string; importBatchId: string;
  gamesPlayed: number; teamGames: number;          // teamGames defaults to 82
  absences: { games: number; recurrence: Recurrence; note?: string }[];  // optional detail
}
export interface PlayerMedical {                     // manual or imported
  canonicalPlayerId: string;
  age: number | null; currentStatus: InjuryStatus; recoveryNote?: string;
  manualRiskDelta?: number;                          // −0.30 … +0.30
  manualUpside?: number;                             // 0 … 1
  upsideTags?: string[]; note?: string;
}
export interface TeamPlayoffSchedule { nbaTeam: string; season: string; gamesByWeek: Record<number, number>; }

export interface ImportBatch {
  id: string; kind: 'YAHOO_MARKET' | 'PROJECTION' | 'AVAILABILITY' | 'MEDICAL' | 'PLAYOFF';
  provider: ProviderId; season: string; importedAt: string; description: string;
  counts: { rows: number; matched: number; created: number; unmatched: number; rejected: number };
  status: 'ACTIVE' | 'SUPERSEDED' | 'REVERTED';
}
export interface ManualMapping {                     // survives future imports; applied first
  provider: ProviderId; providerKey: string;         // provider ID, or `${normalizedName}|${team}`
  target: { canonicalPlayerId: string } | { ignore: true };
  createdAt: string;
}

// ---------- LEAGUE / DRAFT STATE (per league; never on Player) ----------
export interface RosterSettings {
  active: Record<ActiveSlot, number>;  // default PG1 SG1 G1 SF1 PF1 F1 C2 UTIL2
  bench: number;                       // default 3
  il: number;                          // default 2 (not drafted; no IL+)
}
export interface LeagueProfile {
  id: string; name: string; season: string;
  teamCount: number; draftPosition: number; draftType: 'SNAKE';
  roster: RosterSettings;
  acquisitionsPerWeek: number;         // default 4
  playoffWeeks: number[];              // default [18,19,20,21]
  primaryProjectionProvider: ProviderId;
  validationProviders: ProviderId[];
  createdAt: string; updatedAt: string;
}
export type DraftEvent = {
  seq: number; type: 'PICK'; overallPick: number;
  playerId: string; by: 'ME' | 'OTHER'; at: string;
  snapshot?: { ddp: number; baseValue: number; teamFit: number; label: TimingLabel };  // "fit at time drafted"
};
export interface PlayerFlags { favorite: boolean; avoid: boolean; doNotDraft: boolean; lockTarget: boolean; }
export type PuntOverride = 'AUTO' | 'NONE' | 'SOFT' | 'HARD';
export interface LeagueDraft {
  leagueId: string;
  events: DraftEvent[];                            // authoritative draft history
  flags: Record<string, PlayerFlags>;              // favorites/avoid/DND/locks (per league)
  puntOverrides: Partial<Record<Category, PuntOverride>>;
}

// ---------- CALCULATED (runtime only, never persisted as authoritative) ----------
export interface PlayerEvaluation {
  playerId: string;
  stats: { rawZ: Record<Category, number>; cappedZ: Record<Category, number>;
           fgImpact: number; ftImpact: number; neutral9Cat: number; neutralRank: number };
  value: { perGameVAR: number; expectedSeasonVAR: number; seasonAdj: number; basePlayerValue: number; scaleU: number };
  availability: { score: number; risk: 'LOW'|'MODERATE'|'HIGH'|'VERY_HIGH'; terms: Record<string, number> };
  fit: { need: number; punt: number; scarcity: number; position: number; multiPos: number;
         redundancy: number; teamFit: number; perCategory: Record<Category, {need:number; punt:number; scarcity:number}> };
  adjustments: { playoff: number; upside: number; risk: number; userPref: number };
  ddpRaw: number; ddpScore: number; ddpRank: number;
  market: { adp: number|null; xrank: number|null; rank: number|null; marketRef: number|null;
            marketRefSource: 'ADP'|'XRANK'|'RANK'|'NONE'; band: SurvivalBand; valueOverMarket: number|null };
  planning?: { pairValue: number; expectedNext: number; missCost: number };
  label: TimingLabel; priority: number;
  confidence: 'HIGH'|'MEDIUM'|'LOW'; warnings: string[]; disagreement?: DisagreementReport;
}
export type TimingLabel = 'DRAFT_NOW' | 'LEAN_DRAFT' | 'WAIT' | 'SAFE_WAIT' | 'PASS';
export type SurvivalBand = 'GONE' | 'UNLIKELY' | 'TOSSUP' | 'LIKELY' | 'SAFE' | 'UNKNOWN';
```

---

## 4. StrategyConfig (defaults)

```ts
export const DEFAULT_STRATEGY_CONFIG = {
  version: 1,
  seasonGames: 82,

  // Population
  fantasyPopulationBuffer: 20,          // P = N × rosterSize + buffer
  populationMinGP: 20,                  // must project ≥ 20 GP to be in the population
  populationMaxIterations: 8,
  replacementBandSize: 10,              // players ranked P+1 … P+10 define replacement level

  // Z-scores
  categoryZCap: 3.0,                    // capped z ∈ [−3, +3] for fit/value; raw z kept
  neutralTurnoverWeight: 1.0,           // neutral rankings
  initialTurnoverWeight: 0.75,          // draft-value base weight for TO

  // Per-game vs season
  perGameBlend: 0.5,                    // BPV = PG + (1 − blend)·(ESV − PG)
  replacementCoefficient: 0.35,         // share of missed games recovered by streaming (14-team)

  // Draft-phase weight for team-fit terms, indexed by k (players on my roster)
  fitPhaseWeightByRosterSize: [0.0, 0.25, 0.45, 0.65, 0.85, 1.0],  // k ≥ 5 → 1.0

  // Category need
  categoryNeedWeight: 0.50,             // λ_need (z-units per unit of capped z in a fully-needed category)
  needStrongThreshold: 0.75,            // d ≥ this → need 0
  needFullDeficit: 2.0,                 // need reaches 1 at d = 0.75 − 2.0 = −1.25
  categoryStateThresholds: { elite: 1.5, strong: 0.75, competitive: -0.5, weak: -1.25 },  // below weak = CRITICAL

  // Punts
  puntThresholds: { tendency: 0.30, soft: 0.50, hard: 0.90 },
  puntDeficitRange: { start: -0.5, full: -2.0 },   // D_c goes 0→1 as d moves −0.5 → −2.0
  puntCapByRosterSize: [0.0, 0.30, 0.30, 0.70, 0.70, 1.0],  // k=1–2 tendencies only, 3–4 emerging, 5+ full
  puntRampPicks: 5,                     // S_k = min(1, k / 5)
  puntCoherence: { base: 0.8, bonus: 0.4 },
  puntPriorAffinity: { TO: 0.10 },      // weak prior: TO is the most acceptable soft punt
  puntWeightCurve: [ [0.40, 1.0], [0.60, 0.667], [0.75, 0.333], [0.90, 0.0] ], // (π, multiplier), linear interp
  multiPuntDamping: [1.0, 0.6, 0.4],    // π multiplier for 1st, 2nd, 3rd+ most-punted category
  hardPuntLimitWarnings: { hardPuntsWarn: 2, multiPuntRisk: 3 },

  // Default-build prior (tiebreaker only, decays by k=5)
  priorCategoryPreference: { PTS: 0.05, AST: 0.05, THREES: 0.05, STL: 0.05, FT_PCT: 0.05 },
  priorDecayRosterSize: 5,

  // Scarcity
  scarcityWeight: 0.40,                 // λ_sc
  scarcityWindowRounds: 2,              // window W = 2N players reachable at next pick
  scarcityNeedBlend: { base: 0.25, need: 0.75 },
  scarcityGapFactor: { min: 0.5, max: 1.5 },

  // Positions
  positionalWeight: 0.05,               // normal 0–5 % of U
  positionalDangerWeight: 0.20,         // additional up to 20 % when urgency > 0.5
  multiPositionBonus: 0.01,             // per extra primary position, max 2 %
  multiPositionBonusCap: 0.02,

  // Redundancy
  redundancyWeight: 0.25,
  redundancySurplusRange: { start: 1.0, full: 2.0 },
  redundancyMaxFraction: 0.15,          // never more than 15 % of U

  // Availability / risk
  historySeasonWeights: [0.5, 0.3, 0.2],
  recurrenceWeights: { LOW: 0.25, MODERATE: 0.6, HIGH: 1.0, UNCLASSIFIED: 0.75 },
  chronicPatternPenalty: 0.05,          // HIGH-recurrence absences in ≥ 2 seasons
  ageRiskStart: 30, ageRiskPerYear: 0.01,
  statusRisk: { HEALTHY: 0, DTD: 0.03, OUT_SHORT: 0.08, OUT_LONG: 0.20, SUSPENDED: 0.02, OUT_SEASON: 1.0 },
  unknownHistoryRisk: 0.10,             // missing history ≠ healthy; flagged in data confidence
  riskBands: { low: 85, moderate: 70, high: 50 },   // score ≥ 85 LOW, ≥ 70 MOD, ≥ 50 HIGH, else VERY HIGH
  riskWeightsByRound: [ {fromRound:1,w:0.60}, {fromRound:4,w:0.35}, {fromRound:7,w:0.15}, {fromRound:11,w:0.05} ],

  // Playoffs
  playoffWeight: 0.03,                  // max ±3 % of U
  playoffWeekWeights: { 18: 1, 19: 1, 20: 1, 21: 1 },

  // Upside
  upsideScaleZ: 2.0,
  upsideWeightsByRound: [ {fromRound:1,w:0.05}, {fromRound:4,w:0.15}, {fromRound:7,w:0.40}, {fromRound:11,w:1.0} ],
  ageUpside: { enabled: true, maxAge: 23, score: 0.25 },   // derived only from supplied age

  // User flags
  favoriteBonus: 0.01, avoidPenalty: 0.15,  // fraction of U, applied to DDP only

  // Market
  adpUncertainty: { minPicks: 3, fraction: 0.12 },         // w = max(3, 0.12·ADP)
  survivalBandZ: { unlikely: -0.5, tossup: 0.5, likely: 1.5 },
  bandPlanningWeights: { GONE: 0.05, UNLIKELY: 0.20, TOSSUP: 0.50, LIKELY: 0.75, SAFE: 0.90, UNKNOWN: 0.50 },
  xrankDowngradeEnabled: true,
  marketTimingThresholds: {
    passBelowRel: 0.75, draftNowRel: 0.90, draftNowTopRel: 0.97,
    leanDraftRel: 0.85, leanDraftMissCost: 0.08, draftNowMissCost: 0.05,
  },

  // Pick-pair planning
  pickPairCandidates: 10, pickPairNextDiscount: 0.85, pickPairLookahead: 20,

  // Data quality
  disagreementThreshold: 0.75,          // SDs of neutral per-game value
  disagreementGpThreshold: 15,
  pctConsistencyTolerance: 0.005,
} as const;
```

The config is Zod-validated on import, versioned, and exportable. "Reset to defaults" restores this object.

---

## 5. Statistical core (neutral; no draft state)

### 5.1 Percentages (§14): volume-sensitive, makes/attempts only

On import, derive the missing piece: if makes and attempts are present, `pct = makes/attempts`. If only pct and attempts are present, `makes = pct × attempts`. If both are supplied and differ by more than `pctConsistencyTolerance`, the importer warns.

Over population `Pop`:

```
p_FG = Σ_Pop FGM / Σ_Pop FGA            (league rate — never a mean of percentages)
FGImpact_i = FGM_i − p_FG · FGA_i  ≡  (FG%_i − p_FG) · FGA_i
z_FG_i = (FGImpact_i − mean_Pop(FGImpact)) / sd_Pop(FGImpact)
```

FT is identical. `mean_Pop(FGImpact) = 0` by construction. Subtracting it anyway keeps the formula generic.

A team's percentage is **always** `ΣFGM / ΣFGA`. Summed impacts equal `ΣFGA_team · (teamFG% − p_FG)`, so adding impact z-scores is algebraically consistent with makes/attempts aggregation. A test asserts this.

Fixture check: 91 % on 1 FTA gives impact `(0.91 − p)·1`. 89 % on 9 FTA gives `(0.89 − p)·9`. With p ≈ 0.78, that is 0.13 versus 0.99, so B is far higher.

### 5.2 Counting z-scores (§13)

```
z_ic = (x_ic − μ_c) / σ_c                for PTS, REB, AST, STL, BLK, THREES
z_iTO = (μ_TO − x_iTO) / σ_TO             (lower TO → positive)
ẑ_ic = clamp(z_ic, −cap, +cap)            cap = 3.0
```

All stats are **per game**. σ is the population standard deviation (divide by n). If σ = 0, then z = 0 and a warning is raised.

### 5.3 Fantasy population (§12)

```
rosterSize = Σ active + bench           (13 by default; IL excluded)
P = N · rosterSize + buffer             (14·13 + 20 = 202)
Eligible = players with a primary projection and GP ≥ populationMinGP

iteration 0: μ, σ, p_FG, p_FT computed over ALL Eligible
repeat (max 8):
   neutral9Cat_i = Σ_c rawZ_ic (TO weight 1.0)
   Pop' = top P of Eligible by neutral9Cat (tiebreak: canonicalPlayerId ascending)
   recompute μ, σ, p over Pop'
   stop when Pop' == Pop (membership fixed point)
if not converged: use the last iteration and set a warning flag (deterministic either way)
```

The population is computed on the **full** player pool, not the available pool. Drafting players therefore never changes anyone's z-scores. It depends only on dataset, primary provider, N, roster size and config.

### 5.4 Value per game and per season (§15, §24)

Base category weights for draft value: `b_c = 1` for all categories except `b_TO = initialTurnoverWeight = 0.75`.

```
PG_i       = Σ_c b_c · ẑ_ic                          (fit-basis per-game value)
R          = mean PG over players ranked P+1 … P+10   (replacement level per game)
PGV_i      = PG_i − R                                 (per-game value above replacement)

Empty      = Σ_c b_c · ẑ_c(zero stat line)            (value of an unfilled game: counting z's negative,
                                                       TO z positive, FG/FT impact 0)
EmptyVAR   = Empty − R                                 (negative)

a_i        = min(1, projectedGP_i / seasonGames)
ESV_i      = a_i · PGV_i + (1 − a_i) · [ r · 0 + (1 − r) · EmptyVAR ]      r = replacementCoefficient
```

Interpretation: a missed game is replaced by a replacement-level streamer with share `r`, which contributes 0 value above replacement. Otherwise it is lost, which is worth `EmptyVAR`. ESV is expressed in the same per-game z-unit scale as PGV, so the two can be blended.

### 5.5 Base Player Value (§26)

```
BPV_i = PGV_i + (1 − perGameBlend) · (ESV_i − PGV_i)          (blend 0.5)
U_i   = max(BPV_i, 1.0)                                          (scale used for %-style modifiers)
Neutral9Cat_i = Σ_c rawZ_ic with TO = 1.0                        (displayed "neutral rank")
```

BPV contains **no ADP, no roster context and no round context**. Positional need and round-dependent risk are applied in DDP as separate, traceable terms (see Ambiguity A1).

---

## 6. Roster context

### 6.1 Category profile (§18)

Expected competition is built from the neutral draft order. Rank all population players by BPV. The "round-j cohort" is ranks `(j−1)N+1 … jN`.

```
s_c(roster)  = Σ_{i∈roster} ẑ_ic                               (FG/FT via impact z → makes/attempts-consistent)
B_c(k)       = Σ_{j=1..k} mean_{cohort j} ẑ_c                   (expected average team after k picks)
σT_c(k)      = √k · sd_{top N·rosterSize by BPV}(ẑ_c)           (team-level spread)
d_c          = (s_c − B_c(k)) / σT_c(k)          (k = 0 → d_c = 0)
```

State by `d_c`:

| State | Condition |
|---|---|
| ELITE | ≥ 1.5 |
| STRONG | ≥ 0.75 |
| COMPETITIVE | ≥ −0.5 |
| WEAK | ≥ −1.25 |
| CRITICAL | < −1.25 |
| PUNT | overrides the above when π_c ≥ soft threshold ("SOFT PUNT") or hard threshold ("PUNT") |

The dashboard also shows the real roster FG% and FT% (ΣM/ΣA) and per-game totals. The numeric `d_c` values are shown in Debug.

### 6.2 Punt confidence (§17), per category

```
D_c   = clamp((−0.5 − d_c) / 1.5, 0, 1)                         deficit: 0 at d ≥ −0.5, 1 at d ≤ −2.0
ρ_cc' = Pearson corr of ẑ_c and ẑ_c' over the population         (data-driven, e.g. TO vs PTS/AST < 0)
Coh_c = Σ_{c'≠c} max(0, −ρ_cc') · clamp(d_c'/1.5, 0, 1) / Σ_{c'≠c} max(0, −ρ_cc')
        (are the categories that trade off against c actually strong on this roster?)
S_k   = min(1, k / 5)
raw π_c = min( cap_k , S_k · clamp( D_c · (0.8 + 0.4·Coh_c) + affinity_c · [D_c > 0], 0, 1 ) )
          cap_k = [0, .30, .30, .70, .70, 1.0][min(k,5)]
          affinity: TO = 0.10, others 0 (weak prior; only acts when a real deficit already exists)

Multi-punt resistance: sort categories by raw π desc; π_c = raw π_c · multiPuntDamping[rankIndex]
User override: NONE → π = 0, SOFT → max(π, 0.6), HARD → 1.0
```

Label thresholds: π ≥ 0.30 is a tendency, ≥ 0.50 is a soft punt, ≥ 0.90 is a hard punt.

Warnings use **raw** π, before damping:

- 2 categories with raw π ≥ 0.90 → "Two hard punts" warning
- ≥ 3 categories with raw π ≥ 0.50 → prominent **MULTI-PUNT BUILD RISK**

The user is never blocked.

Punt weight multiplier (linear interpolation of the curve):

```
m_c = interp(π_c; (0.40,1.0), (0.60,0.667), (0.75,0.333), (0.90,0.0)) ,  m = 1 below 0.40, 0 above 0.90
effective TO weight = 0.75 · m_TO → 0.75 / 0.50 / 0.25 / 0.00   (matches §16)
```

### 6.3 Category need (§19)

```
φ_k    = fitPhaseWeightByRosterSize[min(k,5)]                   (0, .25, .45, .65, .85, 1.0)
need_c = clamp((0.75 − d_c) / 2.0, 0, 1) · m_c  + prior_c · max(0, 1 − k/5)
         prior: PTS/AST/THREES/STL/FT_PCT = 0.05 (weak tiebreaker, gone by k = 5)
NeedAdj_i = λ_need · φ_k · Σ_c b_c · need_c · ẑ_ic               λ_need = 0.5
```

This is symmetric. A needed category amplifies both gains and harm, so a player who hurts a weak category is penalized. Punted categories get `m_c → 0`, which means no rescue.

Spec example: AST at −1.2 gives need 0.975. TO at −1.5 with π_TO = 0.8 gives m ≈ 0.2 and need ≈ 0.2.

### 6.4 Punt synergy

```
PuntAdj_i = φ_k · Σ_c b_c · (m_c − 1) · ẑ_ic
```

A player who is negative in a punted category gains value, because the harm he would have done is removed. Strength he brings in a punted category is discounted. Raw z-scores are never modified.

### 6.5 Redundancy (§28)

```
surplus_c = clamp((d_c − 1.0) / 1.0, 0, 1)                       (starts at d = 1.0, full at 2.0)
gate      = min(1, Σ_c need_c)                                     (only when real needs remain)
RedAdj_i  = − min( 0.15·U_i , λ_red · φ_k · gate · Σ_c surplus_c · max(ẑ_ic, 0) )      λ_red = 0.25
```

### 6.6 Scarcity (§20)

`MarketOrder` = available players sorted by marketRef ascending. marketRef is ADP, falling back to XRank, then Rank; ties are broken by BPV descending, then by ID. Players with no market data go last, ordered by BPV.

```
g        = picks by others before my next evaluation pick (see §8)
W        = scarcityWindowRounds · N                                (= 28)
Reach    = MarketOrder[g : g + W]                                  (players plausibly available at my next pick)
zRepl_c  = mean ẑ_c of the replacement band (§5.4)
Supply_c(X) = Σ_{i∈X} max(ẑ_ic − zRepl_c, 0)
Supply0_c   = Supply_c(first W players of the FULL pool in market order)   (draft-start baseline, static)
r_c      = Supply_c(Reach) / Supply0_c
q_c      = clamp(1 − r_c / mean_c'(r_c'), 0, 1)                    (category depleting faster than the others)
gf       = clamp(g / N, 0.5, 1.5)                                  (long snake gap → more urgency)
ScarAdj_i = λ_sc · gf · Σ_c q_c · m_c · (0.25 + 0.75·need_c) · max(ẑ_ic, 0)     λ_sc = 0.40
```

- **Relative normalization.** All supply naturally declines during a draft. Only categories depleting faster than average become scarce, so there are no hard-coded "assists are scarce" rules.
- **Need blend.** Scarcity still matters slightly in categories I'm not short on (0.25). It matters most in needed categories.
- **Only positive contributions count.** A player adds supply in a category only if he is above that category's replacement level.
- **Known sensitivity.** Because Reach is market-ordered, changing a player's ADP can shift *other* players' scarcity slightly. It can also shift his own, but only through the q_c terms. BPV is never affected. This is documented as an accepted, tested property.

### 6.7 Positions (§21)

The active slots are the Yahoo defaults:

```
PG→{PG}  SG→{SG}  G→{PG,SG}  SF→{SF}  PF→{PF}  F→{SF,PF}  C→{C}×2  UTIL→any×2
```

The bench accepts anyone. IL is not part of the draft.

```
R_left      = rounds − k   (rounds = active + bench)
MaxMatch(S) = maximum bipartite matching of player set S to active slots (augmenting paths; ≤ 13 × 10)
Feasible    = MaxMatch(roster ∪ {R_left wildcard dummies}) == activeSlotCount
required_p  = activeSlotCount − MaxMatch(roster ∪ {R_left dummies eligible for every position except p})
u_p         = R_left > 0 ? clamp(required_p / R_left, 0, 1) : 0
u_i         = max_{p ∈ elig_i} u_p
PosAdj_i    = U_i · [ 0.05·u_i + 0.20·max(0, (u_i − 0.5)/0.5) ]           (normal ≤ 5 %, dangerous up to 25 %)
MultiPosAdj_i = U_i · min(0.02, 0.01·(|primary positions_i| − 1))
```

Example: 0 C with 12 picks left gives `required_C = 2` and `u = 0.17`, a bonus of about 0.8 %. 0 C with 3 picks left gives `u = 0.67`, a bonus of about 10 %. 0 C with 2 left gives `u = 1.0`, a bonus of 25 %. If the roster is infeasible, a blocking-style warning is shown (the user can still pick).

### 6.8 Availability / durability (§22)

```
per season s (most recent first, weights 0.5/0.3/0.2 renormalized over seasons present):
   with absence detail:  wMiss_s = Σ_abs games · recurrenceWeight(class) / teamGames_s
   without detail:       wMiss_s = (1 − GP_s / teamGames_s) · 0.75        (UNCLASSIFIED)
H       = Σ_s w_s · wMiss_s                   (no history → unknownHistoryRisk = 0.10, flagged)
Chronic = 0.05 if HIGH-recurrence absences appear in ≥ 2 seasons
Age     = 0.01 · max(0, age − 30)            (age unknown → 0, flagged)
Status  = statusRisk[currentStatus]           (OUT_SEASON = 1.0)
ρ_i     = clamp(H + Chronic + Age + Status + manualRiskDelta, 0, 1)
AvailabilityScore = round(100 · (1 − ρ_i))
Risk: ≥ 85 LOW · ≥ 70 MODERATE · ≥ 50 HIGH · else VERY HIGH
```

Recurrence weights: LOW (suspension, personal, isolated illness, contact or freak injury) 0.25; MODERATE 0.6; HIGH (chronic knee, back, foot, hamstring, tendon, load management) 1.0.

**Projected GP is deliberately excluded from ρ.** Expected missed games are already priced into ESV. ρ models recurrence and downside tail risk (see Ambiguity A5). Every term is stored in `availability.terms` for display.

### 6.9 Round-dependent risk (§23)

```
RiskAdj_i = − riskWeight(currentRound) · ρ_i · U_i       weights R1–3 0.60, R4–6 0.35, R7–10 0.15, R11+ 0.05
```

This term is only ever negative, so durability alone never adds value. A healthy replacement-level veteran keeps his low BPV.

### 6.10 Playoffs (§25)

```
G_team = Σ_{w∈playoffWeeks} weekWeight_w · games_w(team)
PlayoffAdj_i = U_i · clamp( 0.03 · (G_team − mean_teams G) / (2 · sd_teams G), −0.03, +0.03 )
```

If data is missing, the adjustment is 0 and a warning is raised.

### 6.11 Upside (§55)

```
upsideScore_i = max(manualUpside, providerUpsideTag, ageUpside if age ≤ 23 → 0.25)  ∈ [0,1];  absent → 0
UpsideAdj_i   = upsideWeight(round) · upsideScore_i · 2.0      weights R1–3 .05, R4–6 .15, R7–10 .40, R11+ 1.0
```

Upside is additive in z-units, so it can lift late-round players whose BPV is near 0.

---

## 7. Dynamic Draft Priority (§29)

All terms are in **per-game z-units above replacement**. There are no incompatible scales: percentage-style modifiers are multiplied by `U_i`.

```
TeamFit_i = NeedAdj_i + PuntAdj_i + ScarAdj_i + PosAdj_i + MultiPosAdj_i + RedAdj_i

DDP_raw_i = BPV_i + TeamFit_i + PlayoffAdj_i + UpsideAdj_i + RiskAdj_i + UserPrefAdj_i

UserPrefAdj_i = +0.01·U_i (favorite)  −0.15·U_i (avoid)       Do-Not-Draft → excluded from candidates
DDP_score_i   = round(100 · max(0, DDP_raw_i) / max_available DDP_raw)    (display 0–100; raw kept)
```

Phase dependence:

- Need, punt, scarcity and redundancy are scaled by φ_k, which is set by the user's roster size.
- Risk and upside are scaled by the current round.
- Position is driven by `R_left`.

All these weight tables are in the config.

Invariants:

- ADP is absent from BPV.
- ADP reaches DDP only through the Reach window used by scarcity (§6.6).
- Flags never touch `stats`, `value` or `BPV`.

Debug shows this exact sum line for each player, and `compare(A, B)` prints the term-by-term difference.

---

## 8. Market urgency, timing and pick-pair planning (§30–33)

### 8.1 Evaluation picks

From `snake.ts`:

```
userPicks(N, D, rounds): round r → pickInRound = (r odd) ? D : N − D + 1 ;  overall = (r−1)·N + pickInRound
currentOverall = events.length + 1
P0 = first user pick ≥ currentOverall   (= currentOverall when on the clock)
P1 = first user pick > P0
g  = P1 − P0 − 1      (picks by others between my picks)
gapType = g+1 > N ? 'LONG' : g+1 < N ? 'SHORT' : 'EVEN'
```

Worked check, N = 14, D = 11: 11, 18, 39, 46, 67, 74, 95, 102, 123, 130, 151, 158, 179.

Events are sequential by overall pick. "Draft to my team" while not on the clock is allowed, but it raises an "off-schedule pick" warning (for example, after a Yahoo auto-pick; see A3).

### 8.2 Survival band (no fake probabilities)

`marketRef` is ADP₇d. If that is missing, use XRank; if that is missing, use Rank; each fallback is flagged. The band describes the target's chance of lasting until my **following** pick P1:

```
w = max(3, 0.12 · marketRef)                          (ADP spread widens with depth; assumption A11)
zS = (marketRef − P1) / w
GONE      if marketRef < currentOverall − w         (market says he should already be gone)
UNLIKELY  if zS ≤ −0.5
TOSSUP    if −0.5 < zS ≤ 0.5
LIKELY    if 0.5 < zS ≤ 1.5
SAFE      if zS > 1.5
UNKNOWN   if no market data at all
XRank downgrade: if band ∈ {LIKELY, SAFE} and XRank < P1 → one band lower (secondary signal)
```

Only the band name is shown. Internal planning weights are GONE .05, UNLIKELY .20, TOSSUP .50, LIKELY .75, SAFE .90 and UNKNOWN .50. They are documented as heuristics and are never displayed as percentages.

### 8.3 Pick-pair planning (one pick ahead)

For the top K = 10 candidates by DDP_raw:

```
roster' = roster ∪ {X};  pool' = available \ {X}
re-evaluate DDP for pool' with roster' (fit, needs, punts, positions change — scarcity uses P1 window)
L = top 20 of pool' by DDP_raw'
E_next(X) = Σ_{j∈L, DDP order} DDP'_j · s_j · Π_{l<j} (1 − s_l)          s = band planning weight
PairValue(X) = DDP_raw(X) + 0.85 · E_next(X)
MissCost(X)  = DDP_raw(X) − E_next^{¬X}  where E_next^{¬X} = same expectation with X removed and current roster
missPct(X)   = MissCost(X) / max_available DDP_raw
```

Recommended player = argmax PairValue. Priority (the default table sort) is PairValue for the top K, followed by the remaining players by DDP_raw.

Long gaps shrink the survival weights of everyone behind P1, which makes the engine more aggressive. Short gaps make it more willing to wait. Cost: K × one fit re-evaluation, about 5k player evaluations, well under 100 ms.

### 8.4 Timing labels (thresholds in config)

With `rel = DDP_raw / max_available DDP_raw`, the first matching rule wins:

```
1. PASS        rel < 0.75  (or Avoid-flagged and rel < 0.85)
2. DRAFT NOW   (rel ≥ 0.97 and band ∉ {SAFE})
               or (rel ≥ 0.90 and band ∈ {GONE, UNLIKELY, TOSSUP} and missPct ≥ 0.05)
3. LEAN DRAFT  rel ≥ 0.85 and (band ∈ {GONE, UNLIKELY, TOSSUP} or (band = LIKELY and missPct ≥ 0.08))
4. SAFE WAIT   band = SAFE
5. WAIT        otherwise
```

Spec fixtures:

- Pick 67 (P1 = 74). A: DDP 95, ADP 69 → zS = −0.6 → UNLIKELY → **DRAFT NOW**. B: DDP 93, ADP 95 → zS = 1.84 → SAFE → **SAFE WAIT**.
- Our rank 31, ADP 33, current 25, next 52 → UNLIKELY → **DRAFT NOW**.
- Our rank 45, ADP 83, current 46 → SAFE → **SAFE WAIT** ("target later").

### 8.5 Value over market (§32)

```
ourOverallRank = (currentOverall − 1) + ddpRank ;  VOM = marketRef − ourOverallRank
```

This is display-only and never feeds into the label.

---

## 9. Strategy Advisor (§36)

The advisor uses deterministic templates driven by evaluation output:

- header (pick, round, next pick, gap type)
- build line (strongest punt state plus π)
- priority (top 3 categories by `need_c · (1 + q_c)`)
- reason sentence: weakest competitive category, its scarcity trend, and categories that are already strong
- RECOMMENDED: argmax PairValue, with the top 3 positive terms rendered into phrases, plus the band phrase
- AVOID THIS ROUND: players' dominant categories where `surplus_c > 0`

Multi-punt and feasibility warnings are prepended. There are no AI calls.

---

## 10. Data import, identity and confidence (summary; details in DATA_IMPORT.md later)

**Pipeline:** parse (PapaParse) → column mapping (presets: Yahoo market, Hashtag-compatible, BBM-compatible, availability, playoff, medical) → Zod row validation → reconcile identities → preview/report → a single Dexie transaction commit, which is atomic, so a failed import writes nothing.

**Source isolation and versioning:**

- Each batch is kept, and the active batch per (kind, provider, season) is a pointer. "Revert import" moves the pointer back.
- Yahoo's own stat columns import as a separate projection provider `yahoo`. They are never merged into market fields.

**Name normalization:** NFD with diacritics stripped, lowercase, suffixes removed (jr, sr, ii, iii, iv, v), periods and apostrophes removed, hyphens turned into spaces, whitespace collapsed.

**Matching order:**

1. manual mapping
2. provider ID
3. normalized name + team
4. alias
5. normalized name, only if exactly one candidate
6. otherwise → **review queue**, never an automatic merge

Fuzzy (Jaro-Winkler) candidates are offered as suggestions only. The first primary-projection import creates identities. Later unmatched rows wait for review, with a bulk "create new identities" option. Manual decisions are persisted as `ManualMapping` and applied first on every future import.

**Disagreement:** each validation source is scored with the primary population's μ/σ/p.

```
Δ = |Neutral9Cat_primary − Neutral9Cat_validation| / sd_Pop(Neutral9Cat)
```

The player is flagged when Δ > 0.75 or |ΔGP| > 15. Per-category deltas are shown.

**Data confidence:**

- HIGH = primary projection + market + availability history, with no disagreement.
- MEDIUM = primary projection + market, with no history.
- LOW = missing or incomplete projection, or an unresolved disagreement.

A player without a primary projection is **not ranked**. He is listed with a "NO PROJECTION" warning and is never treated as average.

---

## 11. Persistence and resilience

- **`Repository` interface:** leagues, drafts, identities, source batches, mappings, config. Implementations are `DexieRepository` and `MemoryRepository` (for tests).
- **Write-through.** The store updates in memory synchronously, so the UI is instant. It then persists asynchronously and shows a save-status badge (Saved / Saving / Error).
- **Backup.** Export a full JSON backup, per-league or all data, with a schema version. Restore goes through Zod validation.
- **Offline.** A small hand-written service worker caches the app shell for PWA install and offline reopen. IndexedDB holds all data.
- **Security:**
  - imports are treated purely as data
  - text is rendered via React escaping only, with no `dangerouslySetInnerHTML`
  - file-size and row limits are enforced
  - CSP and security headers are set in `vercel.json`
  - there are no secrets in v1
- **Supabase (Phase 2):** a documented `SupabaseRepository` built as a sync layer on top of local storage, using RLS and the anon key only. It is not built in v1.

---

## 12. Test plan highlights (full detail in TESTING.md later)

- **Snake:** positions 1, middle and N for N ∈ {10, 12, 14}; the 14/11 sequence above; gap classification; P0/P1 on and off the clock.
- **Fixtures (§50):** FT/FG volume; need (REB/BLK-heavy roster prefers the AST/3PM player); soft punt of TO reducing TO rescue; the market pair at pick 67/74; the deviation scenario.
- **Invariant suite (§53, §60):** property-style tests that mutate one input and assert which outputs may and may not change:
  - ADP change → BPV identical
  - draft position change → stats and value identical
  - provider switch → market identical
  - punt override → rawZ identical
  - flags → stats identical
  - undo → deep-equal state
  - league isolation
- **Performance:** full `evaluateDraft` on 500 players under 100 ms, asserted in CI with headroom.
- **E2E:** the §51 Playwright scenario using the fictional sample CSVs.

---

## 13. Ambiguities and assumptions — need your decision

| # | Topic | Proposed resolution |
|---|---|---|
| A1 | §26 lists positional and risk adjustments inside BPV, but §29 lists them separately in DDP | Keep BPV = stats + expected-season value only (neutral, league-size-aware). Apply position and round-weighted risk once, in DDP. This avoids double counting and keeps BPV independent of round and roster. |
| A2 | Draft rounds | rounds = active + bench = 13. IL slots are not drafted and are excluded from the population. |
| A3 | Recording picks | Picks are sequential by overall number. "Draft to my team" off the clock is allowed with a warning. Keepers and traded picks are not supported in v1. |
| A4 | Config scope | One global StrategyConfig, since it is my strategy. Primary and validation providers and punt overrides are per league. |
| A5 | Projected GP versus durability | ESV prices expected missed games (from projected GP). The availability score prices recurrence and tail risk (history, age, status) and deliberately excludes projected GP to limit double counting. |
| A6 | Availability history input | A user-supplied CSV per player-season (GP, team games, optional absence rows with recurrence class). Classification is manual or imported. The app does not infer diagnoses. |
| A7 | Positions | Yahoo eligibility is authoritative. If there is no Yahoo row, projection-provider positions are used and flagged. |
| A8 | Playoff schedule | Team-level games per week, supplied by CSV. Missing data → no adjustment. |
| A9 | Age-based upside | On by default (age ≤ 23 → 0.25) because it is derived from supplied data. It can be disabled. Everything else in upside is manual or provider-tagged only. |
| A10 | Non-TO punt curve | The same π→multiplier curve as TO, relative to base weight 1.0. For example, FT% hard punt → weight 0. |
| A11 | ADP spread | Yahoo L7 ADP has no stdev in the screenshots, so I assume a width of max(3, 12 % of ADP) to form bands. If a dataset later includes min/max pick or % drafted, the band widths can use it. |
| A12 | Scarcity window | Uses market order (ADP) to predict who reaches my next pick. So ADP can affect *other* players' scarcity, and a player's own scarcity only through q_c. It never affects BPV. |
| A13 | Rank display | "Neutral rank" = raw z-sum with TO = 1.0 (a pure 9-cat rank). BPV = capped z with TO = 0.75, plus season blend (the draft-value baseline). Both are displayed. |
| A14 | Framework | Next.js current stable, App Router, `output: 'export'`, a hand-written service worker, and Dexie for IndexedDB. There is no Supabase code in v1. |
| A15 | Sample data | About 300 fictional players from a seeded generator, with realistic stat distributions and fake names and teams. No proprietary data is committed. |
| A16 | Default weights | Numbers in §4 are starting points chosen to keep terms on similar scales. Examples: need ≈ +1 z-unit for +2 z in a fully-needed category; top-round BPV ≈ 6–10 z-units. I expect one calibration pass on real Hashtag and Yahoo data after the first build. |

**Awaiting approval before implementation.**
