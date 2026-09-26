# Data import

All data is imported manually as **CSV or JSON** (an array of objects), on the **Data** page. Nothing is scraped. Templates with the recognized headers are in `sample-data/templates/`. Fictional example files are in `sample-data/`; the "Load fictional sample data" button imports them all.

## Workflow

1. **Choose the dataset type.** Then set the provider id (`yahoo` for both Yahoo datasets; `hashtag`, `bbm` for optional validation sources), the season, and a source/version note. The Yahoo projection schema is in [docs/DRAFT_DAY.md](docs/DRAFT_DAY.md).
2. **Drag and drop a file**, or choose one. The limits are 5 MB and 5,000 rows.
3. **Column mapping.** Headers are auto-mapped by synonym (case-insensitive), and every field can be re-mapped. Required fields are marked `*`.
4. **Preview.** The first rows are validated live, and a summary shows how many rows will be imported, new players, rows to review, rejected rows, duplicates and warnings.
5. **Import.** The whole plan is written in **one atomic IndexedDB transaction**. A failure writes nothing (rollback), and a report is shown.
6. **History.** Every import is a versioned batch. A new import of the same type and provider **supersedes** the previous one. **Revert** reactivates the previous version.

## Dataset types and fields

| Type                       | Required                                                                                                           | Optional                                                                                                                                                                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Projections (per provider) | name, GP, 3PM, PTS, REB, AST, STL, BLK, TO, **FGM + FGA and FTM + FTA** (columns, or `pct (makes/attempts)` cells) | team, positions, provider id, MPG, FG%, FT%, basis (`PER_GAME`/`TOTAL`), upside (0–1), `R#`, `ADP`, `W18`–`W21`                                                                                  | Makes and attempts are **never** reconstructed from a percentage; a missing value rejects the row. FG%/FT% are cross-checked against M/A with a rounding-aware tolerance (config tolerance + the effect of the source's displayed decimals): a small mismatch warns, a mismatch 0.05 beyond that rejects the row (likely a mis-mapped column). Raw cells for all six shooting fields are preserved. `TOTAL` stats are divided by GP. |
| Yahoo market               | name                                                                                                               | team, positions, Yahoo id, **XRank**, **Rank**, **Last 7 Days ADP**, status                                                                                                                      | The three market fields are stored separately and never combined. Yahoo positions become authoritative eligibility. Status markers are mapped (`GTD`/`DTD` → DTD, `INJ` → INJ (injured, duration unknown — never read as short or long), `O` → OUT_SHORT, `IL`/`NA` → OUT_LONG, `SUSP` → SUSPENDED); a blank status stays null and the raw cell is kept.                                                                             |
| Availability history       | name, season (YYYY-YY), GP                                                                                         | Player ID (only a real source ID), Team(s), Games Available, Team Games, missed LOW / MODERATE / HIGH / Unclassified, Suspension Games, Other Non-Injury Games, Status Note, provenance          | One row per player-season, 3-season window. Residual durability risk only — never multiplies BPV/DDP. Template and rules: `data/templates/availability-history.template.csv`, [docs/AVAILABILITY_AUDIT.md](docs/AVAILABILITY_AUDIT.md) §8.                                                                                                                                                                                           |
| Player context             | name                                                                                                               | age, status, risk delta (−0.3…0.3), manual upside, provider upside, role tags (`STARTER_OPPORTUNITY; INJURY_AWAY_ROLE; DEPTH_CHART_RISE; ROOKIE_ROLE`), previous-season MPG, recovery note, note | Age is used **only** for risk, never for upside.                                                                                                                                                                                                                                                                                                                                                                                     |
| Playoff schedule           | team                                                                                                               | `W18`, `W19`, … columns (0–7 games)                                                                                                                                                              | Team-level. Weeks are taken from the league's playoff weeks.                                                                                                                                                                                                                                                                                                                                                                         |

## Validation

Rows are rejected (and listed) for any of the following:

- non-numeric values or out-of-range numbers
- negative stats
- makes > attempts
- GP outside 0…season length
- team games ≤ 0
- ADP / XRank / Rank < 1
- unknown positions or role tags
- implausibly large per-game values (a hint that the basis is wrong)

Free text is stripped of control characters and length-capped. It is rendered only through React escaping. Content is never evaluated.

## Player identity and reconciliation

Names are normalized as follows: NFD with diacritics stripped, lowercase, suffixes (`jr sr ii iii iv v`) removed, apostrophes and periods removed, hyphens turned into spaces, whitespace collapsed.

**Matching order:**

1. manual mapping (provider + provider key)
2. provider player id
3. normalized name + team
4. alias
5. normalized name, **only if unique**
6. otherwise → the **Unmatched review** queue

**Rules:**

- Ambiguity at any step is never auto-resolved.
- A weak (name-only or alias) match onto a player already claimed or created **in the same import** is treated as ambiguous, or as a new player on the first import. Two same-name players are never merged.
- On the **first** import (empty database), projections and market rows create identities (policy `AUTO`). Later imports send no-match rows to review unless you choose "Create new players for no-match rows". Ambiguous rows always go to review.

**Review screen:**

- Map to an existing player. The candidates are fuzzy suggestions (Jaro-Winkler ≥ 0.8) plus name search.
- Create a new player.
- Ignore.

Every decision is stored as a `ManualMapping` and applied first on all future imports from that provider, so corrections survive re-imports.

## Projection sources

- One provider per league is the **primary** source (Setup; default `yahoo`). It drives all statistical value. No other provider is required.
- Other providers listed as **validation sources** are scored with the primary population's μ/σ/p. A player is flagged with **PROJECTION DISAGREEMENT** when the neutral-value difference exceeds 0.75 population SD, or GP differs by more than 15.
- Sources are never averaged.
- Yahoo's own stat columns are not imported as projections in v1: Yahoo shows FG% and FT% without attempts, so volume-sensitive values would be impossible. To use them, import them as a separate projection provider with FGA and FTA.

## Data confidence

| Level  | Condition                                                                   |
| ------ | --------------------------------------------------------------------------- |
| HIGH   | primary projection + market + availability history, no flagged disagreement |
| MEDIUM | history missing                                                             |
| LOW    | missing projection or market, or a flagged disagreement                     |

Missing values are never treated as average:

- A player without a primary projection is shown as unranked.
- Missing history uses a flagged default risk.
- Missing ADP falls back to XRank, then Rank; the source is shown.

## Copyright

Do not commit proprietary datasets. The repository contains only fictional, seeded sample data (`src/lib/sample/generator.ts`). Regenerate it with `npm run sample-data`.

## Production data (2026-27) and screenshot metadata

See `docs/DATA_SOURCES.md` and `data/README.md`.

**Yahoo imports** accept four additional columns:

- `Source`
- `Captured At`
- `Confidence` (`HIGH`/`MEDIUM`/`LOW`)
- `Review Fields` (`;`-separated: `xrank`, `rank`, `adp`, `status`, `positions`, `team`)

Flagged fields are forced to `null`, even if a value was typed, and the player shows a review warning.

**Projection imports** accept three additional kinds of column:

- `R#`: the provider's rank
- `ADP`: the provider-published ADP
- per-player `W18`…`W21` games

The first two are comparison-only fields. They are never used as Yahoo market data. The week columns can be turned into the team playoff schedule (Data page → "Derive from hashtag", or automatically in `npm run calibrate`).

Raw cell values of mapped columns are preserved on Yahoo and projection records (`raw`).
