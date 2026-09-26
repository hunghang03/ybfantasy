# Data sources (2026-27)

Each source keeps its own role. Values are **never averaged across providers**, and no source overwrites another source's fields.

| Source                                                                    | Role                                                                                               | Fields used                                                                                                                                         | Where it lives in the app                                                                                                                                     |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Yahoo market dataset** (screenshots of Yahoo Fantasy Plus, transcribed) | **Market/timing** source, plus player identity, eligibility and status                             | Yahoo name/team/id, **position eligibility** (authoritative), status (blank → null, GTD → DTD, INJ → INJ), **XRank**, **Rank**, **Last 7 Days ADP** | `YahooMarket` records plus identity positions/team. Used only by the market layer: timing bands, next-pick scarcity, labels. **Never** used for player value. |
| **Yahoo projection dataset** ("Remaining Games (proj)" view, transcribed) | **Primary statistical projection** source (v1 default)                                             | projected GP, FGM/FGA (combined `FGM/A` cell), FG%, FTM/FTA (`FTM/A`), FT%, 3PM, PTS, REB, AST, STL, BLK, TO; optional Pre-Season Rank              | `ProjectionLine` (provider `yahoo`), one **snapshot** per import. All engine value comes from the league's primary provider.                                  |
| Yahoo Pre-Season Rank (on the projection file)                            | **Comparison only**                                                                                | `providerRank` on the projection line                                                                                                               | Calibration report only.                                                                                                                                      |
| **Hashtag Basketball**                                                    | Optional **validation** provider (no longer required)                                              | same stat columns (`FGM, FGA, FG%, FTM, FTA, FT%`, …, optional W18–W21)                                                                             | `ProjectionLine` (provider `hashtag`). Compared, flagged as disagreement, never averaged. Its `R#`/ADP stay comparison-only.                                  |
| **Basketball Monster**                                                    | Optional **validation** provider, only with legitimate access to an export                         | same stat columns                                                                                                                                   | `ProjectionLine` (provider `bbm`). Flagged as disagreement, never averaged.                                                                                   |
| You                                                                       | Availability history, context (age, status, role tags), aliases, manual mappings, playoff schedule | see `DATA_IMPORT.md`                                                                                                                                | separate record types                                                                                                                                         |

The primary provider is a per-league setting (`LeagueProfile.primaryProjectionProvider`, default `yahoo`). The architecture stays provider-generic: any provider can be primary; the others are validation sources.

## Precedence rules

1. **Statistics come only from the active primary projection snapshot**: projected GP, FGM/FGA, FTM/FTA, FG%, FT%, 3PM, PTS, REB, AST, STL, BLK, TO. Switching the primary provider changes value but never touches market fields (tested invariant).
2. **Market fields come only from the Yahoo market dataset**: XRank, Rank, L7 ADP, eligibility, status, timing. Market ranking is **never** a substitute for statistical value, and L7 ADP never enters BasePlayerValue (tested: shuffling XRank/ADP/Rank leaves every BPV unchanged).
3. **Yahoo eligibility and team are authoritative** for identity. A projection row's own team is kept as `sourceTeam`; a difference is reported as a team mismatch, not applied.
4. **Snapshots are never mixed.** Each projection import is one timestamped batch. Only the ACTIVE batch is used; older snapshots stay stored and can be re-selected on the Data page (`Use this snapshot`). A file whose rows carry more than one `Captured At` value raises a warning before commit.
5. **Percentages are volume-weighted.** FG%/FT% value = (player% − population%) × attempts, and team percentages are ΣM/ΣA. Attempts are never derived from GP or a percentage.
6. **Unreadable screenshot values are never inferred.**
   - Market: a field listed in `Review Fields` is forced to `null` and flagged.
   - Projections: a **stat** listed in `Review Fields` rejects the row (a projection cannot be valued with a missing stat); a flagged team/position is nulled with a warning.
7. **Historical games played (durability) is a separate, future dataset.** Projected GP belongs to ExpectedSeasonValue; actual past GP belongs to availability risk. Nothing is fabricated in the meantime.
8. **Playoff schedule (W18–W21) is optional.** Without it the playoff adjustment is neutral (0).

## Screenshot transcription metadata

Every Yahoo row (market and projection) carries:

| Column          | Meaning                                                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Source`        | always `yahoo_screenshot` for screenshot transcriptions                                                                                                               |
| `Captured At`   | ISO timestamp of the screenshot                                                                                                                                       |
| `Confidence`    | `HIGH` / `MEDIUM` / `LOW` only. Rows needing human verification use `LOW` + `Review Fields` + `QA Note`; `REVIEW` is workflow state, not confidence, and is rejected. |
| `QA Note`       | free-text QA note, kept as provenance                                                                                                                                 |
| `Review Fields` | fields that could not be read. Market: forced to `null` (`xrank`, `rank`, `adp`, `status`, `positions`, `team`). Projections: a flagged stat rejects the row.         |

Raw cell values are preserved verbatim (`raw`) on every market and projection record for auditability.

## Licensing and what is committed

- **This repository is public.** Real Yahoo Fantasy Plus data and Hashtag or Basketball Monster projections are licensed or personal data. They are **never committed**.
- Real files go in `data/private/` (git-ignored). Reports derived from them go in `reports/private/` (git-ignored).
- The repository ships only header templates (`data/templates/`), the alias table format, and the **fictional** sample plus reports derived from it (`reports/sample/`).
- Nothing is scraped. There is no scraping behind logins or paywalls, and the app and scripts never fetch provider sites.
- If you want real-data reports in version control for Codex review, make the repository private first, or share the `reports/private/` folder out of band.
