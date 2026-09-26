# Strategy Engine — implemented formulas

This is the **authoritative description of what the code computes**. It implements `docs/DESIGN.md` (revision 3, approved by Codex QA) plus the implementation-time calibrations listed in [§12](#12-implementation-calibrations-deviations-from-design-rev-3). Every constant below is a key of `StrategyConfig` (`src/domain/config/defaults.ts`, validated by `strategyConfig.ts`); the defaults are shown in **bold**.

Unit convention: every value term is in **z-units per game** (summed per-game z-scores), so terms add without rescaling. Percentage-style modifiers are multiplied by `U_i = max(BPV_i, 1)`.

Notation: `N` teams, `K` drafted rounds, `k` players on my roster, `c` category, `ẑ` capped z-score.

| Stage                   | Module                                          | Depends on                                                                                       |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Static context          | `recommendations/staticContext.ts`              | dataset, league size/roster/primary provider, config — **never draft events, never market data** |
| Roster context + DDP    | `recommendations/ddp.ts`                        | static context, my roster, drafted set, round, punt overrides — **never market data**            |
| Market layer + planning | `recommendations/engine.ts`, `market/market.ts` | the above + Yahoo market + pick timing                                                           |
| Advisor                 | `advisor/advisor.ts`                            | evaluation output only (templates)                                                               |

---

## 1. Numeric safety (`numeric/safe.ts`)

| Helper              | Behaviour                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `safeDiv(n, d, fb)` | returns `fb` when `                                                                                                                             | d   | ≤ eps` (**1e-9**) or either side is non-finite |
| `safeSd(xs)`        | population SD; `0` when fewer than **2** samples                                                                                                |
| `zOrZero(x, μ, σ)`  | `0` when `σ ≤ eps` (and a `DEGENERATE_CATEGORY` warning is raised)                                                                              |
| `clamp(x, lo, hi)`  | `NaN → lo`                                                                                                                                      |
| `sanitizeFinite`    | last line of defence: any non-finite number in an evaluation is replaced by 0 and reported in `finiteRepairs` (tests assert it is always empty) |

If fewer than **30** (`numeric.minPopulationSize`) players have a usable primary projection, status is `INSUFFICIENT_DATA` and there is no recommendation.

## 2. Fantasy population (`stats/population.ts`)

```
rosterSize = Σ active slots + bench          (13 by default; IL excluded)
P          = N · rosterSize + fantasyPopulationBuffer (20)      → 202 for 14 teams
Eligible   = players with a primary projection and GP ≥ populationMinGP (20)
iteration 0: μ, σ, p over all Eligible
repeat ≤ populationMaxIterations (8):
    rank Eligible by Σ raw z (TO weight neutralTurnoverWeight = 1.0), tiebreak id
    Pop = top min(P, |Eligible|); recompute μ, σ, p; stop when membership repeats
```

The population uses the **full** pool, so drafting never changes any z-score. Players with a projection but GP < 20 are still valued, but they are not population members.

## 3. Z-scores (`stats/zscores.ts`)

```
counting (3PM PTS REB AST STL BLK):  z = (x − μ)/σ
TO:                                   z = (μ − x)/σ
p_FG = ΣFGM/ΣFGA over Pop    (NEVER an average of percentages); same for p_FT
FGImpact = FGM − p_FG·FGA  ≡ (FG% − p_FG)·FGA;   z_FG = (FGImpact − mean)/sd
ẑ = clamp(z, −categoryZCap, +categoryZCap)    (3.0; the raw z is kept)
```

- The team percentage is always `ΣM/ΣA` (`roster/profile.ts:rosterTotals`).
- Summed impact equals `ΣFGA_team·(teamFG% − p_FG)`, which the tests verify.

## 4. Value (`value/value.ts`)

```
b_c = 1, except b_TO = initialTurnoverWeight (0.75)
PG  = Σ b_c ẑ_c
R   = mean PG of Eligible players ranked P+1 … P+replacementBandSize (10) by PG
      (fallback when the pool ≤ P: min PG of the bottom band of the population + warning)
PGV = PG − R
a   = clamp(GP / seasonGames(82), 0, 1)
L   = Σ_{3PM,PTS,REB,AST,STL,BLK} μ^repl_c / σ_c    ≥ 0     (TO, FG%, FT% deliberately excluded)
LossPerMissedGame = max(PGV, 0) + (1 − replacementCoefficient(0.35))·L
ESV = PGV − (1 − a)·LossPerMissedGame
BPV = PGV + (1 − perGameBlend(0.5))·(ESV − PGV)
U   = max(BPV, 1)
```

**Properties** (all tested):

- ESV never increases as GP falls, whatever the sign of PGV.
- Zero turnovers never make a missed game valuable.
- `a = 1` gives `ESV = PGV`.

**Rationale.** Yahoo daily lineups mean missed games are partly streamable. Missed games therefore cost the player's surplus plus the unreplaced share of replacement-level production. They are not zero-value slots.

The displayed **neutral rank** is by `Σ raw z` with TO weight 1.0. BPV is the draft-value baseline: capped z, TO 0.75, season blend.

## 5. Availability / durability (`availability/availability.ts`)

```
wMiss_s = Σ_absence games·recurrenceWeight / teamGames       LOW .25 · MODERATE .6 · HIGH 1.0 · UNCLASSIFIED .75
          (no absence detail → (1 − GP/teamGames)·0.75)
H       = Σ w_s·wMiss_s / Σ w_s    over up to 3 seasons, w = 0.5/0.3/0.2 (renormalized); none → 0.10 (flagged)
ρ_hist  = H + chronicPatternPenalty(0.05 if HIGH absences in ≥ 2 seasons) + 0.01·max(0, age − 30)
ρ_now   = statusRisk[status] + manualRiskDelta   (HEALTHY 0 · DTD .03 · INJ .08 · OUT_SHORT .08 · OUT_LONG .20 · SUSPENDED .02 · OUT_SEASON 1.0)
ρ       = clamp(ρ_hist + ρ_now)            → Availability Score = round(100(1 − ρ)); ≥85 LOW, ≥70 MODERATE, ≥50 HIGH, else VERY HIGH
ρ_eff   = clamp(durabilityResidualWeight(0.5)·ρ_hist + ρ_now)
RiskAdj = −riskWeight(round)·ρ_eff·U      round 1–3 .60 · 4–6 .35 · 7–10 .15 · 11+ .05     (never positive)
```

- **Projected GP is priced in ESV (`a`) and is excluded from ρ.**
- **R3-1: residual weight.** Provider GP already embeds some of the injury history, so only 50% of the historical risk is applied again. RiskAdj represents downside and tail risk **beyond** the projection's GP.
- **Status source.** A context status (manual or imported) wins over the Yahoo status marker.

**Calibration fixture** (`tests/integration/durability.test.ts`, round 1):

|        | Elite-fragile (GP 62, ρ_hist ≈ .35)                    | Good-solid (GP 72) | Durable-lower (GP 78) |
| ------ | ------------------------------------------------------ | ------------------ | --------------------- |
| Result | penalty = 25% of PGV; still ranked above durable-lower | —                  | —                     |

- The elite-vs-good DDP gap is 55% of their per-game gap.
- By round 12, RiskAdj shrinks at least 10× and ordering follows BPV.

## 6. Roster context (`roster/profile.ts`, `punts/punts.ts`, `positions/positions.ts`)

### 6.1 Standing

```
cohort_j = population players ranked (j−1)N+1 … jN by BPV   (empty → reuse last non-empty)
B_c(k)  = Σ_{j≤k} mean_cohort_j ẑ_c                           expected average team after k picks
σT_c(k) = √k · sd(ẑ_c over the top N·rosterSize by BPV)
d_c     = (s_c − B_c(k)) / σT_c(k)        (0 when k = 0 or σT ≈ 0);  s_c = Σ_roster ẑ_c
state: ≥1.5 ELITE · ≥0.75 STRONG · ≥−0.5 COMPETITIVE · ≥−1.25 WEAK · else CRITICAL; SOFT PUNT/PUNT from π
```

### 6.2 Punt confidence (with recoverability)

```
D_c   = clamp((−0.5 − d_c)/1.5, 0, 1)
Coh_c = Σ_{c'} max(0, −ρ_cc')·clamp(d_c'/1.5, 0, 1) / Σ max(0, −ρ_cc')     ρ = Pearson corr of ẑ over the population
Required_c = max(0, B_c(k) − 0.5·√K·sdBase_c − s_c)
Gain_c = Σ_{j=1..min(K−k, 3)} max(0, ẑ_(j),c − cohortMean_{k+j},c)    over the 3 best ẑ_c among the top 3N AVAILABLE by BPV
         cohortMean is 1-indexed by round (index 0 = zero pad): rescue pick j is compared with cohort k+j
         (rescueCohortIndex(k, j) = k + j; tested for k = 0, 3, 11)
Rec_c  = Required ≤ eps ? 1 : clamp(Gain/Required, 0, 1)
score  = D·(0.30 + 0.70·(1 − Rec))·(0.70 + 0.30·Coh) + 0.10·[c = TO ∧ D > 0]
π_auto = min(cap_k, min(1, k/5)·clamp(score))       cap_k = 0, .30, .30, .70, .70, 1.0 (k = 0…5+)
hard gate: π_auto > 0.85 only if D ≥ .80 ∧ Coh ≥ .50 ∧ Rec ≤ .35 ∧ k ≥ 6
π = π_auto · damping[rank]  (1.0, 0.6, 0.4 by π_auto rank)   then override: NONE 0 · SOFT max(π, .60) · HARD 1
m_c = interp(π; (.40,1), (.60,.667), (.75,.333), (.90,0))        → TO weight 0.75/0.50/0.25/0
levels: ≥.30 tendency · ≥.50 soft · ≥.90 hard
warnings (pre-damping): ≥3 soft-or-higher → MULTI-PUNT BUILD RISK (critical); else ≥2 hard → warning
```

**No self-reinforcement.** D, Coh and Rec never read `m_c`. With `Rec = 1` the score is ≤ 0.30, so a punt never gets past "tendency" while supply exists.

**Recoverability uses BPV order (ADP-free).**

### 6.3 Need, punt synergy, redundancy

```
φ_k   = 0, .25, .45, .65, .85, 1.0 (k = 0…5+)
need_c = clamp((0.75 − d_c)/2.0, 0, 1)·m_c + priorCategoryPreference_c·max(0, 1 − k/5)   (prior .05 on PTS AST 3PM STL FT%)
NeedAdj   = categoryNeedWeight(0.5)·φ·Σ b_c·need_c·ẑ_c
PuntAdj   = φ·Σ b_c·(m_c − 1)·ẑ_c
surplus_c = clamp((d_c − 1.0)/1.0, 0, 1);  gate = min(1, Σ need)
RedAdj    = −min(0.15·U, 0.25·φ·gate·Σ surplus_c·max(ẑ_c, 0))
```

### 6.4 Pool scarcity (in DDP; ADP-free)

```
Supply_c(X) = Σ_{i∈X} max(ẑ_ic − zRepl_c, 0)          zRepl = mean ẑ of the replacement band
r_c = Supply_c(top 3N AVAILABLE by BPV) / Supply_c(top 3N of the full pool by BPV)   (baseline ≈ 0 → r = 1)
qP_c = clamp(1 − r_c/mean(r), 0, 1)       (mean ≈ 0 → 0)
PoolScarAdj = φ·0.40·Σ qP_c·m_c·(0.25 + 0.75·need_c)·max(ẑ_c − zRepl_c, 0)
```

### 6.5 Positions

The Yahoo slots are `PG SG G SF PF F C C UTIL UTIL`, plus bench. Feasibility and requirements are computed by maximum bipartite matching (Kuhn):

```
R_left = K − k
feasible = MaxMatch(roster ∪ R_left wildcards) = active slots
required_p = active − MaxMatch(roster ∪ R_left dummies eligible for everything except p)
u_p = R_left > 0 ? clamp(required_p / R_left) : 0;   u_i = max over the player's positions
PosAdj = U·(0.05·u_i + 0.20·max(0, (u_i − 0.5)/0.5))      (normal 0–5 %, dangerous up to 25 %)
MultiPosAdj = U·min(0.02, 0.01·(#positions − 1))
```

## 7. Other adjustments

```
Playoff: G_team = Σ_{playoff weeks} weekWeight·games;  PlayoffAdj = U·clamp(0.03·(G − mean)/(2·sd), −0.03, 0.03)  (sd ≈ 0 or unknown → 0)
Upside:  score = max(manual, provider, minutesGrowth, roleTag) ∈ [0,1]  (NO age term; absent → 0)
         minutesGrowth = clamp((MPG_proj − MPG_prev)/10)·0.5 when both supplied; role tags: STARTER .5, INJURY_AWAY .4, DEPTH_CHART .3, ROOKIE_ROLE .3
         UpsideAdj = upsideWeight(round)·score·2.0     round 1–3 .05 · 4–6 .15 · 7–10 .40 · 11+ 1.0
User:    favorite +0.01·U, avoid −0.15·U (DDP only); Do-Not-Draft → removed from candidates, label PASS
```

## 8. DDP

```
TeamFit = NeedAdj + PuntAdj + PoolScarAdj + PosAdj + MultiPosAdj + RedAdj
DDP_raw = BPV + TeamFit + PlayoffAdj + UpsideAdj + RiskAdj + UserPrefAdj
```

- **DDP reads no market field.** Round-dependent terms (risk, upside) use the round of your next pick (P0).
- **Relative scale:**
  ```
  top = best DDP_raw among candidates
  ref = DDP_raw at rank min(2N, n)
  S   = max(top − ref, relScale.minSpread = 0.5)
  ddpRel   = clamp(1 − (top − DDP)/S, 0, 1)
  ddpScore = round(100·ddpRel)
  ```
  This stays finite for any sign.

## 9. Market layer (`market/market.ts`)

### 9.1 Pick timing (`draft/snake.ts`, `draft/replay.ts`)

```
user pick in round r: (r−1)N + (r odd ? D : N − D + 1)
replay: PICK advance → current += 1; PICK no-advance → catch-up (clock unchanged); RESYNC → current = n; VOID → player available again, slot stays consumed
P0 = first user pick ≥ current;  P1 = next user pick after P0
g (picks before my next) = on the clock ? P1 − P0 − 1 : P0 − current
gapType: P1 − P0 vs N → SHORT / EVEN / LONG
unrecorded = current − 1 − (non-voided recorded picks)      invariant: unrecorded ≥ 0
```

**Event validation.** Invalid events are rejected; the engine does not clamp them.

- A catch-up (non-advancing) PICK is accepted only when `unrecorded > 0`, meaning a RESYNC skipped slots or a VOID freed one.
- A RESYNC is rejected if it would set `current − 1` below the number of picks already recorded.

Every event is validated against its prefix, so every prefix of the log is valid, and undo can never produce an invalid state.

### 9.2 Survival bands (ordinal)

```
marketRef = L7 ADP → XRank → Rank (source shown)
w  = max(3, 0.12·marketRef)
zS = (marketRef − P1)/w
GONE if marketRef < current − w
UNLIKELY zS ≤ −0.5 · TOSSUP ≤ 0.5 · LIKELY ≤ 1.5 · SAFE otherwise
UNKNOWN when there is no market data
XRank downgrade: LIKELY/SAFE and XRank < P1 → one band lower
P1 = null (final pick) → UNLIKELY (waiting is impossible)
```

**Bands are never mapped to numbers.** The code only compares their order (`BAND_ORDER`) and set membership.

### 9.3 Next-pick scarcity (market layer only)

```
MarketOrder = available by marketRef asc (no market → last, by BPV)
rN_c = Supply_c(MarketOrder[g : g+2N]) / Supply_c(MarketOrder[0 : 2N]);   qN_c = clamp(1 − rN_c/mean(rN), 0, 1)
NextScarAdj = 0.25·clamp(g/N, 0.5, 1.5)·Σ qN_c·m_c·(0.25 + 0.75·need_c)·max(ẑ_c − zRepl_c, 0)
```

NextScarAdj feeds pair score, miss cost and priority. **It is never part of DDP.**

### 9.4 Pick-pair planning (deterministic scenarios)

```
Candidates = top 10 non-DND by DDP_raw
Tiers at P1: CONSERVATIVE = band ∈ {SAFE, LIKELY};  NEUTRAL = + TOSSUP (UNKNOWN counts as TOSSUP);  FALLBACK = MarketOrder[P1 − current − 1 :]
NextBest(roster', pool') = argmax DDP' in the first non-empty tier, where DDP' is fully re-evaluated with roster' and the round of P1
PairScore(X) = DDP(X) + NextScarAdj(X) + nextDiscount(0.90)·NextBest(roster ∪ {X}, pool \ {X})
MissCost(X)  = DDP(X) + NextScarAdj(X) − NextBest(roster, pool \ {X});    missRel = MissCost/S
```

**Ordering and recommendation** (implementation calibration, see [§12](#12-implementation-calibrations-deviations-from-design-rev-3)):

1. **Qualified.** A candidate is qualified when `ddpRel ≥ leanDraftRel` (0.75).
2. **Contenders.** A qualified candidate whose PairScore is within `tieToleranceRel(0.06)·S` of the best _qualified_ PairScore. If no candidate is qualified, the tolerance is applied to the best PairScore overall.
3. **Contender order.** Contenders are ranked by the most at-risk band first (ordinal). Within a band, the higher DDP comes first, then id.
4. **Remaining candidates** follow by PairScore. All other players follow by DDP. Do-Not-Draft players come last.
5. **Recommended pick** = the first player in this order.

### 9.5 Timing labels (first match wins; the rule id is shown in the UI)

```
P1 PASS        ddpRel < 0.50, or avoided and ddpRel < 0.75
U1 NO MARKET   band = UNKNOWN (no Yahoo market record): market urgency UNAVAILABLE
D1 DRAFT NOW   ddpRel ≥ 0.85 and band ∈ {GONE, UNLIKELY}
D2 DRAFT NOW   ddpRel ≥ 0.95 and band = TOSSUP
D3 DRAFT NOW   ddpRel ≥ 0.85, TOSSUP and missRel ≥ 0.25
L1 LEAN DRAFT  ddpRel ≥ 0.75 and band ∈ {GONE, UNLIKELY, TOSSUP}
L2 LEAN DRAFT  LIKELY and missRel ≥ 0.35
S1 SAFE WAIT   SAFE
W1 WAIT        otherwise
R0             the recommended pick is shown as at least LEAN DRAFT (records the original rule); a NO MARKET pick stays NO MARKET
DND            Do-Not-Draft → PASS
```

A missing market record never produces an urgency (DRAFT NOW, LEAN DRAFT, WAIT or SAFE WAIT): the player gets NO MARKET, with `market.urgency = UNAVAILABLE`, and keeps its statistical rank (`ddpRank`) and value unchanged. Pick-pair planning never assumes such a player survives to P1 (it is excluded from the conservative, neutral and fallback next-pick tiers), and the at-risk tiebreak among contenders is skipped when any contender's urgency is unknown (order falls back to DDP).

**Value over market** is `marketRef − ((current − 1) + ddpRank)`. It is display only.

## 10. Advisor (`advisor/advisor.ts`)

The advisor is built from deterministic templates over evaluation output:

- header (pick / round / next pick / gap)
- build (strongest punt, π, recoverability)
- priority: top 3 categories by `need·(1 + qP + qN)`
- reason: the weakest non-punted category and its supply trend, plus the strong categories
- recommended pick: its fit tags, categories it costs, the top positive fit terms, and a band phrase
- avoid line: categories in surplus
- warnings

## 11. Invariants (tested in `tests/integration/*`)

| Change                  | Guarantee                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| ADP / XRank / Rank      | BPV, pool scarcity, TeamFit and DDP bit-identical. Bands, next-pick scarcity, labels and priority may change.                           |
| Draft position / resync | stats and BPV identical. DDP may change **only** via the round-dependent risk and upside terms (the round of _your_ next pick changes). |
| Primary provider switch | Yahoo market fields identical. Statistical values may change.                                                                           |
| Punt override           | raw and capped z identical. `m`, TeamFit and DDP change.                                                                                |
| Flags                   | stats, BPV and TeamFit identical. Only UserPrefAdj and DDP change. DND is excluded.                                                     |
| Undo                    | evaluation deep-equal to the pre-action state                                                                                           |
| League isolation        | league A events never affect league B                                                                                                   |
| Drafted by others       | a drafted player's source data is unchanged                                                                                             |
| Percentages             | roster FG% and FT% are always ΣM/ΣA                                                                                                     |
| Deviation               | the next evaluation is a pure function of the actual events                                                                             |

## 12. Implementation calibrations (deviations from DESIGN rev 3)

These were found while running the engine on realistic data. Each has a regression test in `tests/integration/planning.test.ts`, and each is configurable.

1. **`pickPair.nextDiscount` = 0.90, plus an ordinal at-risk-first tiebreak.**
   - The design had 0.85. The first implementation used 1.0. Codex QA set 0.90: future next-pick value gets substantial but not equal weight, because survival bands are ordinal heuristics, not probabilities.
   - Pair scores within `tieToleranceRel · S` are treated as ties, and order is decided ordinally (band, then DDP).
   - Bands are still never converted to numbers.
2. **Contenders must be LEAN-quality** (`ddpRel ≥ 0.75`). Without this, the at-risk tiebreak could recommend a clearly weaker player.
3. **Rule R0.** The recommended pick is never labeled WAIT, SAFE WAIT or PASS.
4. **`VOID` event** for removing a pick from the roster panel without moving the clock (undoable).
5. **Catch-up picks count as recorded, and only fill genuinely unrecorded slots.** A catch-up pick is accepted only while `unrecorded > 0`. A RESYNC behind the recorded picks is rejected. `unrecorded` is therefore never negative (Codex QA blocker 2).
6. **Draft-position invariant clarified.** DDP includes round-weighted risk and upside, so changing draft position may change DDP through those terms only. Neutral quality (stats and BPV) never changes.
7. **Need, punt, pool-scarcity and redundancy are all scaled by φ_k**, as DESIGN §7 states. §6.6's formula omitted φ for pool scarcity.

## 13. Known limitations

- **Replacement coefficient.** A single coefficient (0.35) covers every absence type. Extended, predictable absences (IL-able) stream better than sporadic DTD/rest absences. A future split `r_extended`/`r_sporadic` is noted; no absence simulator is built in v1.
- **Durability residual weight** (0.5) is a judgment prior, to be calibrated against real provider GP.
- **Default weights** need one calibration pass on real Hashtag and Yahoo data.
- **Recoverability** ignores the BPV cost of rescue picks, which leans toward not punting.
- **ADP spread** is assumed (12%). Yahoo L7 ADP has no distribution.
- **Pick-pair planning** looks one pick ahead only.
- **Keepers and traded picks** are not supported. Draft type is snake only.

## 14. QA fix log

- **Recoverability cohort indexing** (Codex blocker 1). The audit found the original `cohortMean[k + j + 1]` was correct, because the loop index `j` was 0-based and `cohortMean` is 1-indexed by round. The code now uses an explicit `rescueCohortIndex(k, pickNumber)` with 1-based pick numbers. Tests pin rescue pick 1 → cohort k+1, pick 2 → cohort k+2, and so on, for k = 0, k = 3 and late draft (k = 11 of 13).
- **Catch-up accounting** (Codex blocker 2). Non-advancing picks without an unrecorded slot are now rejected, as is a RESYNC behind the recorded picks. A randomized 400-step property test asserts `unrecorded ≥ 0` and exact undo.
- **Pick-pair discount.** Changed to 0.90 (see §12.1).
- **Yahoo `INJ` status** (Codex, config v4). `INJ` was read as `OUT_SHORT`, which asserted a duration Yahoo never states. It is now its own `INJ` state (blank → null, `GTD` → DTD, `INJ` → INJ; raw cell kept). `statusRisk.INJ = 0.08` is the value INJ rows already received, so no engine output changes; it is a new key, not a re-weighting. Stored v3 configs and backups are upgraded by adding the default `INJ` value and keeping every user-set value.
- **Sample-size-aware category states (O1, config v5, presentation only).** Each profile entry keeps its calculated `state` and adds `displayState` + `maturity`: roster ≤ 2 → TENDENCY (shown as leaning + / even / leaning −), 3–4 → EMERGING (CRITICAL shown as WEAK), ≥ 5 → FULL (calculated state). Punt states are always shown. `d`, need, punt π and DDP are unchanged. Thresholds: `categoryStateMaturity` (default 2 / 4).
- **No-market players (real-data QA).** See §9.5: NO MARKET label, `urgency = UNAVAILABLE`, no survival assumption in planning, no at-risk tiebreak across unknown urgency. No value or weight changed.
- **Availability history (Codex-approved, config v6).** Per-season share measured against Games Available; suspension / non-injury games excluded; unexplained missed games UNCLASSIFIED. Seasons anchored to the most recent history season; missing seasons shrink toward `unknownHistoryRisk` (replaces the old renormalisation over present seasons). No-history LOW shown as NO HIST. `AVAILABILITY_PROJECTION_GAP` is a flag only. Weights/thresholds unchanged (residual 0.5, unknown 0.10). See docs/AVAILABILITY_AUDIT.md §8.
- **Availability QA corrections (Codex).** History window anchored on the NBA season before the league's fantasy season (2026-27 → 2025-26 · .5 / 2024-25 · .3 / 2023-24 · .2), not on the newest season in the file. Games Available: "+4" allowance removed; single team ≤ Team Games, several teams above Team Games flagged for review, absolute ceiling 88. No-history shown independently of the band (`MODERATE · NO HIST`). Gap flag's `historicalGpRate` documented as an unweighted mean. No scoring change. See docs/AVAILABILITY_AUDIT.md §8.1.
