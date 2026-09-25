# Technical Design — Yahoo Fantasy Basketball 9-Cat Draft Decision Engine

Status: **REVISION 3 — APPROVED FOR IMPLEMENTATION (Codex QA approved rev 2; rev 3 is a small calibration change).**
Every formula below is a proposal. Once approved, it becomes the contract that `STRATEGY_ENGINE.md` and the tests are built from.

## Revision log

| Rev | Change |
|---|---|
| 1 | Initial design. Architecture approved by Codex QA. |
| 2 | Addresses the Codex QA review of rev 1 (items R2-1 … R2-8 below). |
| 3 | R3-1: durability residual-risk weight (§6.9) and calibration fixtures (T-DUR-1…3). R3-2: documents the limitation of the single replacement coefficient (§14). No other formula changed. |

Rev 2 changes, mapped to the Codex review:

| Item | Change | Sections |
|---|---|---|
| R2-1 | Survival bands are **ordinal only**. Pick-pair planning uses deterministic band-tier scenarios. Nothing multiplies a band by a weight or treats it as a probability. | §8.2–8.4 |
| R2-2 | The zero-stat-line / `EmptyVAR` model is **removed**. It is replaced by a value-above-replacement availability model in which missed games can only lose value. Turnovers play no part in missed-game loss. | §5.4 |
| R2-3 | Automatic punt detection adds **recoverability**. An automatic HARD punt requires deficit + coherence + low recoverability + draft progress, all four together. | §6.2 |
| R2-4 | Scarcity is split into **POOL SCARCITY** (ADP-independent, part of DDP) and **NEXT-PICK SCARCITY** (uses Yahoo L7 ADP, lives in the market/urgency layer only). ADP can no longer change DDP at all. | §6.6, §7, §8 |
| R2-5 | Adds **manual draft resync** through `RESYNC` events and non-advancing "mark taken" picks. | §8.1, §3 |
| R2-6 | The automatic age ≤ 23 upside bonus is **removed**. Upside comes only from supplied role/minutes/provider/manual data. | §6.11 |
| R2-7 | Adds explicit **zero/negative denominator guards** for every division and standard deviation, plus a finite-output contract. | §5.0, §12 |
| R2-8 | Unchanged by design: the percentage-impact model, identity/reconciliation, local-first storage, event history, source isolation, debug breakdowns and deterministic engine. | — |

Notation used throughout:

- `N` = number of teams
- `D` = the user's draft slot
- `k` = number of players currently on the user's roster
- `K` = total rounds (final roster size)
- `c` = a category
- `i` = a player
- `z_ic` = per-game z-score of player `i` in category `c`
- `ẑ_ic` = capped z-score
- "z-units" = per-game value expressed in summed z-scores

---

