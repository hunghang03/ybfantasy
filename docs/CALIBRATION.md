# Real-data calibration

**Source change (2026-09-26):** Yahoo projections are now the primary statistical source; Hashtag/BBM are optional validation sources (`--hashtag`, `--bbm`). The fictional sample now runs Yahoo-primary; its fixtures were regenerated for that data-path change only (no weight change).

**Status:** the pipeline is built and validated end to end on fictional data. **The real 2026-27 reports are pending your input files** (see §6). No strategy weight has been changed in this phase.

## 1. Principle

- The engine is **not** tuned to reproduce Yahoo or Hashtag rankings. Those rankings are inputs and points of comparison.
- **Every major outlier is investigated and classified.**
- A strategy weight changes **only** if repeated real-player scenarios expose a **systematic** problem. Any such change is proposed to Codex first, with the report and commit SHA, never applied directly.

## 2. Workflow

```
data/private/yahoo-projections-2026-27.csv ─┐
data/private/yahoo-screenshot-*.csv ┼─► reconcile ─► dataset ─► calibration report (top ~200)
data/aliases.csv ─────────────────┘                     └──► 30 deterministic draft scenarios
(optional) bbm / availability / context / playoff                  (5 slots × 6 foundations)
```

```bash
npm run calibrate -- --projections data/private/yahoo-projections-2026-27.csv --yahoo data/private/yahoo-screenshot-2026-27.csv \
                     --aliases data/aliases.csv --out reports/private/2026-27
npm run calibrate:sample        # fictional pipeline check → reports/sample/
```

Code: `src/calibration/{reconcile,report,scenarios,playoffFromProjections,markdown}.ts` and the CLI `scripts/calibrate.ts`. Tests: `tests/unit/calibration.test.ts`.

## 3. Reconciliation report (`reconciliation.md/json`)

The matching order is the app's normal order:

1. provider ID
2. normalized name + NBA team
3. alias table (`data/aliases.csv`)
4. unique normalized name
5. manual review

| Bucket                | Meaning                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| matched               | Yahoo row linked to a primary-projection player (the `matchedVia` breakdown is shown)                  |
| Yahoo-only            | No primary projection. **Kept** as an unranked, market-only player.                                    |
| Projection-only       | Projected player with no Yahoo row (outside the captured top ~250, or a naming problem)                |
| ambiguous             | More than one candidate. **Never merged**; listed with its candidates for an alias or manual decision. |
| team mismatch         | Matched, but the teams differ (trade or stale source). Yahoo's team is kept for identity.              |
| rejected / duplicates | Rows that failed validation, with the reasons                                                          |

**Invariant (tested):** `matched + Yahoo-only + ambiguous + rejected + duplicates = Yahoo rows`, and `matched + projection-only = projected players`.

## 4. Calibration report (`calibration.md/csv/json`)

**Rows** are the union of engine BPV top 200, Yahoo XRank ≤ 200 and provider rank ≤ 200, sorted by engine rank.

**Columns:**

- player, team, positions
- Yahoo: XRank, Rank, L7 ADP (with any review flags)
- primary provider: rank (e.g. Yahoo Pre-Season Rank), provider ADP if published
- engine: neutral **BPV rank**, **expected-season rank** (ESV), per-game rank, neutral 9-cat rank
- GP, category strengths (capped z ≥ 1) and weaknesses (≤ −1), availability risk and score
- disagreement flags: projection Δ vs validation provider, team mismatch, Yahoo review fields, missing market row

**Deltas.** Each is `otherRank − engineRank`, so a positive value means the engine ranks the player earlier.

- `Engine vs provider rank`
- `Engine vs Yahoo XRank`
- `Yahoo L7 ADP − provider ADP` (a market-vs-market check)

**Flags:** `DISAGREE` when the worst |Δ| ≥ 15; `MAJOR` when it is ≥ 30.

### Classification rubric

Every flagged row gets an **automated, tentative** classification (multi-label; the first label is primary). A human must confirm each MAJOR row in §7.

| Class                          | Automated evidence rule                                                                 | Typical meaning                                     |
| ------------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------- |
| source-data mismatch           | team mismatch, projection disagreement vs BBM, Yahoo review fields, missing market row  | Fix the data before judging the engine              |
| GP/durability adjustment       | per-game rank vs season-blended rank differ by ≥ 10, or GP < 60, or HIGH/VERY HIGH risk | The engine prices missed games and risk (by design) |
| percentage-volume difference   |                                                                                         | volume-weighted z                                   | ≥ 1.5 in FG% or FT% | Volume-sensitive percentages (by design) |
| intentional engine behavior    | neutral 9-cat rank vs BPV rank differ by ≥ 10 (TO weight 0.75, z-cap)                   | Deliberate weighting                                |
| punt/team-fit adjustment       | scenario reports only (roster-dependent)                                                | —                                                   |
| positional/scarcity adjustment | scenario reports only (roster- and pool-dependent)                                      | —                                                   |
| **likely engine defect**       | none of the above explains the gap                                                      | **Investigate manually first**                      |

