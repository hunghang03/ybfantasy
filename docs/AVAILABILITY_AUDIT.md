# Availability / durability audit (no code or calibration changes)

Status: audit (§1–7) approved by Codex; availability-history import implemented (§8). No weight or threshold changed: `durabilityResidualWeight` 0.5 and `unknownHistoryRisk` 0.10 stay; history is residual risk only. Real-data player values (Yahoo-derived) are kept out of this public file; they are summarised in the Codex prompt and in `reports/private/` (git-ignored).

## 1. Current data flow

```
Yahoo projection file ── GP* ───────────► ProjectionLine.gp ─► a = GP/82 ─► ESV ─┐
                         (TOTAL ÷ GP → per-game stats → z → PG → PGV)             ├─► BPV ─► DDP
Yahoo market file ────── Status ────────► statusRisk ─► ρ_now ─┐                  │
AVAILABILITY import ──── GP per season ─► H ──────────► ρ_hist ├─► ρ_eff ─► RiskAdj ┘
CONTEXT import ───────── age, status, manualRiskDelta ─────────┘   (score / LOW… label = display only)
```

- Yahoo projections carry exactly one availability input: **projected GP** (`GP*`, Remaining Games = full season pre-season). It already embeds Yahoo's own durability expectation.
- **BPV** gets availability only through projected GP (via ESV).
- **DDP** = BPV + TeamFit + playoff + upside + **RiskAdj** + user preference. TeamFit, scarcity and playoff use per-game z (no GP).
- **`risk`** has no games-played input unless an AVAILABILITY history file is imported.
- Current real data: **0 availability-history rows, 0 context rows** (no ages), no MPG column in the Yahoo view.

## 2. Exact formulas (`src/domain/value/value.ts`, `src/domain/availability/availability.ts`)

### Value

```
PG   = Σ b_c · ẑ_c                                   per-game, capped z (b_TO = 0.75)
PGV  = PG − R                                        R = mean PG of the replacement band
Loss = max(PGV, 0) + (1 − r) · L                     r = replacementCoefficient 0.35; L = replacement counting output (SD units)
ESV  = PGV − (1 − a) · Loss                          a = clamp(projected GP / 82)
BPV  = PGV + (1 − perGameBlend) · (ESV − PGV)        perGameBlend 0.5  →  BPV = 0.5·PGV + 0.5·ESV
```

**BPV is a hybrid: 50 % per-game value, 50 % availability-adjusted season value.** Players projected below `populationMinGP` (20) are excluded from the z-score population.

### Risk

```
H (history) = weighted mean over up to 3 seasons (newest first, weights .5/.3/.2) of
     wMiss = Σ(missed × recurrenceWeight) / teamGames          if absences are itemised
     wMiss = (1 − GP/teamGames) × 0.75                         otherwise ("unclassified")
     recurrence weights LOW .25 · MODERATE .6 · HIGH 1.0 · UNCLASSIFIED .75
     no history → H = unknownHistoryRisk = 0.10
ρ_hist = H + chronic (0.05 if ≥ 2 seasons with a HIGH-recurrence absence) + max(0, age − 30) · 0.01
ρ_now  = statusRisk[status] + manualRiskDelta
         HEALTHY 0 · DTD .03 · INJ .08 · OUT_SHORT .08 · OUT_LONG .20 · SUSPENDED .02 · OUT_SEASON 1.0
score  = round(100 · (1 − clamp(ρ_hist + ρ_now)))       LOW ≥ 85 · MODERATE ≥ 70 · HIGH ≥ 50 · else VERY_HIGH
ρ_eff  = clamp(durabilityResidualWeight 0.5 · ρ_hist + ρ_now)
RiskAdj = − w(round) · ρ_eff · max(BPV, 1)              w: R1–3 .60 · R4–6 .35 · R7–10 .15 · R11+ .05
```

The label is display only; RiskAdj is what enters DDP.

### Consequence with today's data

