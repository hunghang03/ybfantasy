# QA handoff (for Codex)

The engine implements `docs/DESIGN.md` rev 3. **`STRATEGY_ENGINE.md` is the authoritative formula reference for the code**, including the §12 implementation calibrations that differ from the design document. Please challenge those first.

## Commands

```bash
npm ci
npm run typecheck && npm run lint && npm test          # 150+ unit/integration tests, < 10 s
npm run build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e   # 3 E2E scenarios
```

The `PW_CHROMIUM_PATH` variable is only needed where Playwright's own browser is not installed.

## Files to inspect first

1. `src/domain/recommendations/engine.ts`: orchestration, pick-pair planning, contender ordering, labels, R0.
2. `src/domain/recommendations/ddp.ts`: roster context and the exact DDP sum.
3. `src/domain/punts/punts.ts`: punt confidence, recoverability, hard gate, damping.
4. `src/domain/value/value.ts`: replacement level, missed-game model, BPV.
5. `src/domain/scarcity/scarcity.ts`: pool vs next-pick scarcity.
6. `src/domain/market/market.ts`: ordinal bands and label rules.
7. `src/domain/stats/zscores.ts` and `population.ts`: percentage impact and population.
8. `src/domain/availability/availability.ts`: ρ_hist / ρ_now / ρ_eff and the residual weight.
9. `src/domain/draft/replay.ts`: event semantics (PICK advance / catch-up, RESYNC, VOID).
10. `src/domain/import/plan.ts` and `identity/matcher.ts`: reconciliation and no-silent-merge rules.
11. `src/domain/config/defaults.ts`: every weight.

## Highest-risk modules

| Risk                  | Why                                                                                                                         | Where it is covered                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Pick-pair ordering    | Implementation calibration (γ = 0.90, ordinal at-risk tiebreak, LEAN-quality contenders) goes beyond design rev 3           | `planning.test.ts`, STRATEGY_ENGINE §9.4 / §12  |
| Punt recoverability   | Depends on cohort means. Pools where AST (etc.) is common raise cohort means and lower Gain, by design.                     | `punts.test.ts`, `teamfit.test.ts`              |
| Relative scale S      | All thresholds (PASS / LEAN / DRAFT NOW, missRel) depend on `S = max(top − DDP@2N, 0.5)`                                    | `finite.test.ts`, market tests                  |
| Replacement level     | With small or synthetic pools the replacement band sits low, so PGV values are large. Real data is expected to be moderate. | `value.test.ts`, `REPLACEMENT_FALLBACK` warning |
| Import reconciliation | Real provider naming quirks                                                                                                 | `identity.test.ts`, `import.test.ts`            |

## Expected invariants (all automated)

| Invariant                                                                                              | Test                                             |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| ADP / XRank / Rank changes → BPV, pool scarcity, TeamFit and DDP bit-identical                         | `scarcity-market.test.ts` T-ADP-1                |
| ADP can change next-pick scarcity, band, label and priority                                            | T-ADP-2                                          |
| Draft position change → stats and BPV identical. DDP changes only via round-dependent risk and upside. | `invariants.test.ts`                             |
| Provider switch → market fields identical                                                              | `invariants.test.ts`                             |
| Punt override → raw and capped z identical                                                             | `teamfit.test.ts`                                |
| Flags → stats, BPV and TeamFit identical. DND excluded.                                                | `invariants.test.ts`                             |
| Undo → deep-equal evaluation                                                                           | `invariants.test.ts`, `replay.test.ts`, E2E      |
| League A cannot affect League B                                                                        | `invariants.test.ts`, `persistence.test.ts`, E2E |
| ΣM/ΣA percentages                                                                                      | `stats.test.ts`                                  |
| DDP = BPV + TeamFit + playoff + upside + risk + userPref exactly; TeamFit = sum of its six terms       | `invariants.test.ts`                             |
| Every output finite on pathological data                                                               | `finite.test.ts`                                 |

## Manual probes

- **Review / Debug.** Pick A and B. The comparison table shows every term and the A − B differences, and the parts sum to the DDP difference. Below it, the full roster-context table shows s, B, σT, d, need, surplus, qP, qN, D, Coh, Rec, required, gain, score, π_auto, gate, damping, π, override, m and weight.
- **Player detail.** Double-click a row or press Enter.
- **Label rules.** Each label shows the rule that produced it (tooltip on the label, and in the detail).
- **Draft header.** It shows the recalculation time in ms.

**Suggested probes:**

- Edit one player's ADP in a CSV and re-import. The DDP column must not change; the Action and band may.
- Set TO to "hard" in the dashboard's punt override. Raw TO z is unchanged; the TO fit contribution becomes 0; high-usage players rise.
- Draft three centers. AST and 3PM need rises, and the advisor and priority shift toward guards.