## 5. Scenarios (`scenarios.md`, `scenarios/*.json` = QA fixtures)

The setup is a 14-team H2H 9-cat league, with draft slots **1, 4, 7, 11, 14** × foundations **balanced, soft-punt TO, punt FT%, guard-heavy, big-heavy, injury-risk stars**.

- **Other teams** draft strictly by Yahoo market order (L7 ADP → XRank → Rank; players with no market data are taken last, by BPV).
- **My picks** follow the foundation policy, but only **within the engine's own top-8 candidates**. The foundation shapes the roster; it never replaces the engine.

| Foundation        | My-pick policy                                                                   |
| ----------------- | -------------------------------------------------------------------------------- |
| balanced          | engine recommendation                                                            |
| soft-punt TO      | override TO = SOFT, then take the recommendation                                 |
| punt FT%          | override FT% = HARD; rounds 1–3: lowest FT z among LEAN-quality candidates       |
| guard-heavy       | rounds 1–8: first PG/SG in priority                                              |
| big-heavy         | rounds 1–8: first PF/C in priority                                               |
| injury-risk stars | rounds 1–2: highest-BPV player with HIGH/VERY HIGH risk or GP < 65 in the top 12 |

**Snapshots** are taken after my picks in rounds **1, 2, 4, 6, 9, 12**. Each records:

- build and punt state, priority, reason
- all 9 category states with d / need / π
- the recommended pick with its label and why
- the top 5 with DDP, label, rule, band, ADP and fit tags
- warnings

**Regression.** Scenarios are fully deterministic. `tests/unit/calibration.test.ts` re-runs two of them and requires an exact match with the committed fixtures.

## 6. Status of the real-data run

| Input                                  | Status                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Yahoo 2026-27 market screenshots       | **Imported and validated** (275 players, QA-v4; `data/private/`, git-ignored).                                        |
| Yahoo 2026-27 projections (primary)    | **Pending** — Codex is transcribing the Remaining Games (proj) view. Nothing has been entered or inferred.            |
| Hashtag Basketball 2026-27 projections | Optional validation source; not required. Not available (hashtagbasketball.com is blocked here and is never scraped). |
| Basketball Monster                     | Not used (no legitimate export provided).                                                                             |

**To produce the real reports:**

1. Place the two files in `data/private/` using the templates (see `data/README.md`).
2. Run the `npm run calibrate` command above.
3. Review `reports/private/2026-27/`.

Because the repository is public, those reports are git-ignored. Share them with Codex privately, or make the repository private before committing them.

## 7. Findings from the pipeline validation run (fictional sample)

These come from `reports/sample/`. The sample's provider rank and "XRank" are noisy views of a hidden generator score, not of 9-category value. Its rank disagreements (median |Δ| 32–36, 143 MAJOR after the Yahoo-primary switch) therefore **say nothing about the engine** and only exercise the pipeline.

The scenario runs did surface two engine-behavior observations. Both must be re-checked on real data **before** any change is proposed:

| #   | Observation (sample)                                                                                                                | Hypothesis                                                                                                                                                                                                                      | Classification (tentative)                                         | Proposed action                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | In 30 of 30 scenarios, at least one category is labeled **CRITICAL after a single pick** (for example, BLK after drafting a guard). | At k = 1 the team-level SD `σT(1)` equals one player's spread, so one specialist moves `d` by more than 1.25. Recommendations are barely affected because need is damped by φ₁ = 0.25, but the **dashboard label** is alarming. | likely engine defect (**display only**, no weight)                 | Re-check on real data. If confirmed, propose showing state labels only from k ≥ 2 (or dampening them by φ_k). **Not changed.**              |
| O2  | Final rosters average **5.5 C-eligible players** of 13, even in guard-heavy builds.                                                 | The fictional market (others draft by a noisy hidden score) underprices bigs whose FG%/REB/BLK z-scores are strong, so the engine keeps finding "value" at C. This could be a sample artifact.                                  | positional/scarcity adjustment, or a source-data (sample) artifact | Re-check with real Yahoo ADP. If real drafts also end C-heavy with guard categories weak, investigate redundancy strength. **Not changed.** |

No other anomalies:

- Reconciliation of the sample is 300/300 matched.
- The playoff schedule derived from W18–W21 had no within-team conflicts.
- Punt overrides register as intended: "Punt FT% — 100% [manual]" and "Soft punt TO — 60% [manual]".

## 8. Change control

- A weight change requires three things:
  1. a real-data finding that repeats across several slots and foundations
  2. a written rationale here
  3. Codex approval
- It is then applied as its own commit, with the scenario fixtures regenerated and the diffs reviewed.
- `StrategyConfig.version` is bumped for any default change.