Every player has H = 0.10 and age term 0, so only Yahoo status varies:

| Yahoo status | score | label    | ρ_eff |
| ------------ | ----- | -------- | ----- |
| blank        | 90    | LOW      | 0.05  |
| GTD → DTD    | 87    | LOW      | 0.08  |
| INJ          | 82    | MODERATE | 0.13  |

Real data: 296 LOW, 3 MODERATE. RiskAdj ≈ −3 % to −5 % of BPV for almost everyone — it barely differentiates. **LOW currently means "no durability data", not "durable".**

## 3. Available but unused

- AVAILABILITY history import (season, GP, team games, missed by recurrence): supported, **no file imported**.
- CONTEXT import (age, current status, manual risk delta, previous-season MPG): supported, **no file imported** → age term 0.
- Yahoo Pre-Season Rank: comparison only. Yahoo Rank: last market-reference fallback only.
- Projected GP is **not** discarded (used in ESV and the population GP filter).

## 4. Does 3-season GP history add new information?

- **Mean: largely redundant.** Projected GP already prices expected absences through ESV. Multiplying BPV/DDP by historical average GP (e.g. 49/82) would **double-count**. Do not do this.
- **New information:** (1) dispersion / tail risk (e.g. 76 → 51 → 20 is a wide outcome range a point estimate hides); (2) recurrence pattern, when absences are itemised; (3) a cross-check of projected GP vs history, to be **flagged**, not applied.
- The model already treats history as a **residual** (0.5 · ρ_hist into ρ_eff), not as expected games. Example: a player with 76 / 51 / 20 GP (no itemised absences) gets H = 0.5·0.567 + 0.3·0.284 + 0.2·0.055 = **0.379** → score ≈ 59 (HIGH), ρ_eff ≈ 0.22 with DTD, RiskAdj ≈ −0.13·BPV in rounds 1–3 (today ≈ −0.05·BPV).
- **Decision needed before import:** whether `durabilityResidualWeight` (0.5) and `unknownHistoryRisk` (0.10) are right _given_ projected GP is already applied. That is a calibration question.

## 5. Recommended raw schema (one row per player per season)

```
Player, Team(s), Season, GP, Games Available, Team Games,
Missed LOW, Missed MODERATE, Missed HIGH, Missed Unclassified,
Suspension Games, Other Non-Injury Games, Status Note,
Source, Captured At, Confidence, Review Fields, QA Note
```

- `Games Available` = games the player could have played (after joining the league, across all teams).
- `Team Games` = season length (82, or the shortened schedule).
- Constraint: sum of missed ≤ Games Available − GP; the remainder is unclassified.
- Confidence HIGH | MEDIUM | LOW only; unreadable values blank + Review Fields + QA Note; never inferred.
- Loads through the existing AVAILABILITY import (extend it with Games Available, Suspension Games, Other Non-Injury Games and provenance).

## 6. Edge cases

| Case                                                  | Handling                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Rookie (no NBA season)                                | No rows → H = unknown default. Never fabricate college/overseas GP.                                                 |
| Sophomore (1 season)                                  | Use it, but shrink toward the unknown default in proportion to the missing weight (0.3 + 0.2). **Decision needed.** |
| Partial season (signed mid-season, two-way, overseas) | Measure against `Games Available`; games he could not play are not missed.                                          |
| Trade                                                 | Sum GP across teams; `Games Available` may be 80–84 (cap); one row per season.                                      |
| Suspension                                            | Own column; excluded from injury recurrence.                                                                        |
| Shortened season                                      | `Team Games` = actual schedule. (2023-24 to 2025-26 were 82-game seasons.)                                          |
| Rest / load management                                | Unclassified unless the source says otherwise; optional LOW recurrence.                                             |
| Current injury                                        | Stays in `status` (ρ_now), separate from history (ρ_hist).                                                          |

## 7. Not changed

No formula, weight, threshold, BPV, DDP or data file was changed by this audit.

