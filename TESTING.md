# Testing

## Commands

```bash
npm run typecheck        # tsc --noEmit (strict)
npm run lint             # eslint (next + typescript, no-explicit-any = error)
npm test                 # vitest: unit + integration + invariants + finite + perf
npm run build            # static export to ./out
npm run test:e2e         # playwright (serves ./out; build first)
#   in sandboxes with a preinstalled Chromium:
PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
npm run check            # typecheck + lint + unit
```

## Layout

| Path                                        | What                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `tests/unit/snake.test.ts`                  | snake picks for slots 1 / middle / N in 10-, 12- and 14-team leagues; 14/11 sequence; P0/P1, gap type; final pick                                                                                            |
| `tests/unit/replay.test.ts`                 | event log, double-draft rejection, multi-level undo, VOID, **T-RESYNC-1/2**                                                                                                                                  |
| `tests/unit/numeric.test.ts`                | **T-FINITE-2** guard helpers                                                                                                                                                                                 |
| `tests/unit/identity.test.ts`               | normalization (accents, suffixes, apostrophes, hyphens), matching order, ambiguity, manual mappings, fuzzy suggestions                                                                                       |
| `tests/unit/import.test.ts`                 | cell parsing, CSV validation, TOTAL basis, pct/makes disagreement, duplicates, provider reconciliation, market field separation                                                                              |
| `tests/unit/persistence.test.ts`            | memory **and** Dexie (fake-indexeddb): supersede/revert, atomic rollback, persistent manual mappings, league isolation, backup round-trip                                                                    |
| `tests/unit/stats.test.ts`                  | z-scores, TO inversion, league rate p = ΣM/ΣA, **FT/FG volume fixture (91%/1 vs 89%/9)**, cap keeps raw, roster ΣM/ΣA, population P and buffer                                                               |
| `tests/unit/value.test.ts`                  | **T-MISS-1(a)(b)(c), T-MISS-2, T-MISS-3**, replacement coefficient, BPV blend                                                                                                                                |
| `tests/unit/availability.test.ts`           | recurrence classes, 50/30/20 weighting, chronic/age/status/manual, bands, round weights, **residual weight**                                                                                                 |
| `tests/unit/positions.test.ts`              | matching with G/F/UTIL, late-draft C urgency, infeasibility, multi-position bonus                                                                                                                            |
| `tests/unit/punts.test.ts`                  | TO weight curve, **T-PUNT-REC-1/2**, recoverability, multi-punt damping and warnings, overrides, TO prior                                                                                                    |
| `tests/integration/teamfit.test.ts`         | **need fixture (REB/BLK roster → AST/3PM player)**, §60 weak→elite AST, **soft-punt TO fixture**, §60 TO hard punt, **T-PUNT-REC-3**                                                                         |
| `tests/integration/scarcity-market.test.ts` | **T-ADP-1** (randomized ADP/XRank/Rank permutations), **T-ADP-2**, pool scarcity reacts to the pool, **market fixture 67/74**, §32 examples, gap effect, GONE/fallback/XRank downgrade, labels, **T-BAND-1** |
| `tests/integration/durability.test.ts`      | **T-DUR-1/2/3** calibration trio; durable replacement-level veteran                                                                                                                                          |
| `tests/integration/planning.test.ts`        | pick-pair: take the at-risk star when the better one is safe; both safe → better one; recommended is LEAN-quality                                                                                            |
| `tests/integration/invariants.test.ts`      | determinism, draft-position / provider / flags / drafted-by-others invariants, undo deep-equality, **deviation**, league isolation, compare(A,B) sums, exact DDP decomposition                               |
| `tests/integration/finite.test.ts`          | **T-FINITE-1** pathological datasets at picks 1/100/179/183                                                                                                                                                  |
| `tests/perf/perf.test.ts`                   | 500 players, full evaluation incl. pick-pair: median < 100 ms (≈ 48 ms here)                                                                                                                                 |
| `e2e/draft.spec.ts`                         | §51 scenario end-to-end + manual resync                                                                                                                                                                      |
| `e2e/offline.spec.ts`                       | offline draft + reload with the service worker                                                                                                                                                               |

## Fixtures

- `tests/helpers/fixtures.ts`:
  - `sampleDataset()` loads the fictional sample through the **real import pipeline**.
  - `synthPool(n)` builds a seeded synthetic pool with ADP = index.
  - `withSynth` adds hand-built players (e.g. `ELITE_FRAGILE`, `CAND_PG`, `ASTAR`).
  - `eventsFrom` builds draft logs.
- Obvious-answer fixtures are in the tests themselves. For example, a volume FT shooter; a REB/BLK roster choosing between a PG and a big; AST specialists moved in and out of the snake gap.
