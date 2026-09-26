# data/

Production-data workspace. **Real data never goes into git**: this repository is public, and Yahoo Fantasy Plus, Hashtag and BBM data are licensed or personal.

```
data/
  README.md                 this file
  aliases.csv               alias table (alias,canonical,team): committed, names only
  templates/                header-only templates (committed)
    yahoo-screenshot.template.csv      Yahoo market (XRank, Rank, L7 ADP, …)
    yahoo-projections.template.csv     Yahoo projections (PRIMARY)
    hashtag-projections.template.csv   optional validation source
    aliases.template.csv
  private/                  ← git-ignored: put your real files here
    yahoo-screenshot-2026-27.csv
    yahoo-projections-2026-27.csv
    hashtag-2026-27.csv     (optional validation)
    bbm-2026-27.csv         (optional validation, only if you legitimately have it)
    availability.csv        (optional)
    context.csv             (optional)
```

## 1. Yahoo screenshots → `data/private/yahoo-screenshot-2026-27.csv`

Use `templates/yahoo-screenshot.template.csv`. Add one row per player, for roughly the top 250.

- Copy **exactly** what the screenshot shows: `Player`, `Team`, `Pos` (e.g. `PG,SG`), `XRank`, `Rank`, `Last 7 Days ADP`, and `Status` (`INJ`, `GTD`, `O`, `IL`, …).
- `Source` = `yahoo_screenshot`. `Captured At` = the screenshot time (ISO). `Confidence` = `HIGH`/`MEDIUM`/`LOW`.
- If any value is unreadable, **leave it blank** and list its field in `Review Fields` (e.g. `adp;xrank`). **Never guess.**

## 2. Yahoo projections (primary) → `data/private/yahoo-projections-2026-27.csv`

Use `templates/yahoo-projections.template.csv`. Exact schema: see [docs/DRAFT_DAY.md §1](../docs/DRAFT_DAY.md#1-yahoo-projection-csv-schema).

- Copy Yahoo's **Remaining Games (proj)** view exactly. `FGM/A*` and `FTM/A*` stay as `made/attempted` cells (decimals allowed, e.g. `567.7/1149.4`); they are split exactly and never derived.
- Set `Stat Basis` to `TOTAL` if the view shows season totals, or `PER_GAME` for per-game values. Totals without `TOTAL` are rejected, not guessed.
- One capture per file (`Captured At`). Mixing captures raises a warning.

Validate against the market file before using it:

```bash
npm run yahoo:projections -- --market data/private/yahoo-screenshot-2026-27.csv \
                             --projections data/private/yahoo-projections-2026-27.csv
```

## 2b. Hashtag projections (optional validation) → `data/private/hashtag-2026-27.csv`

Use `templates/hashtag-projections.template.csv`. The headers follow Hashtag's projection table:

```
R#, ADP, PLAYER, TEAM, POS, GP, MPG, FGM, FGA, FG%, FTM, FTA, FT%, 3PM, PTS, TREB, AST, STL, BLK, TO, W18, W19, W20, W21
```

- **FG% and FT% need makes and attempts.** Copy Hashtag's `FGM`, `FGA`, `FG%`, `FTM`, `FTA` and `FT%` values exactly. All six are kept raw.
  - The engine uses **makes and attempts**. Makes and attempts are never reconstructed from a percentage: a row missing FGM/FGA or FTM/FTA is rejected.
  - The published percentage is a rounding-aware cross-check. A small mismatch gives a warning; a gross mismatch (likely a mis-mapped column) rejects the row.
  - A Hashtag-style `0.483 (7.1/14.7)` cell is also accepted as the source of makes/attempts.
- `W18`–`W21` (per-player games in the fantasy playoff weeks) are optional. When present, the team playoff schedule is derived from them.
- `R#` and `ADP` are kept for comparison only.
- Per-game values are the default. If your file holds season totals, add a `BASIS` column with the value `TOTAL`.

## 3. Aliases → `data/aliases.csv`

Confirmed identity pairs only: two spellings of ONE player on one team (e.g. the Yahoo market and Yahoo projection transcriptions). A row is added only after the pair has been confirmed from the source screenshots — never to clear the review queue. The table is applied in either direction, only on the given team, and never merges two identities that already exist separately.

```
alias,canonical,team
Herb Jones,Herbert Jones,NOP
```

`src/domain/identity/aliases.ts` mirrors this file for the app; a unit test keeps them identical.

The reconciliation report lists every ambiguous or unmatched player that still needs an alias or a manual decision.

## 4. Run

```bash
npm run calibrate -- --projections data/private/yahoo-projections-2026-27.csv \
                     --yahoo data/private/yahoo-screenshot-2026-27.csv \
                     --aliases data/aliases.csv \
                     --out reports/private/2026-27
# optional: --hashtag data/private/hashtag-2026-27.csv --bbm data/private/bbm-2026-27.csv --availability … --context … --playoff … --no-scenarios --top 200
```

**Outputs** in `reports/private/2026-27/`:

- `reconciliation.{md,json}`
- `calibration.{md,csv,json}`
- `scenarios.md` and `scenarios/*.json` (QA fixtures)
- `manifest.json`: input SHA-256 hashes and counts, so a report can be tied to exact inputs

The same files can be imported into the app: Data page → Yahoo market / Projections. The app then offers "Derive from hashtag" for the playoff schedule.