## Known compromises

- **Sample data** is fictional and synthetic. Absolute DDP values will differ with real data, and weights need one calibration pass (STRATEGY_ENGINE §13).
- **Positions.** The engine uses Yahoo eligibility as imported. Games-played-at-position rules are not modeled.
- **Yahoo stat columns** are not a projection source by default, because they carry no attempts.
- **Service worker.** Hand-written and minimal: cache-first for assets, network-first for pages.
- **Settings editor.** `StrategyConfig` is edited as schema-validated JSON (advanced use), not a per-field form.

## Unresolved questions for the product owner

1. ~~Discount vs tiebreak~~ Resolved by Codex QA: γ = 0.90, keeping the LEAN-quality gate, `tieToleranceRel` and the at-risk-first tiebreak.
2. Should draft position affect DDP at all (through round-dependent risk/upside), or should those terms use the _current_ round only?
3. Keepers and traded picks: needed for any league?
4. Should validation providers ever gate recommendations (for example, never DRAFT NOW on flagged disagreement)? Currently they are only flagged.

## Fixes after the QA review of `65ba8875`

| Item                                     | Resolution                                                                                                                                                                                                                                  | Tests                                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recoverability cohort indexing (blocker) | Audited: **no off-by-one existed**. `cohortMean[0]` is a zero pad, `cohortMean[j]` is round j, and the loop index was 0-based, so rescue pick 1 was already compared with cohort k+1. Made explicit via `rescueCohortIndex(k, pickNumber)`. | `tests/unit/punts.test.ts` › recoverability cohort indexing (k = 0, 3, 11, 13)                                                                                   |
| Catch-up accounting (blocker)            | `appendPick(advance=false)` is rejected unless `unrecordedPicks > 0`. `appendResync` is rejected if it would move behind the recorded picks. The UI surfaces the rejection message.                                                         | `tests/unit/replay.test.ts` › catch-up accounting (6 tests, including a randomized property test); `e2e/draft.spec.ts` resync scenario (third catch-up rejected) |
| Pick-pair discount                       | `pickPair.nextDiscount` 1.0 → 0.90. The gate, tolerance and tiebreak are unchanged.                                                                                                                                                         | `tests/integration/planning.test.ts`                                                                                                                             |

## Real-data calibration phase

`docs/CALIBRATION.md` holds the workflow, report definitions, classification rubric, scenario design, run status and findings.

**Code:**

- `src/calibration/*`
- `scripts/calibrate.ts`

**Tests:** `tests/unit/calibration.test.ts`. It covers screenshot metadata, Hashtag columns, the rule that Hashtag ADP never becomes Yahoo data, reconciliation buckets and their invariant, report delta signs and severities, and scenario fixture determinism.

**Status:** the real Yahoo screenshots and Hashtag file were not available to the build environment, so the real-data reports are pending. Fictional pipeline outputs are in `reports/sample/`.

**Observations for review** (no engine change made):

- **O1:** category state labels at k = 1 can read CRITICAL.
- **O2:** C-heavy final rosters in the sample scenarios.

## Yahoo primary projections + draft-day workflow (2026-09-26)

- **Source change:** Yahoo projections are the default primary source (`primaryProjectionProvider: 'yahoo'`); Hashtag/BBM are optional validation. No weight changed.
- **Importer:** combined `FGM/A`, `FTM/A` cells (decimals, exact split), `Stat Basis`, provenance on projection rows, flagged stats reject the row, snapshot capture tracking, `Use this snapshot`, market ↔ projection reconciliation (Data page and `npm run yahoo:projections`).
- **Draft day:** search → Enter = MARK TAKEN, Shift+Enter = DRAFT TO MY TEAM, market-only players findable, extended status bar, decision record on every user pick (Review → Draft decision log, JSON export).
- **Tests:** `tests/unit/yahoo-primary.test.ts` (schema, decimals, TOTAL basis, never-derived attempts, flags, mixed captures, Yahoo-only engine run, market never in BPV, volume-weighted FG%, reconciliation buckets, identity policy, snapshots, mark taken/undo, decision record, resync/catch-up/undo, 14-team snake slots 1/4/7/11/14), punt picks 3–5 case, E2E draft-day test.
- **Fixture change:** `reports/sample/` was regenerated because the sample's primary source is now the Yahoo-format file (totals ÷ GP differ from the Hashtag-format per-game rounding by < 0.05). See docs/CALIBRATION.md.
- Details: [docs/DRAFT_DAY.md](docs/DRAFT_DAY.md).
