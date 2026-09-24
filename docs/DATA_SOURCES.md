# Data sources (2026-27)

Each source keeps its own role. Values are **never averaged across providers**, and no source overwrites another source's fields.

| Source                                                                      | Role                                                                             | Fields used                                                                                                                                 | Where it lives in the app                                                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Yahoo** (screenshots of Yahoo Fantasy / Fantasy Plus, transcribed by you) | **Market** source, plus player identity, eligibility and status                  | Yahoo name/team/id, **position eligibility** (authoritative), status/injury marker, **XRank**, **Rank**, **Last 7 Days ADP** (Fantasy Plus) | `YahooMarket` records plus identity positions/team. Used only by the market layer: timing bands, next-pick scarcity, labels. **Never** used for player value. |
| **Hashtag Basketball** (your export or copy of the 2026-27 projections)     | **Primary statistical projection** source                                        | GP, MPG, FGM/FGA/FG%, FTM/FTA/FT%, 3PM, PTS, REB, AST, STL, BLK, TO, plus per-player **W18–W21** games where available                      | `ProjectionLine` (provider `hashtag`). All engine value comes from here.                                                                                      |
| Hashtag's own rank (`R#`) and published ADP                                 | **Comparison only**                                                              | `providerRank`, `providerAdp` on the projection line                                                                                        | Calibration report only. **Never** written to Yahoo market fields.                                                                                            |
| **Basketball Monster**                                                      | **Validation** provider, only when you have legitimate access to an export       | same stat columns                                                                                                                           | `ProjectionLine` (provider `bbm`). Flagged as disagreement, never averaged.                                                                                   |
| You                                                                         | Availability history, context (age, status, role tags), aliases, manual mappings | see `DATA_IMPORT.md`                                                                                                                        | separate record types                                                                                                                                         |

## Precedence rules

1. **Yahoo screenshot values are authoritative** for the Yahoo Fantasy Plus fields you captured, especially L7 ADP.
   - Hashtag's published "Yahoo ADP" is kept as `providerAdp` on the projection line and appears only in the calibration report, as the `Yahoo L7 ADP vs Hashtag ADP` delta.
   - There is no code path that copies `providerAdp` into `YahooMarket.yahooAdp7d`. A test asserts this.
2. **Yahoo eligibility is authoritative** for positions. The team is also taken from Yahoo after matching, because it is the more current source.
3. **Hashtag is the only source of statistical value** when it is the league's primary provider. Switching the primary provider changes value but never touches market fields (tested invariant).
4. **Unreadable screenshot values are `null`.** Values are never inferred.
   - The `Review Fields` column lists the fields you could not read, for example `adp;xrank`.
   - Any value typed in a flagged field is **ignored** and a warning is raised.
   - The player shows a "Yahoo field(s) need review" warning in the app.

## Screenshot transcription metadata

Every Yahoo row carries:

| Column          | Meaning                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `Source`        | always `yahoo_screenshot` for screenshot transcriptions                                                 |
| `Captured At`   | ISO timestamp of the screenshot                                                                         |
| `Confidence`    | `HIGH` / `MEDIUM` / `LOW`: your confidence in the transcription of that row                             |
| `Review Fields` | fields that could not be read (forced to `null`): `xrank`, `rank`, `adp`, `status`, `positions`, `team` |

Raw cell values are preserved verbatim (`raw`) on both Yahoo and Hashtag records for auditability.

## Licensing and what is committed

- **This repository is public.** Real Yahoo Fantasy Plus data and Hashtag or Basketball Monster projections are licensed or personal data. They are **never committed**.
- Real files go in `data/private/` (git-ignored). Reports derived from them go in `reports/private/` (git-ignored).
- The repository ships only header templates (`data/templates/`), the alias table format, and the **fictional** sample plus reports derived from it (`reports/sample/`).
- Nothing is scraped. There is no scraping behind logins or paywalls, and the app and scripts never fetch provider sites.
- If you want real-data reports in version control for Codex review, make the repository private first, or share the `reports/private/` folder out of band.
