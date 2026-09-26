# Draft day: Yahoo projections, manual sync, decision log

## 1. Yahoo projection CSV schema

Template: `data/templates/yahoo-projections.template.csv`. Header row, exactly:

```
Player,Team,Pos,Pre-Season Rank,GP*,FGM/A*,FG%,FTM/A*,FT%,3PTM,PTS,REB,AST,ST,BLK,TO,Stat Basis,Source,Captured At,Confidence,Review Fields,QA Note
```

| Column            | Required | Format                                             | Notes                                                                                                                            |
| ----------------- | -------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Player`          | yes      | text as Yahoo shows it                             | Matched to the Yahoo market identities: mapping → provider id → name + team → alias → unique name → review.                      |
| `Team`            | no       | Yahoo team code                                    | Kept as the projection's `sourceTeam`; the market team stays authoritative. A difference is reported as a team mismatch.         |
| `Pos`             | no       | e.g. `PG,SG`                                       | Used only if the player has no Yahoo market eligibility.                                                                         |
| `Pre-Season Rank` | no       | number                                             | Comparison only (`providerRank`); never used for value.                                                                          |
| `GP*`             | yes      | number (decimals allowed)                          | Projected games → ExpectedSeasonValue. Not durability history.                                                                   |
| `FGM/A*`          | yes\*    | `made/attempted`, decimals allowed: `567.7/1149.4` | Split exactly. Separate `FGM` and `FGA` columns are also accepted (they win if both are present; a disagreement warns).          |
| `FG%`             | no       | `0.494`, `.494` or `49.4%`                         | Cross-check only: rounding-aware; small gap warns, gross gap (mis-mapped column) rejects the row. Never used to derive attempts. |
| `FTM/A*`          | yes\*    | as `FGM/A*`                                        |                                                                                                                                  |
| `FT%`             | no       | as `FG%`                                           |                                                                                                                                  |
| `3PTM`            | yes      | number                                             | `3PM` also accepted.                                                                                                             |
| `PTS` `REB` `AST` | yes      | number                                             |                                                                                                                                  |
| `ST`              | yes      | number                                             | Steals (`STL` also accepted).                                                                                                    |
| `BLK` `TO`        | yes      | number                                             |                                                                                                                                  |
| `Stat Basis`      | yes\*\*  | `TOTAL` or `PER_GAME`                              | `TOTAL` values are divided by `GP*`. Totals without `TOTAL` fail the per-game plausibility check and are rejected, not guessed.  |
| `Source`          | no       | e.g. `yahoo_screenshot`                            | Provenance.                                                                                                                      |
| `Captured At`     | no       | ISO date/time                                      | Snapshot identity. More than one value in a file raises a warning.                                                               |
| `Confidence`      | no       | `HIGH` / `MEDIUM` / `LOW`                          | Anything else rejects the row.                                                                                                   |
| `Review Fields`   | no       | `;`-separated, e.g. `FGM/A;PTS`                    | A flagged **stat** rejects the row (never inferred). Flagged `team`/`pos`/`rank` are nulled with a warning.                      |
| `QA Note`         | no       | text                                               | Provenance.                                                                                                                      |

\* makes/attempts must come from `FGM/A*` (or separate FGM + FGA columns). \*\* defaults to `PER_GAME` if the column is absent.

Header matching ignores case, `_` and Yahoo's trailing `*`. Import through **Data → Import** with kind `PROJECTION` and provider `yahoo`, or validate first:

```bash
npm run yahoo:projections -- --market data/private/yahoo-screenshot-2026-27.csv \
                             --projections data/private/yahoo-projections-2026-27.csv
```

## 2. Snapshots and reconciliation

- Each projection import is one batch (a **snapshot**). The newest commit becomes ACTIVE and the previous one SUPERSEDED. Records are never mixed across batches.
- **Data → Import history → Use this snapshot** re-activates an older snapshot (the current one is kept).
- **Data → Reconciliation** shows `matched · market-only · projection-only · ambiguous · team mismatch`.
  - Market-only players have no projection: they appear as _unprojected_ in draft search and can be marked taken, but are not ranked.
  - Projection-only players are valued normally (no market timing data).
  - Ambiguous rows are never merged; resolve them under **Review unmatched**.
- Identity creation (AUTO policy): a Yahoo import creates new players for unmatched rows only when all existing identities came from Yahoo. With identities from another provider, unmatched rows go to review instead. Identities created before this rule was recorded (no `origin`) count as non-Yahoo: in an older browser database, choose **Create unmatched** explicitly for the projection import.

## 3. Manual draft sync

Every available row has **Draft to me** (green) and **Mark taken** (blue).

| Action                    | Mouse       | Keyboard                                                             |
| ------------------------- | ----------- | -------------------------------------------------------------------- |
| Find a player             | search box  | `/`, then type part of the name (`jok`); accents/punctuation ignored |
| Choose among hits         | click row   | `↑` / `↓` in the search box                                          |
| **MARK TAKEN** (opponent) | Mark taken  | `Enter` in the search box (clears it, keeps focus) · `D` on a row    |
| **DRAFT TO MY TEAM**      | Draft to me | `Shift+Enter` in the search box · `M` on a row                       |
| Undo                      | ↶ Undo      | `U`                                                                  |
| Clear search              |             | `Esc`                                                                |

- Mark taken marks the player unavailable, advances exactly one pick and recalculates scarcity, timing and priority. No confirmation dialog. Undo restores the exact previous state.
- Search also lists matching players **without projections** (market-only) so an opponent pick of such a player can still be recorded.
- The status bar shows the overall pick, round, the slot on the clock, your slot, your next and following pick, picks before your next, available players (projected + unprojected) and your roster.
- If local tracking falls behind Yahoo: enter the Yahoo pick number and **Resync**, then turn on **Catch-up** and mark the missed players (they fill the unrecorded slots without moving the clock). Undo reverses opponent picks, your picks, catch-up picks and resyncs one step at a time.

## 4. Decision log (post-draft audit)

Every **Draft to me** stores a `decision` record on the PICK event (so Undo removes it with the pick). **Review → Draft decision log** lists them and downloads the full log as JSON (`kind: "decision-log"`: league, config version, active batches, the complete event log and every decision).

Each decision record (`DecisionRecord`, `src/domain/types/league.ts`) contains:

- `overallPick`, `round`, `onSchedule`
- `selected` and `recommended` (player, DDP raw/score/rank, BasePlayerValue, TeamFit, timing label and rule, survival band, ADP, XRank, risk, fit tags), `followedRecommendation`
- `alternatives`: the top 8 of the engine's priority order at that moment
- `profileBefore` / `profileAfter`: all 9 categories (state, d, need, punt π, punt level, override)
- `punt`: build before/after, active punts before/after, overrides
- `timing`: the chosen player's label and band, next pick, picks before it, gap type
- `available`: projected and unprojected counts plus the full priority order of available players
- `context`: active import batch ids, strategy config version, roster size before the pick

Together with the event log (all teams' picks, resyncs, voids), this reconstructs the available pool and the engine's view at every one of your picks.
