# data/

Production-data workspace for the calibration workflow. **Real data never goes into git**: this repository is public, and Yahoo Fantasy Plus, Hashtag and BBM data are licensed or personal.

```
data/
  README.md                 this file
  aliases.csv               alias table (alias,canonical,team): committed, names only
  templates/                header-only templates (committed)
    yahoo-screenshot.template.csv
    hashtag-projections.template.csv
    aliases.template.csv
  private/                  ← git-ignored: put your real files here
    yahoo-screenshot-2026-27.csv
    hashtag-2026-27.csv
    bbm-2026-27.csv         (optional, only if you legitimately have it)
    availability.csv        (optional)
    context.csv             (optional)
```

## 1. Yahoo screenshots → `data/private/yahoo-screenshot-2026-27.csv`

Use `templates/yahoo-screenshot.template.csv`. Add one row per player, for roughly the top 250.

- Copy **exactly** what the screenshot shows: `Player`, `Team`, `Pos` (e.g. `PG,SG`), `XRank`, `Rank`, `Last 7 Days ADP`, and `Status` (`INJ`, `GTD`, `O`, `IL`, …).
- `Source` = `yahoo_screenshot`. `Captured At` = the screenshot time (ISO). `Confidence` = `HIGH`/`MEDIUM`/`LOW`.
- If any value is unreadable, **leave it blank** and list its field in `Review Fields` (e.g. `adp;xrank`). **Never guess.**

## 2. Hashtag projections → `data/private/hashtag-2026-27.csv`

Use `templates/hashtag-projections.template.csv`. The headers follow Hashtag's projection table:

```
R#, ADP, PLAYER, TEAM, POS, GP, MPG, FG%, FT%, 3PM, PTS, TREB, AST, STL, BLK, TO, W18, W19, W20, W21
```

- **FG% and FT% need attempts.** Hashtag's `0.483 (7.1/14.7)` cells are parsed into pct, makes and attempts. Alternatively, supply separate `FGM`, `FGA`, `FTM` and `FTA` columns.
- `W18`–`W21` (per-player games in the fantasy playoff weeks) are optional. When present, the team playoff schedule is derived from them.
- `R#` and `ADP` are kept for comparison only.
- Per-game values are the default. If your file holds season totals, add a `BASIS` column with the value `TOTAL`.

## 3. Aliases → `data/aliases.csv`

Add rows when Yahoo and Hashtag spell a player differently and name + team matching fails. For example:

```
alias,canonical,team
Nic Claxton,Nicolas Claxton,BKN
```

The reconciliation report lists every ambiguous or unmatched player that still needs an alias or a manual decision.

## 4. Run

```bash
npm run calibrate -- --hashtag data/private/hashtag-2026-27.csv \
                     --yahoo data/private/yahoo-screenshot-2026-27.csv \
                     --aliases data/aliases.csv \
                     --out reports/private/2026-27
# optional: --bbm data/private/bbm-2026-27.csv --availability … --context … --playoff … --no-scenarios --top 200
```

**Outputs** in `reports/private/2026-27/`:

- `reconciliation.{md,json}`
- `calibration.{md,csv,json}`
- `scenarios.md` and `scenarios/*.json` (QA fixtures)
- `manifest.json`: input SHA-256 hashes and counts, so a report can be tied to exact inputs

The same files can be imported into the app: Data page → Yahoo market / Projections. The app then offers "Derive from hashtag" for the playoff schedule.