## 8. Implementation (approved)

- **Import:** kind AVAILABILITY, template `data/templates/availability-history.template.csv`:

  ```
  Player ID,Player,Team(s),Season,GP,Games Available,Team Games,Missed LOW,Missed MODERATE,Missed HIGH,Missed Unclassified,Suspension Games,Other Non-Injury Games,Status Note,Source,Captured At,Confidence,Review Fields,QA Note
  ```

- **Validation:** Confidence HIGH | MEDIUM | LOW; Season `YYYY-YY` (consecutive years); GP ≤ Games Available; Games Available ≤ Team Games + 4 (trades); missed LOW + MODERATE + HIGH + Unclassified + Suspension + Other ≤ Games Available − GP; GP flagged in Review Fields → row rejected; duplicate player-season → rejected as duplicate. Blank Games Available → Team Games (warning). Raw cells and provenance are stored.
- **Scoring per season:** share = (Σ itemised injury games × recurrence weight + unexplained × 0.75) / Games Available, where unexplained = Games Available − GP − itemised − suspension − other non-injury. Suspension and other non-injury games never count (nor toward the chronic pattern). Unexplained games stay UNCLASSIFIED — never assumed to be a known injury type.
- **Window & shrinkage:** seasons are placed by their distance from the most recent history season in the dataset (weights .5/.3/.2). A season with no row keeps its weight at `unknownHistoryRisk` (sophomores / returners). No row at all → the unknown default, as before. Seasons outside the window are ignored.
- **Identity:** the existing matcher and confirmed alias table only (provider id → name + team → alias → unique name → review). Several teams (trade) are tried one by one; history never changes the identity's current team or eligibility, and never creates an identity. A real `Player ID` is recorded for that source; blank IDs are never filled.
- **Presentation:** without any season of history a LOW score is shown as **NO HIST / UNKNOWN** (numbers unchanged; a status-driven MODERATE+ still shows). Player detail shows history coverage.
- **`AVAILABILITY_PROJECTION_GAP`:** player warning when |projected GP − recent GP rate| ≥ 8 with ≥ 2 seasons (rate = GP × 82 / Games Available, averaged). Config `availabilityGapFlag` (v6). Flag only — never changes BPV, DDP or risk.
- **Tests:** `tests/unit/availability-history.test.ts` (Anthony Davis 76/51/20 → H = 0.3796, score 59 HIGH with DTD; BPV unchanged; gap flag 58 vs 49), `tests/unit/availability.test.ts`.

### Notes for whoever transcribes the history file

1. **Names:** use the Yahoo market spelling. Other spellings match only through `data/aliases.csv`; anything else goes to the review queue (history never creates players).
2. **One row per player per season** for 2023-24, 2024-25 and 2025-26 only. Traded player: ONE row, `Team(s)` like `BKN/PHX`, GP summed across teams, Games Available = games while he was in the league (may exceed 82 by up to 4).
3. **No row** for a season the player was not in the NBA (college, overseas, unsigned). A season in the NBA but fully injured: a row with GP 0.
4. **Games Available** is the key partial-season field (signed mid-season, two-way limits, called up): count only games he could have played.
5. **Blank means unknown.** Leave missed-by-type columns blank when the reason is unknown; the remainder becomes UNCLASSIFIED. Put suspensions and non-injury absences (personal, not with team) in their own columns — they never count as injury.
6. **Player ID:** only a stable ID printed by the source (e.g. an NBA.com / Basketball-Reference ID), same source for every row; otherwise blank. Import with one provider id (e.g. `nba_history`).
7. **Confidence** HIGH | MEDIUM | LOW. Unsure rows: LOW + `Review Fields` + `QA Note`. Unreadable GP → leave blank, list `GP` in Review Fields (the row is rejected, not guessed).
8. **Rookies (2026-27 first year):** no rows at all — they show NO HISTORY.
9. Keep the real file in `data/private/` (git-ignored); the repository is public.