## 1. Architecture (approved, unchanged)

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
│     advisor · confidence · numeric                                            │         │
│                                                                    DexieRepository (IndexedDB)
│                                                                    MemoryRepository (tests)
│                                                                    SupabaseRepository (Phase 2 doc only)
└─────────────────────────────────────────────────────────────────────────────────────────┘
Hosting: Vercel Hobby. Static export: no API routes, no server functions. Optional PWA service worker.
```

1. **Static, client-only Next.js** (`output: 'export'`). After load, all calculation runs locally, with no network needed.
2. **Event-sourced draft state.** `LeagueDraft.events` is an append-only log, and the state is `replay(events)`. Undo pops the last event, which restores the state exactly and allows unlimited undo.
3. **Two-stage engine:**
   - `buildStaticContext(dataset, league, config)` computes the population, z-scores, replacement level, BPV and cohorts. It is memoized, never depends on draft events, and **never reads market data**.
   - `evaluateDraft(staticCtx, draftState, flags, config)` computes the roster profile, punts, need, pool scarcity, positions, DDP, then the market layer (bands, next-pick scarcity, pick-pair, labels) and the advisor.
4. **Every output carries its full term breakdown.** The Debug panel renders engine output directly.
5. **All tuning lives in `domain/config/defaults.ts`**, validated by Zod. The engine contains no magic numbers.
6. **Supabase is not implemented in v1.** The `Repository` interface plus Phase 2 documentation are delivered instead.

---

## 2. Directory structure

```
/
├─ README.md  ARCHITECTURE.md  STRATEGY_ENGINE.md  DATA_IMPORT.md
├─ TESTING.md DEPLOYMENT.md QA_HANDOFF.md  .env.example  vercel.json (only if needed)
├─ docs/DESIGN.md
├─ sample-data/
│   ├─ templates/*.csv                 header-only import templates per kind
│   ├─ *.sample.csv                    fictional Yahoo market / Hashtag-style / BBM-style / availability / playoff
│   └─ generate.ts                     seeded deterministic generator (~300 fictional players)
├─ src/
│   ├─ app/                            / (leagues), /setup, /data, /draft, /review, /settings
│   ├─ components/  ui/ draft/ data/ setup/ review/ common/
│   ├─ state/       store.ts selectors.ts shortcuts.ts
│   ├─ persistence/ repository.ts dexieRepository.ts memoryRepository.ts backup.ts
│   └─ domain/
│       ├─ types/            domain + evaluation types
│       ├─ config/           strategyConfig.schema.ts defaults.ts phases.ts
│       ├─ numeric/          safe.ts (safeDiv, safeSd, finite guards) — used by every module
│       ├─ draft/            snake.ts events.ts replay.ts resync.ts
│       ├─ identity/         normalize.ts matcher.ts suggestions.ts
│       ├─ import/           csv.ts columnMaps.ts rowSchemas.ts reconcile.ts importPlan.ts
│       ├─ stats/            population.ts zscores.ts percentages.ts aggregate.ts correlations.ts
│       ├─ value/            replacement.ts perGame.ts seasonValue.ts basePlayerValue.ts
│       ├─ availability/     availabilityScore.ts roundRisk.ts
│       ├─ positions/        slots.ts matching.ts feasibility.ts positionNeed.ts
│       ├─ roster/           categoryProfile.ts categoryNeed.ts redundancy.ts
│       ├─ punts/            puntConfidence.ts recoverability.ts puntWeights.ts
│       ├─ scarcity/         poolScarcity.ts nextPickScarcity.ts
│       ├─ playoffs/         playoffAdjustment.ts
│       ├─ upside/           upside.ts
│       ├─ market/           marketRef.ts survivalBands.ts valueOverMarket.ts timingLabels.ts
│       ├─ recommendations/  ddp.ts pickPair.ts engine.ts compare.ts
│       ├─ advisor/          advisor.ts templates.ts
│       └─ confidence/       dataConfidence.ts disagreement.ts
├─ tests/  unit/** (mirrors domain/) · integration/ (engine + invariants) · fixtures/ · perf/
└─ e2e/    Playwright scenarios
```

---

## 3. TypeScript domain models

```ts
export const CATEGORIES = ['FG_PCT','FT_PCT','THREES','PTS','REB','AST','STL','BLK','TO'] as const;
export type Category = typeof CATEGORIES[number];
export const COUNTING_POSITIVE = ['THREES','PTS','REB','AST','STL','BLK'] as const;
export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type ActiveSlot = 'PG' | 'SG' | 'G' | 'SF' | 'PF' | 'F' | 'C' | 'UTIL';
export type ProviderId = string;
export type InjuryStatus = 'HEALTHY' | 'DTD' | 'INJ' | 'OUT_SHORT' | 'OUT_LONG' | 'OUT_SEASON' | 'SUSPENDED';
export type Recurrence = 'LOW' | 'MODERATE' | 'HIGH' | 'UNCLASSIFIED';

// ---------- IDENTITY ----------
export interface PlayerIdentity {
  canonicalPlayerId: string; canonicalName: string; normalizedName: string;
  nbaTeam: string | null; aliases: string[];
  yahooPlayerId?: string; providerIds: Record<ProviderId, string>;
  positions: Position[];                      // Yahoo eligibility authoritative when present
  birthDate?: string;
}

// ---------- SOURCE DATA (per player × source batch; never merged across sources) ----------
export interface YahooMarket {
  canonicalPlayerId: string; season: string; importBatchId: string;
  yahooXRank: number | null; yahooRank: number | null; yahooAdp7d: number | null;   // independent
  status: InjuryStatus | null;
}
export interface ProjectionLine {             // stored PER GAME
  canonicalPlayerId: string; provider: ProviderId; season: string; importBatchId: string;
  gp: number; mpg: number | null;
  fgm: number; fga: number; ftm: number; fta: number;
  threes: number; pts: number; reb: number; ast: number; stl: number; blk: number; to: number;
  sourcePct: { fg: number | null; ft: number | null };
}
export interface AvailabilitySeason {
  canonicalPlayerId: string; season: string; importBatchId: string;
  gamesPlayed: number; teamGames: number;
  absences: { games: number; recurrence: Recurrence; note?: string }[];
}
export interface PlayerContext {              // manual or imported; all optional
  canonicalPlayerId: string;
  age: number | null;                         // risk input only — NOT an upside input (R2-6)
  currentStatus: InjuryStatus; recoveryNote?: string;
  manualRiskDelta?: number;                   // −0.30 … +0.30
  manualUpside?: number;                      // 0 … 1
  providerUpside?: number;                    // 0 … 1, from an imported provider tag
  roleTags?: RoleTag[];                       // supplied role/opportunity data only
  previousSeasonMpg?: number | null;          // with ProjectionLine.mpg → minutes-growth signal
  note?: string;
}
export type RoleTag = 'STARTER_OPPORTUNITY' | 'INJURY_AWAY_ROLE' | 'DEPTH_CHART_RISE' | 'ROOKIE_ROLE';
export interface TeamPlayoffSchedule { nbaTeam: string; season: string; gamesByWeek: Record<number, number>; }

export interface ImportBatch {
  id: string; kind: 'YAHOO_MARKET'|'PROJECTION'|'AVAILABILITY'|'CONTEXT'|'PLAYOFF';
  provider: ProviderId; season: string; importedAt: string; description: string;
  counts: { rows: number; matched: number; created: number; unmatched: number; rejected: number };
  status: 'ACTIVE' | 'SUPERSEDED' | 'REVERTED';
}
export interface ManualMapping {
  provider: ProviderId; providerKey: string;
  target: { canonicalPlayerId: string } | { ignore: true };
  createdAt: string;
}

// ---------- LEAGUE / DRAFT STATE ----------
export interface RosterSettings { active: Record<ActiveSlot, number>; bench: number; il: number; }
export interface LeagueProfile {
  id: string; name: string; season: string;
  teamCount: number; draftPosition: number; draftType: 'SNAKE';
  roster: RosterSettings; acquisitionsPerWeek: number; playoffWeeks: number[];
  primaryProjectionProvider: ProviderId; validationProviders: ProviderId[];
  createdAt: string; updatedAt: string;
}

// Draft events (R2-5 adds RESYNC and non-advancing picks)
export type DraftEvent =
  | { seq: number; at: string; type: 'PICK'; playerId: string; by: 'ME' | 'OTHER';
      advance: boolean;                        // true: consumes the current overall pick
      overallPick: number | null;              // the pick consumed (null when advance = false)
      snapshot?: { ddpRaw: number; baseValue: number; teamFit: number; label: TimingLabel } }
  | { seq: number; at: string; type: 'RESYNC'; setCurrentOverall: number; previousCurrentOverall: number };

export interface PlayerFlags { favorite: boolean; avoid: boolean; doNotDraft: boolean; lockTarget: boolean; }
export type PuntOverride = 'AUTO' | 'NONE' | 'SOFT' | 'HARD';
export interface LeagueDraft {
  leagueId: string;
  events: DraftEvent[];
  flags: Record<string, PlayerFlags>;
  puntOverrides: Partial<Record<Category, PuntOverride>>;
}

// ---------- CALCULATED (runtime only) ----------
export type TimingLabel = 'DRAFT_NOW' | 'LEAN_DRAFT' | 'WAIT' | 'SAFE_WAIT' | 'PASS';
export type SurvivalBand = 'GONE' | 'UNLIKELY' | 'TOSSUP' | 'LIKELY' | 'SAFE' | 'UNKNOWN';  // ORDINAL ONLY
export interface PlayerEvaluation {
  playerId: string;
  stats: { rawZ: Record<Category, number>; cappedZ: Record<Category, number>;
           fgImpact: number; ftImpact: number; neutral9Cat: number; neutralRank: number };
  value: { perGameVAR: number; availabilityFraction: number; missedGameLoss: number;
           expectedSeasonVAR: number; basePlayerValue: number; scaleU: number };
  availability: { score: number; risk: 'LOW'|'MODERATE'|'HIGH'|'VERY_HIGH'; terms: Record<string, number> };
  fit: { need: number; punt: number; poolScarcity: number; position: number; multiPos: number;
         redundancy: number; teamFit: number;
         perCategory: Record<Category, { need: number; punt: number; poolScarcity: number }> };
  adjustments: { playoff: number; upside: number; risk: number; userPref: number };
  ddpRaw: number; ddpRel: number; ddpScore: number; ddpRank: number;     // ← NO market input
  market: { adp: number|null; xrank: number|null; rank: number|null;
            marketRef: number|null; marketRefSource: 'ADP'|'XRANK'|'RANK'|'NONE';
            band: SurvivalBand; bandBeforeXrank: SurvivalBand; valueOverMarket: number|null;
            nextPickScarcity: number; perCategoryNextPick: Record<Category, number> };
  planning?: { pairScore: number; nextBestConservative: { playerId: string|null; ddpRaw: number; tier: 'CONSERVATIVE'|'NEUTRAL'|'FALLBACK'|'NONE' };
               missCost: number; missRel: number };
  label: TimingLabel; labelRule: string;       // which rule fired, for QA
  priority: number;
  confidence: 'HIGH'|'MEDIUM'|'LOW'; warnings: string[]; disagreement?: DisagreementReport;
}
```

---

## 4. StrategyConfig (defaults)

```ts
export const DEFAULT_STRATEGY_CONFIG = {
  version: 2,
  seasonGames: 82,

  // Numeric guards (R2-7)
  numeric: { eps: 1e-9, minPopulationSize: 30, minSdSamples: 2 },

  // Population
  fantasyPopulationBuffer: 20, populationMinGP: 20, populationMaxIterations: 8,
  replacementBandSize: 10,

  // Z-scores
  categoryZCap: 3.0, neutralTurnoverWeight: 1.0, initialTurnoverWeight: 0.75,

  // Availability-adjusted value (R2-2)
  perGameBlend: 0.5,                     // BPV = PGV + (1 − blend)·(ESV − PGV)
  replacementCoefficient: 0.35,          // share of missed games recovered at replacement level

  // Fit phase weight, indexed by k = players on my roster
  fitPhaseWeightByRosterSize: [0.0, 0.25, 0.45, 0.65, 0.85, 1.0],

  // Category profile / need
  categoryNeedWeight: 0.50,
  needStrongThreshold: 0.75, needFullDeficit: 2.0,
  categoryStateThresholds: { elite: 1.5, strong: 0.75, competitive: -0.5, weak: -1.25 },

  // Punts (R2-3)
  puntThresholds: { tendency: 0.30, soft: 0.50, hard: 0.90 },
  puntDeficitRange: { start: -0.5, full: -2.0 },
  puntCapByRosterSize: [0.0, 0.30, 0.30, 0.70, 0.70, 1.0],
  puntRampPicks: 5,
  puntScore: { recoverabilityFloor: 0.30, coherenceBase: 0.70 },  // see §6.2
  recoverability: { competitiveTarget: -0.5, recoveryPicks: 3, candidateRounds: 3 },
  hardPuntGate: { minDeficit: 0.80, minCoherence: 0.50, maxRecoverability: 0.35, minRosterSize: 6 },
  hardGateCeiling: 0.85,                 // auto π capped here unless every gate passes
  puntPriorAffinity: { TO: 0.10 },
  puntWeightCurve: [[0.40, 1.0], [0.60, 0.667], [0.75, 0.333], [0.90, 0.0]],
  multiPuntDamping: [1.0, 0.6, 0.4],
  hardPuntLimitWarnings: { hardPuntsWarn: 2, multiPuntRisk: 3 },

  // Default-build prior (tiebreaker, fades out by k = 5)
  priorCategoryPreference: { PTS: 0.05, AST: 0.05, THREES: 0.05, STL: 0.05, FT_PCT: 0.05 },
  priorDecayRosterSize: 5,

  // Scarcity (R2-4)
  poolScarcity:     { weight: 0.40, windowRounds: 3, needBlend: { base: 0.25, need: 0.75 } },   // DDP
  nextPickScarcity: { weight: 0.25, windowRounds: 2, needBlend: { base: 0.25, need: 0.75 },
                      gapFactor: { min: 0.5, max: 1.5 } },                                     // market layer

  // Positions
  positionalWeight: 0.05, positionalDangerWeight: 0.20,
  multiPositionBonus: 0.01, multiPositionBonusCap: 0.02,

  // Redundancy
  redundancyWeight: 0.25, redundancySurplusRange: { start: 1.0, full: 2.0 }, redundancyMaxFraction: 0.15,

  // Availability / risk
  historySeasonWeights: [0.5, 0.3, 0.2],
  recurrenceWeights: { LOW: 0.25, MODERATE: 0.6, HIGH: 1.0, UNCLASSIFIED: 0.75 },
  chronicPatternPenalty: 0.05, ageRiskStart: 30, ageRiskPerYear: 0.01,
  statusRisk: { HEALTHY: 0, DTD: 0.03, OUT_SHORT: 0.08, OUT_LONG: 0.20, SUSPENDED: 0.02, OUT_SEASON: 1.0 },
  unknownHistoryRisk: 0.10,
  riskBands: { low: 85, moderate: 70, high: 50 },
  riskWeightsByRound: [{fromRound:1,w:0.60},{fromRound:4,w:0.35},{fromRound:7,w:0.15},{fromRound:11,w:0.05}],
  durabilityResidualWeight: 0.5,         // R3-1: share of HISTORICAL risk applied on top of projected GP

  // Playoffs
  playoffWeight: 0.03, playoffWeekWeights: { 18: 1, 19: 1, 20: 1, 21: 1 },

  // Upside (R2-6: no age term)
  upsideScaleZ: 2.0,
  upsideWeightsByRound: [{fromRound:1,w:0.05},{fromRound:4,w:0.15},{fromRound:7,w:0.40},{fromRound:11,w:1.0}],
  minutesGrowthUpside: { minutesForMax: 10, maxScore: 0.5 },
  roleTagUpside: { STARTER_OPPORTUNITY: 0.5, INJURY_AWAY_ROLE: 0.4, DEPTH_CHART_RISE: 0.3, ROOKIE_ROLE: 0.3 },

  // User flags (DDP only)
  favoriteBonus: 0.01, avoidPenalty: 0.15,

  // Relative DDP scale (R2-7)
  relScale: { referenceRounds: 2, minSpread: 0.5 },

  // Market (R2-1: bands are ordinal)
  adpUncertainty: { minPicks: 3, fraction: 0.12 },
  survivalBandZ: { unlikely: -0.5, tossup: 0.5, likely: 1.5 },
  xrankDowngradeEnabled: true,
  unknownBandTreatAs: 'TOSSUP',
  marketTimingThresholds: {
    passBelowRel: 0.50, avoidPassBelowRel: 0.75,
    draftNowRel: 0.85, draftNowTossupRel: 0.95, draftNowTossupMissRel: 0.25,
    leanDraftRel: 0.75, leanDraftLikelyMissRel: 0.35,
  },

  // Pick-pair planning (deterministic scenarios)
  pickPair: { candidates: 10, nextDiscount: 0.85,
              conservativeBands: ['SAFE', 'LIKELY'], neutralBands: ['SAFE', 'LIKELY', 'TOSSUP'] },

  // Data quality
  disagreementThreshold: 0.75, disagreementGpThreshold: 15, pctConsistencyTolerance: 0.005,
} as const;
```

---

## 5. Statistical core (neutral; no draft state, no market data)

### 5.0 Numeric safety contract (R2-7)

Every division in the engine goes through `domain/numeric/safe.ts`:

```ts
safeDiv(num, den, fallback)   // returns fallback when |den| ≤ eps or either side is non-finite
safeSd(values)                // population SD; returns 0 when n < minSdSamples
zOrZero(x, mean, sd)          // returns 0 (and emits a DEGENERATE_CATEGORY warning) when sd ≤ eps
clamp01(x), clamp(x, lo, hi)  // NaN → lo
assertFinite(evaluation)      // dev: throws; prod: replaces non-finite with 0 and adds warning
```

Each guard and its fallback is listed in the relevant section and summarized in §12. **Contract:** every numeric field of every `PlayerEvaluation`, every category profile value and every market value is `Number.isFinite`, for any input that passes import validation.

**Engine status:** if fewer than `minPopulationSize` (30) players are eligible, the engine returns `status: 'INSUFFICIENT_DATA'` with no rankings, instead of dividing by tiny populations.

### 5.1 Percentages: volume-sensitive, makes/attempts only (unchanged)

On import, the missing field is derived: `pct = makes/attempts` if both are present, otherwise `makes = pct × attempts`. A mismatch larger than 0.5 pp raises a warning. Import validation requires attempts ≥ 0, makes ≥ 0 and makes ≤ attempts.

```
p_FG = safeDiv(Σ_Pop FGM, Σ_Pop FGA, 0)                   (league rate, never a mean of percentages)
FGImpact_i = FGM_i − p_FG · FGA_i  ≡  (FG%_i − p_FG) · FGA_i
z_FG_i = zOrZero(FGImpact_i, mean_Pop(FGImpact), safeSd_Pop(FGImpact))
```

FT is identical. A player with 0 attempts has impact 0, so his z is near 0. Team percentage is always `ΣFGM/ΣFGA`; a team with 0 FGA displays "—". Summed impact equals `ΣFGA_team·(teamFG% − p_FG)`, so adding impact z-scores is consistent with makes/attempts aggregation.

### 5.2 Counting z-scores (unchanged)

```
z_ic  = zOrZero(x_ic, μ_c, σ_c)          PTS REB AST STL BLK THREES
z_iTO = −zOrZero(x_iTO, μ_TO, σ_TO)       (lower TO → positive)
ẑ_ic  = clamp(z_ic, −3, +3)               raw z is kept
```

### 5.3 Fantasy population (unchanged)

```
rosterSize = Σ active + bench (13) ; P = N·rosterSize + buffer (202)
Eligible   = players with a primary projection and GP ≥ 20
iteration 0: μ, σ, p over all Eligible;  then repeat ≤ 8:
   Pop' = top min(P, |Eligible|) by neutral9Cat (Σ raw z, TO = 1.0; tiebreak canonicalPlayerId)
   recompute μ, σ, p over Pop'; stop at the membership fixed point (else: last iteration + warning)
```

The population is computed on the full pool, so drafting never changes z-scores.

### 5.4 Value above replacement and availability (R2-2, rewritten)

```
b_c   = 1 for all c except b_TO = 0.75
PG_i  = Σ_c b_c · ẑ_ic
R     = mean PG over players ranked P+1 … P+10 by PG
        guard: if |Eligible| ≤ P, R = min PG over the population (conservative) + warning
PGV_i = PG_i − R                                     per-game value above replacement

a_i   = clamp(safeDiv(projectedGP_i, seasonGames, 0), 0, 1)       availability fraction
```

**Loss for an unreplaced game.** When a missed game is not streamed, the team loses what a replacement-level player would have produced. That loss is measured only in the positive counting categories, where a zero line truly produces nothing:

```
L = Σ_{c ∈ {THREES,PTS,REB,AST,STL,BLK}} safeDiv(μ^repl_c, σ_c, 0)      (μ^repl = replacement-band mean per game)
L ≥ 0 always (stats ≥ 0, σ ≥ 0)
```

TO, FG% and FT% are **deliberately excluded** from `L`:

- An empty game has no attempts, so FG% and FT% are unaffected.
- The fact that an empty game has zero turnovers is never counted as value.

This removes the rev-1 flaw, where the zero line's positive TO z-score offset part of the loss.

**Expected season value:**

```
LossPerMissedGame_i = max(PGV_i, 0) + (1 − r) · L                       r = replacementCoefficient
ESV_i = PGV_i − (1 − a_i) · LossPerMissedGame_i
```

Interpretation:

- **A missed game replaced by a streamer (share r)** is worth replacement level: 0 above replacement. The team loses the player's own surplus, `max(PGV, 0)`.
- **An unreplaced missed game (share 1 − r)** additionally loses the replacement contribution `L`.
- **For PGV ≥ 0** this equals `a·PGV − (1−a)(1−r)·L`.
- **For PGV < 0** (a below-replacement player), the model does **not** credit missing games. The streamer upside is ignored rather than treating absence as a gain.

**Properties (tested):**

- `LossPerMissedGame ≥ 0`, so `∂ESV/∂a ≥ 0`. More missed games can never raise value.
- A player's TO projection does not enter `L` or `LossPerMissedGame` at all.
- `a = 1` gives `ESV = PGV`.

### 5.5 Base Player Value (unchanged structure)

```
BPV_i = PGV_i + (1 − 0.5) · (ESV_i − PGV_i)          (no ADP, no roster, no round)
U_i   = max(BPV_i, 1.0)                              (scale for %-style modifiers; ≥ 1 so never 0)
Neutral9Cat_i = Σ raw z (TO = 1.0)                    (displayed neutral rank)
```

---

## 6. Roster context

### 6.1 Category profile (guards added)

Cohort j is the players at BPV ranks `(j−1)N+1 … jN` of the population. If a cohort would be empty, it reuses the last non-empty cohort.

```
s_c    = Σ_{i∈roster} ẑ_ic
B_c(k) = Σ_{j=1..k} mean_cohort_j(ẑ_c)
σT_c(k) = √k · safeSd_{top N·rosterSize by BPV}(ẑ_c)
d_c    = k = 0 ? 0 : safeDiv(s_c − B_c(k), σT_c(k), 0)
```

States:

| State | Condition |
|---|---|
| ELITE | d ≥ 1.5 |
| STRONG | d ≥ 0.75 |
| COMPETITIVE | d ≥ −0.5 |
| WEAK | d ≥ −1.25 |
| CRITICAL | d < −1.25 |
| SOFT PUNT / PUNT | overrides the above based on π |

The dashboard shows real ΣM/ΣA percentages and per-game totals. `d_c` values are shown in Debug.

### 6.2 Punt confidence with recoverability (R2-3, rewritten)

Four evidence components, each in [0, 1]:

**1. Deficit:**
```
D_c = clamp((−0.5 − d_c) / 1.5, 0, 1)
```

**2. Coherence.** Are the categories that naturally trade off against c strong on this roster?
```
ρ_cc' = Pearson corr(ẑ_c, ẑ_c') over the population       (0 if either SD ≤ eps)
Coh_c = safeDiv( Σ_{c'≠c} max(0, −ρ_cc') · clamp(d_c'/1.5, 0, 1) ,  Σ_{c'≠c} max(0, −ρ_cc') , 0 )
```

**3. Recoverability.** Could the remaining picks realistically bring c back to competitive? This is computed from the neutral pool only, with no ADP.

```
Required_c = max(0, (B_c(k) + t · σT_c(K)) − s_c)          t = −0.5
             (the shortfall versus the competitive line, assuming average picks from here on)
Cand       = top (candidateRounds · N = 42) AVAILABLE players by BPV     (draftable soon without reaching)
m          = min(K − k, recoveryPicks = 3)
Gain_c     = Σ over the m players of Cand with highest ẑ_c of
             max(0, ẑ_jc − mean_cohort_{k+j}(ẑ_c))       (improvement over an average pick in that round)
Rec_c      = Required_c ≤ eps ? 1 : clamp(safeDiv(Gain_c, Required_c, 0), 0, 1)
Irr_c      = 1 − Rec_c
```

**4. Progress:**
```
S_k   = min(1, k / 5)
cap_k = [0, .30, .30, .70, .70, 1.0][min(k, 5)]
```

**Combining them:**

```
score_c = D_c · (0.30 + 0.70 · Irr_c) · (0.70 + 0.30 · Coh_c) + 0.10·[c = TO ∧ D_c > 0]
π_auto_c = min(cap_k, S_k · clamp(score_c, 0, 1))

HARD gate: π_auto_c may exceed hardGateCeiling (0.85) only if ALL of
    D_c ≥ 0.80  ∧  Coh_c ≥ 0.50  ∧  Rec_c ≤ 0.35  ∧  k ≥ 6
otherwise π_auto_c = min(π_auto_c, 0.85)

Multi-punt resistance: rank categories by π_auto desc; π_c = π_auto_c · [1.0, 0.6, 0.4][rank]
User override (per league): NONE → 0 · SOFT → max(π, 0.60) · HARD → 1.0     (the gate applies only to AUTO)
```

**Why weakness alone can no longer cause a punt:**

- If the category is fully recoverable (`Irr = 0`), then `score ≤ D · 0.30 · 1.0 ≤ 0.30`. That can reach "tendency" but never "soft punt" (0.50), even with maximum deficit and coherence.
- **Breaking the self-reinforcing loop.** Punting lowers need, which leads to skipping the category, which widens the deficit. That loop is stopped because recoverability is measured against the available pool, not against the roster's own weights. While supply remains, `Rec` stays high and π stays low, so the need term keeps pushing for a rescue.
- A soft punt requires an unrecoverable deficit, a coherent build, or both. For example, with `D = 1`, `Irr = 1` and `Coh = 0`, the score is 0.70.
- **Hard punt needs all four:**
  - `D ≥ 0.80` (big deficit)
  - `Coh ≥ 0.50` (the build naturally sacrifices c)
  - `Rec ≤ 0.35` (it can't realistically be rescued)
  - `k ≥ 6` (enough of the draft has happened)
- π never feeds back into its own inputs: D, Coh and Rec do not use `m_c`.

Labels: π ≥ 0.30 tendency, ≥ 0.50 soft, ≥ 0.90 hard. Warnings (from `π_auto` before damping): two hard → warning; three or more soft-or-higher → **MULTI-PUNT BUILD RISK**. Nothing is ever blocked.

Punt multiplier:

```
m_c = interp(π_c; (0.40,1.0),(0.60,0.667),(0.75,0.333),(0.90,0.0)); 1 below 0.40, 0 above 0.90
effective TO weight = 0.75 · m_TO → 0.75 / 0.50 / 0.25 / 0
```

### 6.3 Category need (unchanged)

```
φ_k    = [0, .25, .45, .65, .85, 1.0][min(k,5)]
need_c = clamp((0.75 − d_c)/2.0, 0, 1) · m_c + prior_c · max(0, 1 − k/5)
NeedAdj_i = 0.50 · φ_k · Σ_c b_c · need_c · ẑ_ic
```

### 6.4 Punt synergy (unchanged)

```
PuntAdj_i = φ_k · Σ_c b_c · (m_c − 1) · ẑ_ic
```

Raw and capped z-scores are never modified.

### 6.5 Redundancy (unchanged)

```
surplus_c = clamp((d_c − 1.0)/1.0, 0, 1) ; gate = min(1, Σ_c need_c)
RedAdj_i  = − min(0.15·U_i, 0.25 · φ_k · gate · Σ_c surplus_c · max(ẑ_ic, 0))
```

### 6.6 Scarcity, split in two (R2-4, rewritten)

Shared definitions:

```
zRepl_c  = mean ẑ_c of the replacement band (§5.4)
Supply_c(X) = Σ_{i∈X} max(ẑ_ic − zRepl_c, 0)
```

#### (a) POOL SCARCITY: part of DDP, never reads market data

This asks whether the category's quality supply in the remaining neutral pool has been depleted faster than the other categories.

```
Wp        = poolScarcity.windowRounds · N                              (= 42)
PoolNow   = top Wp AVAILABLE players by BPV (tiebreak canonicalPlayerId)
PoolStart = top Wp of the FULL eligible pool by BPV                    (static baseline)
rP_c      = Supply_c(PoolStart) ≤ eps ? 1 : Supply_c(PoolNow) / Supply_c(PoolStart)
meanP     = mean_c(rP_c)
qP_c      = meanP ≤ eps ? 0 : clamp(1 − rP_c / meanP, 0, 1)
PoolScarAdj_i = 0.40 · Σ_c qP_c · m_c · (0.25 + 0.75·need_c) · max(ẑ_ic − zRepl_c, 0)
```

Inputs: projections, BPV, and the set of drafted players. **No ADP, XRank or Rank.** Changing any market field leaves `qP`, `PoolScarAdj`, DDP and BPV bit-for-bit identical.

#### (b) NEXT-PICK SCARCITY: market layer only, uses Yahoo L7 ADP

This asks which categories will drain across the gap before my next pick, according to the market.

```
MarketOrder = AVAILABLE players sorted by marketRef asc (ADP → XRank → Rank fallbacks; missing → last
              by BPV; tiebreak canonicalPlayerId)
g   = picks by others before my next pick (§8.1)
Wn  = nextPickScarcity.windowRounds · N                                  (= 28)
Now   = MarketOrder[0 : Wn]
Reach = MarketOrder[g : g + Wn]
rN_c  = Supply_c(Now) ≤ eps ? 1 : Supply_c(Reach) / Supply_c(Now)
meanN = mean_c(rN_c)
qN_c  = meanN ≤ eps ? 0 : clamp(1 − rN_c / meanN, 0, 1)
gf    = clamp(safeDiv(g, N, 0), 0.5, 1.5)
NextScarAdj_i = 0.25 · gf · Σ_c qN_c · m_c · (0.25 + 0.75·need_c) · max(ẑ_ic − zRepl_c, 0)
```

`NextScarAdj` is **not** part of DDP. It feeds pick-pair scoring, miss cost, priority and the advisor (§8). Both q vectors are shown per category in Debug.

### 6.7 Positions (unchanged, guarded)

Active slots:

```
PG→{PG}  SG→{SG}  G→{PG,SG}  SF  PF  F→{SF,PF}  C×2  UTIL×2
```

The bench accepts anyone. IL is not drafted.

```
R_left = K − k ; MaxMatch = augmenting-path bipartite matching
Feasible   = MaxMatch(roster ∪ R_left wildcards) == activeSlots
required_p = activeSlots − MaxMatch(roster ∪ R_left dummies eligible for all positions except p)
u_p = R_left > 0 ? clamp(required_p / R_left, 0, 1) : 0      u_i = max_{p∈elig_i} u_p
PosAdj_i      = U_i · [0.05·u_i + 0.20·max(0, (u_i − 0.5)/0.5)]
MultiPosAdj_i = U_i · min(0.02, 0.01·(|positions_i| − 1))
```

### 6.8 Availability / durability (split into historical and current components in rev 3)

```
wMiss_s = Σ_abs games·recurrenceWeight / teamGames_s     (or (1 − GP/teamGames)·0.75 without detail)
          import validation: teamGames > 0, 0 ≤ GP ≤ teamGames
H = Σ w_s·wMiss_s / Σ w_s over seasons present            (no seasons → 0.10, flagged)

ρ_hist_i = H + Chronic(0.05) + 0.01·max(0, age−30)        historical / structural durability
ρ_now_i  = statusRisk[currentStatus] + manualRiskDelta     current status + explicit user judgment
ρ_i      = clamp(ρ_hist_i + ρ_now_i, 0, 1)                 full risk index (display)
AvailabilityScore = round(100·(1 − ρ_i));  ≥85 LOW, ≥70 MODERATE, ≥50 HIGH, else VERY HIGH
```

The Availability Score and risk label show the **full** risk index, so the user sees the complete durability picture. Projected GP stays excluded from ρ. It is priced by `a_i` in §5.4.

### 6.9 Round-dependent risk with a residual durability weight (R3-1)

Projection providers (Hashtag, BBM and others) often already lower a player's projected GP because of his injury history. That lower GP is priced by ESV through `a_i`. Applying the whole historical risk index again in RiskAdj would punish the same injury history twice. Rev 3 applies only a **residual** share of the historical component:

```
ρ_eff_i  = clamp(durabilityResidualWeight · ρ_hist_i + ρ_now_i, 0, 1)      durabilityResidualWeight = 0.5
RiskAdj_i = − riskWeight(round) · ρ_eff_i · U_i       0.60 / 0.35 / 0.15 / 0.05 (R1–3 / 4–6 / 7–10 / 11+)
```

- **What this term means.** `RiskAdj` represents downside and tail risk *beyond* the primary projection's GP assumption. Examples: a recurrence that wipes out a whole season rather than the expected 15–20 games, playoff-week absences, or a recovery timeline that slips. It is **not** a second estimate of expected missed games.
- **The residual weight applies only to history** (H, chronic pattern, age). Current status and the manual risk delta are applied in full. A projection made before a new injury may not reflect it, and a manual delta is explicit user judgment.
- **`durabilityResidualWeight` is configurable:**
  - 0 → trust the projection's GP entirely.
  - 1 → rev-2 behavior, the full historical index on top of GP.
- **This term is never positive.** Durability alone never adds value.
- **Debug shows** `ρ_hist`, `ρ_now`, `ρ_eff`, the residual weight, the round weight, and the resulting RiskAdj, next to the ESV availability loss. That makes the two separate availability effects visible side by side.

### 6.10 Playoffs (guarded)

```
G_team = Σ_w weekWeight_w · games_w(team)
PlayoffAdj_i = sd_teams(G) ≤ eps ? 0 : U_i · clamp(0.03 · (G_team − mean G)/(2·sd G), −0.03, 0.03)
```

### 6.11 Upside (R2-6, rewritten, with no age term)

Age is **not** an upside input. It is used only in availability risk (§6.8). Upside comes only from supplied evidence:

```
minutesSignal = (mpg_proj and previousSeasonMpg both supplied)
                ? clamp((mpg_proj − previousSeasonMpg) / 10, 0, 1) · 0.5 : 0
roleSignal    = max over supplied roleTags of roleTagUpside[tag]            (none → 0)
upsideScore_i = max(manualUpside ?? 0, providerUpside ?? 0, minutesSignal, roleSignal)   ∈ [0, 1]
UpsideAdj_i   = upsideWeight(round) · upsideScore_i · 2.0      (.05 / .15 / .40 / 1.0 by round band)
```

With no supplied data, the upside is exactly 0 and the Debug panel shows "no upside evidence".

---

## 7. Dynamic Draft Priority

```
TeamFit_i = NeedAdj_i + PuntAdj_i + PoolScarAdj_i + PosAdj_i + MultiPosAdj_i + RedAdj_i
DDP_raw_i = BPV_i + TeamFit_i + PlayoffAdj_i + UpsideAdj_i + RiskAdj_i + UserPrefAdj_i
UserPrefAdj_i = +0.01·U_i (favorite)  −0.15·U_i (avoid)      Do-Not-Draft → excluded from candidates
```

**DDP reads no market field** (ADP, XRank or Rank). This is a stronger invariant than rev 1: changing ADP leaves DDP identical.

### Relative DDP and display (R2-7)

Rev 1 used the ratio `DDP / top`, which breaks when the top value is ≤ 0 late in the draft. Rev 2 replaces it with a gap-based scale:

```
top     = max DDP_raw over available candidates
ref     = DDP_raw of the candidate at DDP rank min(2N, |candidates|)
S       = max(top − ref, minSpread = 0.5)                     (always ≥ 0.5 → never 0)
ddpRel_i   = clamp(1 − (top − DDP_raw_i) / S, 0, 1)          (1 = best available; 0 = at/below the 2N-th)
ddpScore_i = round(100 · ddpRel_i)                           (display only)
```

This is finite for any sign of DDP, any spread, and a single candidate (where top = ref, so S = 0.5 and rel = 1). With no candidates, the result is an empty list plus an advisor message.

Phase dependence:

- Need, punt, pool scarcity and redundancy are scaled by φ_k.
- Risk and upside are scaled by round.
- Position is scaled by `R_left`.

`compare(A, B)` prints the term-by-term difference.

---

## 8. Market layer: resync, bands, next-pick scarcity, pick-pair, labels

### 8.1 Pick state and manual resync (R2-5)

```
userPicks(N, D, K): round r → pickInRound = r odd ? D : N − D + 1 ; overall = (r−1)·N + pickInRound
totalPicks = N·K

replay(events):
  current = 1
  for e in events:
    PICK advance=true  → e.overallPick = current (recorded at dispatch); current += 1
    PICK advance=false → no change to current (the player is only marked unavailable)
    RESYNC             → current = e.setCurrentOverall      (validated 1 … totalPicks + 1)
  drafted = all PICK players ; myRoster = PICK where by = ME (in event order)

P0 = first user pick ≥ current  (= current when on the clock) ; P1 = first user pick > P0
g  = (P0 == current) ? P1 − P0 − 1 : P0 − current            (picks by others before my next pick)
gapType = g + 1 > N ? 'LONG' : g + 1 < N ? 'SHORT' : 'EVEN'
draftComplete = P0 undefined
```

Worked check, N = 14, D = 11: 11, 18, 39, 46, 67, 74, 95, 102, 123, 130, 151, 158, 179.

**Resync UX:**

- A "Current Yahoo pick #" field in the Draft header, with a "Resync" button, dispatches `RESYNC`.
- After a resync, the user can catch up on missed players with "Mark taken (no advance)", which dispatches `PICK advance=false`. These change availability without moving the pick pointer.
- **Consistency indicator.** `accounted = number of advancing picks` is compared with `current − 1`. Any difference is shown as "N picks not recorded". This is informational only and never blocks.
- `RESYNC` and non-advancing picks are ordinary events, so undo reverts them exactly.
- My own picks join my roster whatever their pick number. Drafting to my team off-schedule raises an "off-schedule pick" warning.
- **Changing draft position** changes only `userPicks`. Events are untouched, so P0, P1 and g are recomputed.

### 8.2 Survival bands (R2-1: ordinal heuristic, not probability)

`marketRef` = ADP₇d, falling back to XRank, then Rank (each fallback flagged). Import validation requires `marketRef > 0`.

```
w  = max(3, 0.12 · marketRef)                        (≥ 3 → never 0)
zS = (marketRef − P1) / w
GONE     if marketRef < current − w
UNLIKELY if zS ≤ −0.5
TOSSUP   if −0.5 < zS ≤ 0.5
LIKELY   if 0.5 < zS ≤ 1.5
SAFE     if zS > 1.5
UNKNOWN  if marketRef is null        (treated as TOSSUP for tier membership; label capped at LEAN DRAFT)
XRank downgrade: band ∈ {LIKELY, SAFE} and XRank < P1 → one band lower (both bands kept for Debug)
```

**Bands are an ordered enum:** GONE < UNLIKELY < TOSSUP < LIKELY < SAFE. The engine only compares bands and tests set membership. It never converts a band to a number, weight or percentage, and the UI never displays one.

### 8.3 Pick-pair planning: deterministic band-tier scenarios (R2-1, rewritten)

```
Candidates = top 10 non-DND available players by DDP_raw (tiebreak canonicalPlayerId)

Tier sets at my next pick P1 (bands computed once, from market data only):
  CONSERVATIVE = {j : band_j ∈ {SAFE, LIKELY}}
  NEUTRAL      = {j : band_j ∈ {SAFE, LIKELY, TOSSUP}}        (UNKNOWN counts as TOSSUP)
  FALLBACK     = MarketOrder[g :]                              (anyone the market leaves past the gap)

NextBest(roster', pool'):
  evaluate DDP'_j for every j in pool' against roster'    (need, punts, pool scarcity, positions updated)
  first non-empty tier in order CONSERVATIVE → NEUTRAL → FALLBACK:
      return (argmax DDP'_j in tier, its DDP', tier name)
  if all are empty: return (null, 0, 'NONE') + warning

For each candidate X:
  (bX, vX, tierX) = NextBest(roster ∪ {X}, available \ {X})
  PairScore(X) = DDP_raw(X) + NextScarAdj(X) + 0.85 · vX

  (b¬X, v¬X, _)  = NextBest(roster, available \ {X})           (X is gone and I took nothing yet)
  MissCost(X)    = DDP_raw(X) + NextScarAdj(X) − v¬X            (what I lose if X doesn't come back)
  missRel(X)     = MissCost(X) / S                              (S from §7, ≥ 0.5)

Recommended = argmax PairScore (tiebreaks: DDP_raw, then canonicalPlayerId)
Priority    = PairScore for the 10 candidates, ranked first; everyone else follows by DDP_raw
```

Why this is deterministic and non-probabilistic:

- The scenario is "what is the best player I can reasonably expect at my next pick", where "reasonably expect" is an ordinal tier rule.
- **Snake-gap behavior.** Long gaps push more players into UNLIKELY and TOSSUP, which shrinks the CONSERVATIVE set and lowers `v`. That raises MissCost, so the engine becomes more aggressive. Short gaps do the reverse.
- **The spec's market fixture:**
  - Taking A (UNLIKELY) now keeps B (SAFE) in the CONSERVATIVE set, so `PairScore(A) ≈ 95 + 0.85·93`.
  - Taking B now leaves A outside the CONSERVATIVE set, so `v_B` < 95 and `PairScore(B) < PairScore(A)`.
  - A is therefore recommended.
- **Cost:** about 11 fit re-evaluations of about 500 players each, which stays within the 100 ms budget. This is verified by the perf test.

### 8.4 Timing labels (thresholds in config; ordinal band rules)

The first matching rule wins, and the rule ID is recorded in `labelRule`.

```
P1  PASS        ddpRel < 0.50, or (Avoid-flagged and ddpRel < 0.75)
D1  DRAFT NOW   ddpRel ≥ 0.85 and band ∈ {GONE, UNLIKELY}
D2  DRAFT NOW   ddpRel ≥ 0.95 and band = TOSSUP
D3  DRAFT NOW   ddpRel ≥ 0.85 and band = TOSSUP and missRel ≥ 0.25
L1  LEAN DRAFT  ddpRel ≥ 0.75 and band ∈ {GONE, UNLIKELY, TOSSUP, UNKNOWN}
L2  LEAN DRAFT  band = LIKELY and missRel ≥ 0.35
S1  SAFE WAIT   band = SAFE
W1  WAIT        otherwise
UNKNOWN band can never produce D1–D3.
```

Checks against the spec examples:

- Pick 67 with next pick 74. A: ADP 69 → zS = −0.6 → UNLIKELY → **D1 DRAFT NOW**. B: ADP 95 → zS = 1.84 → SAFE → **S1 SAFE WAIT**.
- Rank 31, ADP 33, current 25, next 52 → UNLIKELY → DRAFT NOW.
- Rank 45, ADP 83 → SAFE → SAFE WAIT.

### 8.5 Value over market (display only)

```
ourOverallRank = (current − 1) + ddpRank ; VOM = marketRef − ourOverallRank   (null if no marketRef)
```

---

## 9. Strategy Advisor (unchanged)

The advisor uses deterministic templates:

- header: pick, round, P1, gap type
- build line: strongest punt, π, and whether it is recoverable
- priority: top 3 categories by `need_c · (1 + qP_c + qN_c)`
- a reason sentence
- RECOMMENDED: argmax PairScore, with its top positive terms and the band name
- AVOID THIS ROUND: categories in surplus

Warnings are prepended:

- multi-punt
- infeasible roster
- "N picks not recorded" (resync)
- INSUFFICIENT_DATA

---

## 10. Data import, identity, confidence (unchanged)

- **Pipeline:** PapaParse → column mapping presets → Zod row validation → identity reconciliation → preview/report → a single atomic Dexie transaction.
- **Batches are versioned** with an active pointer, and can be reverted. Yahoo stat columns are a separate projection provider `yahoo`, never merged into market fields.
- **Normalization:** NFD with diacritics stripped, lowercase, suffixes removed, punctuation removed, hyphens turned into spaces, whitespace collapsed.
- **Matching order:** manual mapping → provider ID → name + team → alias → unique name only → review queue. Nothing is merged automatically. Fuzzy matches are suggestions only. Manual mappings persist and are applied first.
- **Disagreement:**
  ```
  Δ = safeDiv(|N9_primary − N9_validation|, sd_Pop(N9), 0)
  ```
  The player is flagged when Δ > 0.75 or |ΔGP| > 15. If sd = 0, Δ is 0 and a DEGENERATE warning is raised.
- **Confidence:**
  - HIGH = primary projection + market + history
  - MEDIUM = no history
  - LOW = incomplete projection or unresolved disagreement

  Players without a primary projection are not ranked and are never treated as average.
- **Import validation** rejects non-finite numbers, negative stats and attempts, makes > attempts, GP outside [0, seasonGames], teamGames ≤ 0, marketRef ≤ 0, and unknown positions.

---

## 11. Persistence and resilience (unchanged)

- A `Repository` interface, implemented by Dexie and by an in-memory repository.
- Synchronous in-memory updates with asynchronous write-through and a save-status badge.
- Versioned JSON backup and restore, validated with Zod.
- A hand-written service worker for app-shell caching.
- Security headers in `vercel.json`. No `dangerouslySetInnerHTML` and no secrets.
- Supabase stays a documented Phase 2 sync layer (RLS, anon key only).

---

## 12. Test plan

### 12.1 Unit and fixture tests carried over from rev 1

- **Snake:** positions 1, middle and N for N ∈ {10, 12, 14}; the 14/11 sequence; gap type; P0/P1 on and off the clock.
- **Percentages:** 91 %/1 FTA versus 89 %/9 FTA (B has far higher impact), the same for FG, and team ΣM/ΣA aggregation, including that summed impact z equals the makes/attempts form.
- **Other areas:** population fixed point; z and TO inversion; cap preserves raw; need fixture; punt fixture; position feasibility; availability score; round risk; playoff; DDP; labels; undo; identity normalization; CSV validation; reconciliation.
- **Deviation fixture:** the engine recommends A, the user drafts B, and the next evaluation equals a fresh evaluation of the roster containing B.

### 12.2 Tests required by the Codex rev-2 review

| ID | Test | Assertion |
|---|---|---|
| T-ADP-1 | **Changing ADP does not change pool scarcity** | For a fixture pool and roster, change one or several players' `yahooAdp7d`, `yahooXRank` and `yahooRank` (including randomized permutations, with a seeded RNG). `qP_c`, `PoolScarAdj_i`, `BPV_i`, `TeamFit_i` and `DDP_raw_i` are **deep-equal** for every player. |
| T-ADP-2 | **Changing ADP may change next-pick scarcity and urgency** | Build a fixture where every AST-strong player has ADP inside the gap (P0 < ADP < P1). Moving their ADP past `P1 + Wn` changes `qN_AST` from > 0 to 0, changes `NextScarAdj`, moves the band from UNLIKELY to SAFE, and moves the label from DRAFT NOW to SAFE WAIT. DDP is unchanged throughout (T-ADP-1 holds in the same test). |
| T-PUNT-REC-1 | **Weak but recoverable category does not become a hard punt** | Roster with k = 7 and d_AST = −2.5 (D = 1), with a strongly coherent build. The available pool contains many high-AST players within the BPV candidate set, so Rec_AST = 1. Assert `π_AST < 0.50` (not even soft), `need_AST > 0`, and that an AST player's NeedAdj is positive. |
| T-PUNT-REC-2 | Hard punt requires all four gates | From a fixture that passes every gate (π ≥ 0.90), flip one gate at a time: Rec to 0.5, Coh to 0.3, k to 5, D to 0.7. Each flip makes `π ≤ 0.85` (not hard). |
| T-PUNT-REC-3 | No self-reinforcing loop | Simulate 6 consecutive picks that ignore AST while AST supply stays abundant. π_AST never reaches soft, because Rec stays high. |
| T-MISS-1 | **A missed game cannot gain value from zero turnovers** | (a) Two players with the same PGV ≥ 0 but very different TO (0.5 versus 4.0 per game; PTS adjusted so that PGV matches) have identical `LossPerMissedGame` and identical ESV at every a. (b) For every player, ESV is non-increasing as GP falls (grid a = 1.0 … 0.0), and ESV at a < 1 never exceeds ESV at a = 1. (c) A synthetic "all-zero" player gets no positive value from its zero TO once missed games are applied. |
| T-MISS-2 | Monotonicity for below-replacement players | For PGV < 0, ESV(a) is non-decreasing in a. Missing games never helps. |
| T-MISS-3 | L excludes TO and percentages | Changing replacement-band TO, FGA or FTA leaves `L` unchanged. Changing replacement-band PTS changes it. |
| T-RESYNC-1 | **Manual resync restores next-pick calculations** | 14 teams, D = 11. Record only 60 of 66 actual picks, so local current = 61 while Yahoo is at 67. Then RESYNC to 67: P0 = 67, P1 = 74, g = 6, gapType SHORT; bands and labels equal a reference state that recorded all 66 picks with the same availability. "Mark taken (no advance)" of the 6 missing players leaves current at 67. Undo of RESYNC restores current = 61 exactly (deep-equal). |
| T-RESYNC-2 | Resync bounds and draft-position change | RESYNC outside 1 … N·K + 1 is rejected. Changing draft position after a resync recomputes P0 and P1 from the same current. |
| T-FINITE-1 | **All normalization is finite on pathological data** | Seeded generator plus hand-made datasets: all-identical players (σ = 0 in every category); one category constant; zero FGA or FTA for everyone; exactly 30 eligible players; fewer than 30 (expects INSUFFICIENT_DATA); P larger than the pool; a single available player; all DDP negative; all DDP equal; everyone missing ADP; GP = 0; replacement band empty; playoff games identical for all teams; no history anywhere; extreme values (1e6 stats). For each: every numeric output is `Number.isFinite`, rel is in [0, 1], score is in [0, 100], labels are valid enums, and there is no throw. |
| T-FINITE-2 | Guard unit tests | `safeDiv`, `safeSd` and `zOrZero` at eps boundaries; `S ≥ minSpread`; scarcity ratios with zero baselines; coherence with all-positive correlations (zero denominator); Rec with `Required = 0`. |
| T-DUR-1 | **Durability calibration: rounds 1–3** | Fixtures: **Elite-Fragile** (PGV ≈ 8.0, GP 62, high-recurrence history → ρ_hist ≈ 0.35), **Good-Solid** (PGV ≈ 6.0, GP 72, ρ_hist ≈ 0.12), **Durable-Lower** (PGV ≈ 4.5, GP 78, ρ_hist ≈ 0.03), all with neutral fit. In round 1: (a) Elite-Fragile's DDP > Durable-Lower's; (b) Elite-Fragile's combined availability penalty (ESV loss + RiskAdj) is a moderate share of its PGV (15–40 %), so it is neither ignored nor crushed; (c) the Elite-Fragile vs Good-Solid DDP gap is materially smaller than their per-game gap (the model is moderately aggressive about durability). |
| T-DUR-2 | Residual weight is honored | Raising `durabilityResidualWeight` from 0 → 0.5 → 1.0 makes Elite-Fragile's RiskAdj strictly more negative and never changes ESV. At 0, RiskAdj depends only on ρ_now. `ρ_now` (for example OUT_LONG) is applied in full regardless of the weight. |
| T-DUR-3 | Round dependence | The same trio in round 12: the risk terms shrink (weight 0.05), and the ordering follows BPV (ESV blend) alone. Elite-Fragile's RiskAdj in round 1 is at least 10× its round-12 RiskAdj. |
| T-BAND-1 | Bands are ordinal | Static check: `survivalBands.ts` exports no numeric mapping. Changing a player's zS within the same band leaves PairScore, MissCost and label unchanged. |

### 12.3 Invariant suite (§53 / §60)

| Change | Must hold |
|---|---|
| ADP / XRank / Rank | BPV, pool scarcity and DDP identical; band, next-pick scarcity, priority and label may change |
| Draft position or resync | stats, BPV and DDP identical (roster unchanged); P0, P1, g, bands and labels may change |
| Primary provider | market fields identical |
| Punt override | rawZ and cappedZ identical; `m_c` and TeamFit change |
| Flags | stats, BPV and TeamFit identical; only UserPrefAdj and DDP change |
| Undo | state is deep-equal to the pre-action state |
| League isolation | League A events never appear in League B evaluation |
| Other teams' picks | a player drafted by others keeps his source data unchanged |

### 12.4 Performance and E2E

- **Performance:** a full `evaluateDraft`, including pick-pair, on 500 players under 100 ms, with CI headroom.
- **E2E (§51 Playwright):** the spec scenario plus a resync step: skip marking two picks, resync, mark them taken without advancing, and verify the next-pick panel.

---

## 13. Ambiguities and assumptions

| # | Topic | Proposed resolution |
|---|---|---|
| A1 | BPV composition | BPV = stats + availability-adjusted value above replacement. Position and round risk are applied once, in DDP. |
| A2 | Rounds | K = active + bench = 13. IL is not drafted. |
| A3 | Pick recording | Sequential advancing picks, plus RESYNC and non-advancing picks (R2-5). No keepers or traded picks in v1. |
| A4 | Config scope | One global StrategyConfig. Providers and punt overrides are per league. |
| A5 | GP versus durability | GP is priced in ESV through `a`. The durability score ρ covers recurrence and tail risk and excludes GP. |
| A6 | History input | CSV per player-season, with manual recurrence classification. No diagnosis inference. |
| A7 | Positions | Yahoo eligibility is authoritative. Otherwise provider positions are used, flagged. |
| A8 | Playoff schedule | Team-level CSV. Missing data → 0 adjustment. |
| A9 | Upside | **Revised:** no age term. Only manual, provider, minutes-growth (when both MPG values are supplied) and role-tag inputs count. |
| A10 | Non-TO punt curve | Same π→m curve relative to weight 1.0. |
| A11 | ADP spread | Band width max(3, 12 % of ADP), used only for ordinal band boundaries. |
| A12 | ADP reach | **Revised:** ADP affects only the market layer (bands, next-pick scarcity, pick-pair tiers, labels, priority). DDP and pool scarcity are ADP-free. |
| A13 | Rank display | Neutral rank (raw z, TO = 1) and BPV are both shown. |
| A14 | Framework | Next.js static export, Dexie, hand-written service worker, no Supabase code in v1. |
| A15 | Sample data | Fictional seeded dataset only. |
| A16 | Weights | Starting values. One calibration pass is expected on real data. |
| A17 | New: recoverability horizon | Recovery assumes up to 3 dedicated picks drawn from the top 3N available players by BPV. It ignores the BPV cost of those picks. A known simplification, conservative toward *not* punting. |
| A18 | New: minutes-growth upside | Needs both projected MPG and previous-season MPG. Otherwise the signal is 0 (never inferred). |
| A19 | Rev 3: residual durability | Provider GP is assumed to already contain some injury-history discount. Only 50 % of historical risk is applied again as tail risk (configurable). |

---

## 14. Known limitations and future calibration

1. **One replacement coefficient for every absence (R3-2).** v1 uses a single `replacementCoefficient` (0.35) for all missed games. In reality, absence types stream differently:
   - **Extended, predictable absences** (a multi-week injury announced in advance) are *more* replaceable. The player can move to an IL slot and a streamer or pickup fills a full active slot for weeks.
   - **Sporadic DTD, rest or load-management absences** are *less* replaceable. They are often announced close to tip-off, and within 4 weekly acquisitions in a 14-team league they rarely produce a usable streamer.

   A future calibration could split the coefficient by absence type (for example `r_extended` and `r_sporadic`), weighted by the player's historical absence mix and IL availability. v1 deliberately does **not** build an absence simulator.
2. **Durability residual weight** (0.5) is a judgment prior, not a fitted value. Calibrate it once real provider GP and three-season history are available. For example, check how much of the historical miss rate the primary provider's GP already embeds.
3. **Default weights** (A16) need one calibration pass on real Hashtag and Yahoo data.
4. **The recoverability heuristic** (A17) ignores the BPV cost of rescue picks.
5. **Survival bands** use an assumed ADP spread (A11), because Yahoo L7 ADP gives no distribution.
6. **Pick-pair planning** looks only one user pick ahead.


**Awaiting Codex review before implementation.**

---

## 15. Implementation notes (post-approval)

The implemented formulas and the calibrations made while building are documented in `STRATEGY_ENGINE.md` §12:

- pick-pair discount of 1.0, with an ordinal "most at-risk first" tiebreak among LEAN-quality contenders
- label rule R0
- the `VOID` event
- catch-up picks count as recorded
- the draft-position invariant clarified: DDP can change through round-dependent risk and upside only

None of these changes the approved rev-3 formulas for value, availability, punts, scarcity or bands.
