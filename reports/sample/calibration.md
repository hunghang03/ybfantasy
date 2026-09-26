# Calibration report — FICTIONAL SAMPLE DATA (pipeline validation only — not real players)

League: 14 teams, 13 rounds, primary provider `yahoo`, validation: bbm, hashtag.
Population 202 (converged true), replacement PG -3.15, missed-game L 7.96.

> Engine ranks are NEUTRAL (no roster, no market). Punt/team-fit and positional/scarcity classes only apply in draft scenarios.
> Delta = otherRank − engineRank; positive means the engine ranks the player earlier than the other source.
> Classifications are TENTATIVE and automated. Every MAJOR row must be confirmed by a human in docs/CALIBRATION.md.
> Weights are never changed from this report alone (calibration principle).

## Summary

Rows 233 · ≥15-rank disagreements 52 · ≥30-rank MAJOR 143

Median |Δ engine vs provider rank| 36 · median |Δ engine vs XRank| 32 · median |Yahoo L7 ADP − provider ADP| —

Primary tentative class of flagged rows: SOURCE_DATA_MISMATCH 52, PERCENTAGE_VOLUME_DIFFERENCE 21, LIKELY_ENGINE_DEFECT 62, GP_DURABILITY_ADJUSTMENT 53, INTENTIONAL_ENGINE_BEHAVIOR 7

## MAJOR disagreements (143)

| Engine | Player | Pos | XRank | Y L7 ADP | Proj rank | Proj ADP | Δ proj | Δ XRank | Δ ADP | GP | Risk | Strengths | Tentative class | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cyrus Ingram | SG/SF | 54 | 38.6 | 37 | — | 36 | 53 | — | 80 | LOW | FT% 3PM PTS STL | SOURCE_DATA_MISMATCH, PERCENTAGE_VOLUME_DIFFERENCE | projection Δ vs bbm / volume-weighted z FG 0.06, FT 2.84 |
| 6 | Kellan Lockhart | PG | 36 | 37.7 | 21 | — | 15 | 30 | — | 76 | LOW | 3PM PTS AST STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 9 | Niall Northcott | PF/C | 40 | 35.5 | 29 | — | 20 | 31 | — | 79 | LOW | FT% 3PM BLK | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 10 | Orin Hartwell | SG | 27 | 35.4 | 46 | — | 36 | 17 | — | 76 | LOW | 3PM PTS STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 14 | Linus Eastlake | C | 35 | 49.2 | 51 | — | 37 | 21 | — | 78 | LOW | FG% REB BLK | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG 2.33, FT -4.32 / neutral 9-cat rank 33 vs BPV rank 14 (TO weight 0.75, z-cap on FT%/REB/BLK) |
| 18 | Yuri Ravensworth | SG/SF | 39 | 52.2 | 50 | — | 32 | 21 | — | 71 | LOW | FT% PTS | SOURCE_DATA_MISMATCH, PERCENTAGE_VOLUME_DIFFERENCE | projection Δ vs bbm / volume-weighted z FG -0.36, FT 2.09 |
| 19 | Orin Wolcott | SG/SF | 59 | 46 | 44 | — | 25 | 40 | — | 77 | LOW | 3PM STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 21 | Quincy Fairbourne | PG | 51 | 40.3 | 43 | — | 22 | 30 | — | 77 | LOW | FT% 3PM PTS AST STL | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -1.24, FT 1.79 |
| 29 | Milo Northcott | PF | 52 | 68.1 | 64 | — | 35 | 23 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 36 | Kade Draven | C | 55 | 67 | 66 | — | 30 | 19 | — | 77 | LOW | FG% REB BLK | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG 2.24, FT -3.10 |
| 37 | Florian Ravensworth | SF/PF | 63 | 57.2 | 67 | — | 30 | 26 | — | 78 | LOW | STL | GP_DURABILITY_ADJUSTMENT | GP 78, per-game rank 47 vs season-blended rank 37, risk LOW |
| 38 | Ulises Zeller | SG/SF | 5 | 8.5 | 1 | — | -37 | -33 | — | 70 | LOW | 3PM PTS STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 48 | Idris Underhill | SF/PF | 71 | 87.1 | 86 | — | 38 | 23 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 49 | Hugo Kestrel | PG | 111 | 120.9 | 125 | — | 76 | 62 | — | 75 | LOW | FT% AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 52 | Eli Fairbourne | C | 173 | 157.5 | 175 | — | 123 | 121 | — | 75 | LOW | REB BLK | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 53 | Emeka Corvell | SG | 107 | 97.4 | 96 | — | 43 | 54 | — | 80 | LOW | STL | GP_DURABILITY_ADJUSTMENT | GP 80, per-game rank 66 vs season-blended rank 53, risk LOW |
| 54 | Idris Pembrook | SG | 113 | 97 | 110 | — | 56 | 59 | — | 79 | LOW | FT% STL | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 79, per-game rank 64 vs season-blended rank 54, risk LOW / neutral 9-cat rank 64 vs BPV rank 54 (TO weight 0.75) |
| 56 | Florian Yarrow | PG/SG | 81 | 86.5 | 88 | — | 32 | 25 | — | 76 | LOW | FT% AST | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -0.46, FT 2.25 / neutral 9-cat rank 68 vs BPV rank 56 (TO weight 0.75) |
| 58 | Finn Abernet | SF/PF | 26 | 19.2 | 27 | — | -31 | -32 | — | 54 | HIGH | PTS | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 54, per-game rank 39 vs season-blended rank 58, risk HIGH / neutral 9-cat rank 48 vs BPV rank 58 (TO weight 0.75) |
| 59 | Soren Yarrow | SF/PF | 30 | 22.6 | 17 | — | -42 | -29 | — | 73 | LOW | STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 67 | Niall Pembrook | C | 97 | 107 | 107 | — | 40 | 30 | — | 53 | HIGH | FG% REB BLK | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 53, per-game rank 46 vs season-blended rank 67, risk HIGH / neutral 9-cat rank 39 vs BPV rank 67 (TO weight 0.75) |
| 68 | Eli Zeller | PG/SG | 169 | 169 | 159 | — | 91 | 101 | — | 74 | LOW | FT% AST | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -0.47, FT 1.66 |
| 74 | Lior Everly | PF/C | 38 | 28.6 | 28 | — | -46 | -36 | — | 49 | HIGH | PTS BLK | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 49, per-game rank 45 vs season-blended rank 74, risk HIGH / neutral 9-cat rank 46 vs BPV rank 74 (TO weight 0.75) |
| 76 | Hugo Yarrow | SG | 44 | 45.2 | 32 | — | -44 | -32 | — | 55 | HIGH | 3PM PTS STL | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 55, per-game rank 54 vs season-blended rank 76, risk HIGH / neutral 9-cat rank 57 vs BPV rank 76 (TO weight 0.75) |
| 77 | Ivo Yarrow | PG | 110 | 93.3 | 108 | — | 31 | 33 | — | 71 | LOW | AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 78 | Kellan Oakridge | SF/PF | 22 | 29.5 | 24 | — | -54 | -56 | — | 74 | LOW | PTS | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -1.86, FT -0.20 / neutral 9-cat rank 95 vs BPV rank 78 (TO weight 0.75) |
| 80 | Eli Ravensworth | C | 162 | 161.2 | 148 | — | 68 | 82 | — | 75 | LOW | FG% REB BLK | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 81 | Idris Thorne | PG | 121 | 127.1 | 120 | — | 39 | 40 | — | 74 | LOW | FT% AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 82 | Rowan Hartwell | C | 187 | 188.4 | 190 | — | 108 | 105 | — | 80 | LOW | REB TO | GP_DURABILITY_ADJUSTMENT | GP 80, per-game rank 96 vs season-blended rank 82, risk LOW |
| 83 | Yuri Calloway | PF | 37 | 45.9 | 36 | — | -47 | -46 | — | 78 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 78, per-game rank 93 vs season-blended rank 83, risk LOW / neutral 9-cat rank 99 vs BPV rank 83 (TO weight 0.75) |
| 85 | Wes Ravensworth | C | 151 | 146.6 | 146 | — | 61 | 66 | — | 79 | LOW | BLK | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 79, per-game rank 102 vs season-blended rank 85, risk LOW / neutral 9-cat rank 98 vs BPV rank 85 (TO weight 0.75) |
| 86 | Emeka Jessop | PG/SG | 105 | 120.6 | 132 | — | 46 | 19 | — | 78 | LOW | AST | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 78, per-game rank 101 vs season-blended rank 86, risk LOW / neutral 9-cat rank 103 vs BPV rank 86 (TO weight 0.75) |
| 88 | Soren Fairbourne | SF | 118 | 110.1 | 124 | — | 36 | 30 | — | 73 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 89 | Ivo Pembrook | C | 254 | — | 261 | — | 172 | 165 | — | 59 | HIGH | REB BLK TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 59, per-game rank 82 vs season-blended rank 89, risk HIGH / neutral 9-cat rank 67 vs BPV rank 89 (TO weight 0.75) |
| 90 | Orin Northcott | SG/SF | 131 | 137.4 | 136 | — | 46 | 41 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 92 | Nico Fairbourne | C | 206 | — | 205 | — | 113 | 114 | — | 74 | LOW | BLK TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 93 | Blake Hartwell | PF | 167 | 156.9 | 145 | — | 52 | 74 | — | 78 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 78, per-game rank 108 vs season-blended rank 93, risk LOW / neutral 9-cat rank 107 vs BPV rank 93 (TO weight 0.75) |
| 96 | Quincy Zeller | PF/C | 70 | 49.4 | 54 | — | -42 | -26 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 75, per-game rank 106 vs season-blended rank 96, risk LOW |
| 97 | Jonah Northcott | SG/SF | 1 | 2.4 | 6 | — | -91 | -96 | — | 73 | LOW | 3PM PTS | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -3.15, FT -0.63 / neutral 9-cat rank 121 vs BPV rank 97 (TO weight 0.75, z-cap on FG%) |
| 98 | Dorian Vexley | SG/SF | 32 | 53.9 | 39 | — | -59 | -66 | — | 77 | LOW |  | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | GP 77, per-game rank 109 vs season-blended rank 98, risk LOW / volume-weighted z FG -2.07, FT 0.41 / neutral 9-cat rank 120 vs BPV rank 98 (TO weight 0.75) |
| 99 | Kade Abernet | C | 225 | — | 235 | — | 136 | 126 | — | 71 | LOW | FG% BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 100 | Kade Ingram | C | 207 | — | 226 | — | 126 | 107 | — | 56 | LOW | FG% REB TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 56, per-game rank 83 vs season-blended rank 100, risk LOW / neutral 9-cat rank 72 vs BPV rank 100 (TO weight 0.75) |
| 101 | Lior Underhill | C | 161 | 157.4 | 167 | — | 66 | 60 | — | 78 | LOW | REB BLK | GP_DURABILITY_ADJUSTMENT | GP 78, per-game rank 113 vs season-blended rank 101, risk LOW |
| 102 | Lior Vexley | C | 170 | 175.5 | 173 | — | 71 | 68 | — | 73 | LOW | FG% BLK | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 104 | Lior Jessop | PF | 160 | 171.2 | 162 | — | 58 | 56 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 75, per-game rank 115 vs season-blended rank 104, risk LOW |
| 105 | Dorian Eastlake | PG | 67 | 61.9 | 57 | — | -48 | -38 | — | 51 | HIGH | 3PM AST | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE | GP 51, per-game rank 78 vs season-blended rank 105, risk HIGH / volume-weighted z FG -2.15, FT 0.34 |
| 110 | Jalen Yarrow | C | 183 | — | 189 | — | 79 | 73 | — | 71 | LOW | FG% REB BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 111 | Soren Marlow | SG | 62 | 59.5 | 52 | — | -59 | -49 | — | 45 | HIGH | 3PM PTS | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 45, per-game rank 76 vs season-blended rank 111, risk HIGH / neutral 9-cat rank 77 vs BPV rank 111 (TO weight 0.75) |
| 112 | Ulises Vexley | PG | 150 | 143.7 | 157 | — | 45 | 38 | — | 73 | LOW | AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 113 | Hugo Lockhart | SG/SF | 69 | 82.3 | 84 | — | -29 | -44 | — | 71 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 115 | Linus Underhill | SF/PF | 136 | 147.4 | 151 | — | 36 | 21 | — | 73 | LOW | STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 116 | Ansel Stroud | C | 244 | — | 241 | — | 125 | 128 | — | 70 | LOW | FG% REB | SOURCE_DATA_MISMATCH, PERCENTAGE_VOLUME_DIFFERENCE | Yahoo review: adp / volume-weighted z FG 1.29, FT -2.17 |
| 117 | Vance Calloway | PF | 146 | 159.6 | 150 | — | 33 | 29 | — | 77 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 77, per-game rank 129 vs season-blended rank 117, risk LOW |
| 118 | Avery Quill | C | 234 | — | 233 | — | 115 | 116 | — | 72 | LOW | BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 120 | Finn Eastlake | C | 229 | — | 244 | — | 124 | 109 | — | 74 | LOW | FG% BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 121 | Galen Vexley | C | 197 | — | 177 | — | 56 | 76 | — | 77 | LOW | BLK | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT | Yahoo review: adp / GP 77, per-game rank 133 vs season-blended rank 121, risk LOW |
| 123 | Rowan Calloway | SF/PF | 86 | 94.9 | 74 | — | -49 | -37 | — | 74 | LOW |  | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -1.82, FT 0.18 / neutral 9-cat rank 133 vs BPV rank 123 (TO weight 0.75) |
| 124 | Lior Draven | SG/SF | 191 | 172.7 | 181 | — | 57 | 67 | — | 75 | LOW | FT% | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 125 | Cam Garrow | C | 91 | 91.9 | 95 | — | -30 | -34 | — | 73 | LOW | FG% REB | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG 1.92, FT -1.84 |
| 126 | Blake Calloway | SF/PF | 179 | 178.6 | 168 | — | 42 | 53 | — | 75 | LOW | TO | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 127 | Florian Pembrook | SG | 72 | 82.6 | 81 | — | -46 | -55 | — | 71 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 128 | Bram Pembrook | SG/SF | 75 | 56.4 | 55 | — | -73 | -53 | — | 73 | LOW | 3PM | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -2.42, FT 0.64 / neutral 9-cat rank 139 vs BPV rank 128 (TO weight 0.75) |
| 129 | Wes Garrow | SG | 163 | 182.1 | 180 | — | 51 | 34 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 130 | Quincy Kestrel | C | 248 | — | 234 | — | 104 | 118 | — | 74 | LOW | BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 133 | Niall Abernet | PG | 68 | 86.2 | 78 | — | -55 | -65 | — | 48 | VERY_HIGH | AST STL | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 48, per-game rank 90 vs season-blended rank 133, risk VERY_HIGH / neutral 9-cat rank 118 vs BPV rank 133 (TO weight 0.75) |
| 135 | Zane Pembrook | SF | 213 | — | 217 | — | 82 | 78 | — | 68 | LOW |  | SOURCE_DATA_MISMATCH, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / neutral 9-cat rank 125 vs BPV rank 135 (TO weight 0.75) |
| 136 | Idris Fairbourne | PG/SG | 99 | 104.9 | 98 | — | -38 | -37 | — | 74 | LOW | AST STL | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 157 vs BPV rank 136 (TO weight 0.75) |
| 138 | Bram Wolcott | SF | 134 | 118.2 | 106 | — | -32 | -4 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 139 | Yuri Oakridge | PF | 100 | 106.6 | 114 | — | -25 | -39 | — | 68 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 140 | Marek Kestrel | PF/C | 235 | — | 216 | — | 76 | 95 | — | 80 | LOW | TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT | Yahoo review: adp / GP 80, per-game rank 153 vs season-blended rank 140, risk LOW |
| 141 | Orin Underhill | PF | 219 | — | 209 | — | 68 | 78 | — | 80 | LOW | TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 80, per-game rank 154 vs season-blended rank 141, risk LOW / neutral 9-cat rank 151 vs BPV rank 141 (TO weight 0.75) |
| 143 | Finn Oakridge | PF | 109 | 101.1 | 112 | — | -31 | -34 | — | 47 | VERY_HIGH |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 47, per-game rank 97 vs season-blended rank 143, risk VERY_HIGH / neutral 9-cat rank 94 vs BPV rank 143 (TO weight 0.75) |
| 144 | Ansel Pembrook | PF | 115 | 106.2 | 105 | — | -39 | -29 | — | 70 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 145 | Nico Oakridge | C | 215 | — | 197 | — | 52 | 70 | — | 71 | LOW | BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 147 | Jalen Ravensworth | C | 282 | — | 292 | — | 145 | 135 | — | 58 | MODERATE | TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 58, per-game rank 134 vs season-blended rank 147, risk MODERATE / neutral 9-cat rank 124 vs BPV rank 147 (TO weight 0.75) |
| 148 | Pax Jessop | C | 227 | — | 223 | — | 75 | 79 | — | 56 | VERY_HIGH | BLK | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 56, per-game rank 127 vs season-blended rank 148, risk VERY_HIGH / neutral 9-cat rank 129 vs BPV rank 148 (TO weight 0.75) |
| 149 | Emeka Pembrook | C | 270 | — | 283 | — | 134 | 121 | — | 73 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 151 | Orin Abernet | PG/SG | 94 | 100.9 | 103 | — | -48 | -57 | — | 62 | HIGH | AST | GP_DURABILITY_ADJUSTMENT | GP 62, per-game rank 141 vs season-blended rank 151, risk HIGH |
| 153 | Linus Blackwood | PF | 96 | 91.4 | 85 | — | -68 | -57 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 154 | Xander Stroud | SG/SF | 126 | 115.7 | 121 | — | -33 | -28 | — | 73 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 156 | Xander Blackwood | SF | 66 | 74.2 | 73 | — | -83 | -90 | — | 74 | LOW |  | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -1.61, FT -1.46 / neutral 9-cat rank 173 vs BPV rank 156 (TO weight 0.75) |
| 157 | Linus Oakridge | SF | 217 | — | 222 | — | 65 | 60 | — | 74 | LOW |  | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 158 | Bram Eastlake | PG/SG | 224 | — | 236 | — | 78 | 66 | — | 78 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 78, per-game rank 176 vs season-blended rank 158, risk LOW / neutral 9-cat rank 179 vs BPV rank 158 (TO weight 0.75) |
| 159 | Cam Wolcott | PF/C | 125 | 123 | 111 | — | -48 | -34 | — | 73 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 160 | Galen Calloway | C | 84 | 78.1 | 79 | — | -81 | -76 | — | 74 | LOW | REB | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | GP 74, per-game rank 171 vs season-blended rank 160, risk LOW / volume-weighted z FG 0.98, FT -1.56 / neutral 9-cat rank 188 vs BPV rank 160 (TO weight 0.75) |
| 161 | Blake Ravensworth | C | 287 | — | 293 | — | 132 | 126 | — | 73 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 164 | Gage Stroud | PF/C | 262 | — | 257 | — | 93 | 98 | — | 72 | LOW |  | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 165 | Florian Stroud | SG/SF | 90 | 96.7 | 101 | — | -64 | -75 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 166 | Hollis Garrow | SF | 211 | — | 202 | — | 36 | 45 | — | 72 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 167 | Eli Garrow | SF | 202 | — | 195 | — | 28 | 35 | — | 75 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 75, per-game rank 179 vs season-blended rank 167, risk LOW / neutral 9-cat rank 181 vs BPV rank 167 (TO weight 0.75) |
| 168 | Orin Eastlake | PF/C | 205 | — | 198 | — | 30 | 37 | — | 78 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 78, per-game rank 189 vs season-blended rank 168, risk LOW / neutral 9-cat rank 185 vs BPV rank 168 (TO weight 0.75) |
| 171 | Ulises Ingram | PG | 200 | — | 210 | — | 39 | 29 | — | 69 | LOW |  | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 172 | Florian Calloway | SF | 127 | 130.1 | 127 | — | -45 | -45 | — | 70 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 173 | Milo Pembrook | C | 228 | — | 215 | — | 42 | 55 | — | 72 | LOW | BLK | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 174 | Yuri Fairbourne | C | 140 | 143.4 | 137 | — | -37 | -34 | — | 74 | LOW | FG% | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE | GP 74, per-game rank 185 vs season-blended rank 174, risk LOW / volume-weighted z FG 1.01, FT -1.81 |
| 175 | Finn Calloway | SF | 123 | 135.3 | 142 | — | -33 | -52 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 75, per-game rank 188 vs season-blended rank 175, risk LOW / neutral 9-cat rank 189 vs BPV rank 175 (TO weight 0.75) |
| 177 | Zane Wolcott | SG/SF | 139 | 133 | 126 | — | -51 | -38 | — | 78 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 78, per-game rank 194 vs season-blended rank 177, risk LOW / neutral 9-cat rank 199 vs BPV rank 177 (TO weight 0.75) |
| 179 | Cam Thorne | SG/SF | 137 | 127.4 | 133 | — | -46 | -42 | — | 69 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 180 | Galen Quill | SF | 124 | 123.1 | 128 | — | -52 | -56 | — | 76 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 76, per-game rank 192 vs season-blended rank 180, risk LOW / neutral 9-cat rank 197 vs BPV rank 180 (TO weight 0.75) |
| 181 | Ivo Vexley | PF/C | 104 | 110.8 | 97 | — | -84 | -77 | — | 49 | HIGH |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 49, per-game rank 146 vs season-blended rank 181, risk HIGH / neutral 9-cat rank 143 vs BPV rank 181 (TO weight 0.75) |
| 183 | Linus Draven | SG | 271 | — | 245 | — | 62 | 88 | — | 74 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 74, per-game rank 193 vs season-blended rank 183, risk LOW / neutral 9-cat rank 200 vs BPV rank 183 (TO weight 0.75) |
| 185 | Dorian Northcott | SF/PF | 257 | — | 249 | — | 64 | 72 | — | 72 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 186 | Ansel Lockhart | C | 230 | — | 227 | — | 41 | 44 | — | 74 | LOW | TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 74, per-game rank 198 vs season-blended rank 186, risk LOW / neutral 9-cat rank 196 vs BPV rank 186 (TO weight 0.75) |
| 189 | Quincy Lockhart | PF | 293 | — | 295 | — | 106 | 104 | — | 72 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 190 | Hollis Pembrook | SF | 258 | — | 265 | — | 75 | 68 | — | 73 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 192 | Xander Eastlake | SG/SF | 221 | — | 229 | — | 37 | 29 | — | 73 | LOW |  | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 193 | Ivo Ashgrove | SF/PF | 122 | 126.5 | 118 | — | -75 | -71 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 75, per-game rank 204 vs season-blended rank 193, risk LOW / neutral 9-cat rank 205 vs BPV rank 193 (TO weight 0.75) |
| 194 | Rowan Northcott | PF/C | 158 | 158.9 | 149 | — | -45 | -36 | — | 77 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 77, per-game rank 217 vs season-blended rank 194, risk LOW / neutral 9-cat rank 211 vs BPV rank 194 (TO weight 0.75) |
| 195 | Ulises Marlow | SF | 138 | 146.2 | 147 | — | -48 | -57 | — | 71 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 196 | Zane Calloway | PG/SG | 243 | — | 247 | — | 51 | 47 | — | 54 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm; Yahoo review: adp / GP 54, per-game rank 164 vs season-blended rank 196, risk LOW / neutral 9-cat rank 174 vs BPV rank 196 (TO weight 0.75) |
| 197 | Hugo Calloway | PF | 149 | 129.8 | 153 | — | -44 | -48 | — | 72 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 72, per-game rank 207 vs season-blended rank 197, risk LOW / neutral 9-cat rank 208 vs BPV rank 197 (TO weight 0.75) |
| 198 | Soren Wolcott | PF/C | 76 | 78.3 | 71 | — | -127 | -122 | — | 45 | HIGH |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 45, per-game rank 150 vs season-blended rank 198, risk HIGH / neutral 9-cat rank 146 vs BPV rank 198 (TO weight 0.75) |
| 199 | Linus Everly | SG | 106 | 118.3 | 119 | — | -80 | -93 | — | 71 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 200 | Kellan Calloway | SG/SF | 155 | 154.8 | 158 | — | -42 | -45 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 75, per-game rank 215 vs season-blended rank 200, risk LOW / neutral 9-cat rank 212 vs BPV rank 200 (TO weight 0.75) |
| 201 | Bram Birchwell | PG/SG | 142 | 139.4 | 155 | — | -46 | -59 | — | 70 | LOW |  | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 222 vs BPV rank 201 (TO weight 0.75) |
| 204 | Jalen Ingram | SF/PF | 165 | 165.7 | 156 | — | -48 | -39 | — | 78 | LOW | TO | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 78, per-game rank 221 vs season-blended rank 204, risk LOW / neutral 9-cat rank 217 vs BPV rank 204 (TO weight 0.75) |
| 211 | Nico Dunmore | PF/C | 188 | 180.5 | 176 | — | -35 | -23 | — | 77 | LOW | TO | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 77, per-game rank 224 vs season-blended rank 211, risk LOW / neutral 9-cat rank 221 vs BPV rank 211 (TO weight 0.75) |
| 214 | Gage Everly | SF | 176 | 177.8 | 196 | — | -18 | -38 | — | 56 | HIGH |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 56, per-game rank 184 vs season-blended rank 214, risk HIGH / neutral 9-cat rank 180 vs BPV rank 214 (TO weight 0.75) |
| 216 | Jalen Zeller | PF | 144 | 134.5 | 130 | — | -86 | -72 | — | 52 | HIGH |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 52, per-game rank 175 vs season-blended rank 216, risk HIGH / neutral 9-cat rank 176 vs BPV rank 216 (TO weight 0.75) |
| 221 | Rowan Eastlake | PG | 159 | 167.1 | 165 | — | -56 | -62 | — | 71 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 223 | Avery Ashgrove | SG | 157 | 163.2 | 161 | — | -62 | -66 | — | 51 | HIGH |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 51, per-game rank 182 vs season-blended rank 223, risk HIGH / neutral 9-cat rank 186 vs BPV rank 223 (TO weight 0.75) |
| 225 | Wes Oakridge | SG/SF | 145 | 149.6 | 143 | — | -82 | -80 | — | 70 | LOW |  | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -1.82, FT 0.25 |
| 226 | Zane Jessop | PG | 128 | 140.6 | 129 | — | -97 | -98 | — | 80 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 80, per-game rank 239 vs season-blended rank 226, risk LOW / neutral 9-cat rank 248 vs BPV rank 226 (TO weight 0.75) |
| 229 | Cam Northcott | SF/PF | 190 | — | 201 | — | -28 | -39 | — | 45 | VERY_HIGH |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm; Yahoo review: adp / GP 45, per-game rank 180 vs season-blended rank 229, risk VERY_HIGH / neutral 9-cat rank 178 vs BPV rank 229 (TO weight 0.75) |
| 232 | Bram Lockhart | SG/SF | 156 | 153 | 172 | — | -60 | -76 | — | 80 | LOW | TO | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 80, per-game rank 245 vs season-blended rank 232, risk LOW / neutral 9-cat rank 245 vs BPV rank 232 (TO weight 0.75) |
| 233 | Blake Yarrow | C | 189 | — | 193 | — | -40 | -44 | — | 45 | MODERATE | TO | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 45, per-game rank 186 vs season-blended rank 233, risk MODERATE / neutral 9-cat rank 177 vs BPV rank 233 (TO weight 0.75) |
| 237 | Gage Fairbourne | SF | 77 | 83.4 | 83 | — | -154 | -160 | — | 67 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 241 | Eli Quill | C | 182 | 173.7 | 169 | — | -72 | -59 | — | 70 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 242 | Zane Fairbourne | SF | 172 | 160.4 | 178 | — | -64 | -70 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 243 | Jalen Marlow | PG | 214 | — | 191 | — | -52 | -29 | — | 79 | LOW |  | SOURCE_DATA_MISMATCH, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / neutral 9-cat rank 254 vs BPV rank 243 (TO weight 0.75) |
| 246 | Kade Stroud | PG | 129 | 129 | 134 | — | -112 | -117 | — | 47 | HIGH |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 47, per-game rank 203 vs season-blended rank 246, risk HIGH / neutral 9-cat rank 218 vs BPV rank 246 (TO weight 0.75) |
| 252 | Kellan Corvell | PG | 196 | — | 206 | — | -46 | -56 | — | 80 | LOW |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 80, per-game rank 263 vs season-blended rank 252, risk LOW / neutral 9-cat rank 267 vs BPV rank 252 (TO weight 0.75) |
| 257 | Linus Calloway | SG/SF | 194 | — | 199 | — | -58 | -63 | — | 76 | LOW |  | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 262 | Soren Draven | SF | 130 | 131 | 140 | — | -122 | -132 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 263 | Marek Quill | SG | 180 | 180.2 | 179 | — | -84 | -83 | — | 71 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 264 | Milo Marlow | PF | 177 | 177.2 | 171 | — | -93 | -87 | — | 73 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 266 | Yuri Ingram | PG | 108 | 134.3 | 117 | — | -149 | -158 | — | 72 | LOW |  | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 280 vs BPV rank 266 (TO weight 0.75) |
| 269 | Kade Marlow | SG/SF | 168 | 163.9 | 160 | — | -109 | -101 | — | 76 | LOW | TO | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 272 | Kellan Abernet | SF/PF | 133 | 145.5 | 139 | — | -133 | -139 | — | 69 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 275 | Eli Corvell | PG | 201 | 191.1 | 194 | — | -81 | -74 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 278 | Pax Northcott | SF | 198 | — | 212 | — | -66 | -80 | — | 69 | LOW | TO | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 290 | Finn Stroud | SG/SF | 164 | 169.5 | 183 | — | -107 | -126 | — | 77 | LOW | TO | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 292 | Vance Fairbourne | SG | 193 | — | 204 | — | -88 | -99 | — | 52 | MODERATE |  | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | Yahoo review: adp / GP 52, per-game rank 281 vs season-blended rank 292, risk MODERATE / neutral 9-cat rank 282 vs BPV rank 292 (TO weight 0.75) |

## Disagreements ≥ 15 (52)

| Engine | Player | Pos | XRank | Y L7 ADP | Proj rank | Proj ADP | Δ proj | Δ XRank | Δ ADP | GP | Risk | Strengths | Tentative class | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2 | Quincy Calloway | PG | 4 | 4.3 | 23 | — | 21 | 2 | — | 77 | LOW | FT% 3PM PTS AST STL | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -1.08, FT 2.11 |
| 8 | Avery Fairbourne | SF/PF | 15 | 18.5 | 30 | — | 22 | 7 | — | 80 | LOW | 3PM PTS | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 12 | Emeka Blackwood | C | 41 | 35.1 | 35 | — | 23 | 29 | — | 73 | LOW | FG% PTS REB BLK | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG 3.78, FT -1.34 |
| 13 | Ulises Birchwell | PF/C | 33 | 33.3 | 31 | — | 18 | 20 | — | 74 | LOW | 3PM REB | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 17 | Kade Birchwell | PF | 2 | 10.8 | 2 | — | -15 | -15 | — | 76 | LOW | 3PM PTS | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -1.52, FT 0.50 |
| 20 | Tate Oakridge | SF | 8 | 12.5 | 4 | — | -16 | -12 | — | 78 | LOW | 3PM PTS REB STL | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -2.79, FT -0.56 |
| 23 | Gage Ashgrove | SG/SF | 14 | 3.6 | 5 | — | -18 | -9 | — | 76 | LOW | FT% 3PM PTS STL | SOURCE_DATA_MISMATCH, PERCENTAGE_VOLUME_DIFFERENCE | projection Δ vs bbm / volume-weighted z FG -1.87, FT 1.69 |
| 24 | Marek Birchwell | PG | 46 | 52.6 | 47 | — | 23 | 22 | — | 70 | LOW | FT% PTS AST STL | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG -1.91, FT 2.00 |
| 26 | Marek Oakridge | C | 23 | 17.4 | 9 | — | -17 | -3 | — | 69 | LOW | FG% PTS REB BLK | SOURCE_DATA_MISMATCH, PERCENTAGE_VOLUME_DIFFERENCE | projection Δ vs bbm / volume-weighted z FG 1.78, FT -2.06 |
| 27 | Quincy Yarrow | SF | 3 | 3.8 | 3 | — | -24 | -24 | — | 70 | LOW | PTS STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 30 | Soren Northcott | C | 50 | 54.3 | 45 | — | 15 | 20 | — | 75 | LOW | REB BLK | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG 0.63, FT -3.62 |
| 32 | Idris Lockhart | SF/PF | 18 | 28.2 | 15 | — | -17 | -14 | — | 75 | LOW | 3PM PTS STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 33 | Eli Vexley | PG | 21 | 21.8 | 14 | — | -19 | -12 | — | 74 | LOW | 3PM PTS AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 34 | Cam Ashgrove | PF | 6 | 7 | 10 | — | -24 | -28 | — | 52 | MODERATE | 3PM PTS REB | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 52, per-game rank 14 vs season-blended rank 34, risk MODERATE / neutral 9-cat rank 16 vs BPV rank 34 (TO weight 0.75) |
| 35 | Milo Zeller | PG | 12 | 16.4 | 16 | — | -19 | -23 | — | 79 | LOW | 3PM PTS AST | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -2.18, FT 0.84 / neutral 9-cat rank 58 vs BPV rank 35 (TO weight 0.75, z-cap on AST/TO) |
| 39 | Hollis Fairbourne | SG | 24 | 18.3 | 25 | — | -14 | -15 | — | 57 | HIGH | FT% 3PM PTS | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE | GP 57, per-game rank 29 vs season-blended rank 39, risk HIGH / volume-weighted z FG -0.15, FT 1.59 |
| 41 | Finn Marlow | PF | 47 | 67.6 | 62 | — | 21 | 6 | — | 58 | MODERATE | REB BLK | GP_DURABILITY_ADJUSTMENT | GP 58, per-game rank 31 vs season-blended rank 41, risk MODERATE |
| 45 | Orin Ravensworth | SF/PF | 53 | 72.6 | 60 | — | 15 | 8 | — | 72 | LOW | STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 46 | Hugo Ravensworth | C | 25 | 23.8 | 40 | — | -6 | -21 | — | 73 | LOW | FG% REB BLK | PERCENTAGE_VOLUME_DIFFERENCE | volume-weighted z FG 3.09, FT -2.33 |
| 55 | Avery Lockhart | PF/C | 28 | 27.5 | 26 | — | -29 | -27 | — | 59 | HIGH | BLK | GP_DURABILITY_ADJUSTMENT | GP 59, per-game rank 48 vs season-blended rank 55, risk HIGH |
| 57 | Marek Stroud | PF/C | 64 | 61.4 | 75 | — | 18 | 7 | — | 78 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 78, per-game rank 67 vs season-blended rank 57, risk LOW |
| 62 | Dorian Garrow | SG | 42 | 38.6 | 34 | — | -28 | -20 | — | 72 | LOW | 3PM PTS | PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | volume-weighted z FG -2.25, FT 0.14 / neutral 9-cat rank 79 vs BPV rank 62 (TO weight 0.75) |
| 63 | Galen Abernet | SF | 78 | 69.9 | 72 | — | 9 | 15 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 75, per-game rank 73 vs season-blended rank 63, risk LOW |
| 64 | Emeka Kestrel | PF/C | 83 | 72.9 | 77 | — | 13 | 19 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 66 | Eli Birchwell | PG | 82 | 89.2 | 82 | — | 16 | 16 | — | 74 | LOW | FT% AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 69 | Gage Abernet | PG/SG | 85 | 94 | 92 | — | 23 | 16 | — | 71 | LOW | AST | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 70 | Linus Fairbourne | SG | 93 | 79.4 | 87 | — | 17 | 23 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 73 | Milo Fairbourne | SF | 89 | 101.5 | 99 | — | 26 | 16 | — | 72 | LOW | STL | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 75 | Dorian Fairbourne | SG | 103 | 82.1 | 80 | — | 5 | 28 | — | 80 | LOW | 3PM | GP_DURABILITY_ADJUSTMENT | GP 80, per-game rank 85 vs season-blended rank 75, risk LOW |
| 84 | Finn Pembrook | C | 79 | 75.2 | 61 | — | -23 | -5 | — | 48 | MODERATE | FG% REB BLK | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | GP 48, per-game rank 55 vs season-blended rank 84, risk MODERATE / volume-weighted z FG 1.81, FT -0.81 / neutral 9-cat rank 55 vs BPV rank 84 (TO weight 0.75) |
| 91 | Dante Ashgrove | SG | 80 | 66.7 | 70 | — | -21 | -11 | — | 54 | HIGH | 3PM STL | SOURCE_DATA_MISMATCH, GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | projection Δ vs bbm / GP 54, per-game rank 74 vs season-blended rank 91, risk HIGH / neutral 9-cat rank 74 vs BPV rank 91 (TO weight 0.75) |
| 107 | Wes Ingram | C | 87 | 80.1 | 89 | — | -18 | -20 | — | 70 | LOW | REB BLK | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 108 | Quincy Eastlake | PG/SG | 95 | 99 | 91 | — | -17 | -13 | — | 72 | LOW | AST | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 123 vs BPV rank 108 (TO weight 0.75) |
| 109 | Hollis Quill | SG | 120 | 137.8 | 131 | — | 22 | 11 | — | 68 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 119 | Kade Ashgrove | PG | 148 | 142.8 | 141 | — | 22 | 29 | — | 56 | HIGH | STL | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 56, per-game rank 91 vs season-blended rank 119, risk HIGH / neutral 9-cat rank 93 vs BPV rank 119 (TO weight 0.75) |
| 131 | Blake Blackwood | SG/SF | 116 | 114.5 | 104 | — | -27 | -15 | — | 62 | MODERATE |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 62, per-game rank 119 vs season-blended rank 131, risk MODERATE / neutral 9-cat rank 117 vs BPV rank 131 (TO weight 0.75) |
| 132 | Bram Hartwell | C | 143 | 125.1 | 116 | — | -16 | 11 | — | 76 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 76, per-game rank 143 vs season-blended rank 132, risk LOW |
| 134 | Finn Ravensworth | PG | 117 | 114.1 | 123 | — | -11 | -17 | — | 73 | LOW |  | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 152 vs BPV rank 134 (TO weight 0.75) |
| 137 | Niall Corvell | PG/SG | 112 | 118.2 | 122 | — | -15 | -25 | — | 74 | LOW |  | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 153 vs BPV rank 137 (TO weight 0.75) |
| 142 | Yuri Abernet | PF | 132 | 122.7 | 113 | — | -29 | -10 | — | 74 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 146 | Orin Everly | PG | 174 | 182.9 | 163 | — | 17 | 28 | — | 78 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 78, per-game rank 160 vs season-blended rank 146, risk LOW / neutral 9-cat rank 161 vs BPV rank 146 (TO weight 0.75) |
| 150 | Cyrus Lockhart | SG | 171 | 185.4 | 164 | — | 14 | 21 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 162 | Tate Northcott | SG/SF | 141 | 149.1 | 138 | — | -24 | -21 | — | 72 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 163 | Eli Underhill | SG/SF | 135 | 142.1 | 135 | — | -28 | -28 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 75, per-game rank 174 vs season-blended rank 163, risk LOW |
| 169 | Jalen Northcott | SF/PF | 184 | 185.3 | 186 | — | 17 | 15 | — | 75 | LOW |  | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 75, per-game rank 183 vs season-blended rank 169, risk LOW / neutral 9-cat rank 182 vs BPV rank 169 (TO weight 0.75) |
| 170 | Hollis Wolcott | C | 147 | 171.2 | 154 | — | -16 | -23 | — | 56 | LOW | FG% TO | GP_DURABILITY_ADJUSTMENT, PERCENTAGE_VOLUME_DIFFERENCE, INTENTIONAL_ENGINE_BEHAVIOR | GP 56, per-game rank 148 vs season-blended rank 170, risk LOW / volume-weighted z FG 1.11, FT -1.73 / neutral 9-cat rank 142 vs BPV rank 170 (TO weight 0.75) |
| 178 | Hollis Thorne | C | 154 | 157.3 | 166 | — | -12 | -24 | — | 75 | LOW | BLK | GP_DURABILITY_ADJUSTMENT, INTENTIONAL_ENGINE_BEHAVIOR | GP 75, per-game rank 190 vs season-blended rank 178, risk LOW / neutral 9-cat rank 191 vs BPV rank 178 (TO weight 0.75) |
| 182 | Ivo Calloway | PG | 166 | 166.8 | 170 | — | -12 | -16 | — | 69 | LOW |  | LIKELY_ENGINE_DEFECT | No data, durability, percentage or intentional-weighting explanation found — investigate manually. |
| 187 | Rowan Oakridge | SG | 195 | — | 203 | — | 16 | 8 | — | 73 | MODERATE |  | SOURCE_DATA_MISMATCH | Yahoo review: adp |
| 202 | Bram Marlow | SG/SF | 181 | 187.6 | 187 | — | -15 | -21 | — | 74 | LOW |  | GP_DURABILITY_ADJUSTMENT | GP 74, per-game rank 212 vs season-blended rank 202, risk LOW |
| 205 | Nico Ashgrove | PG | 185 | 178.3 | 184 | — | -21 | -20 | — | 72 | LOW |  | INTENTIONAL_ENGINE_BEHAVIOR | neutral 9-cat rank 224 vs BPV rank 205 (TO weight 0.75) |
| 209 | Emeka Garrow | SF | 192 | 191.1 | 182 | — | -27 | -17 | — | 76 | LOW | TO | GP_DURABILITY_ADJUSTMENT | GP 76, per-game rank 220 vs season-blended rank 209, risk LOW |

Full table: calibration.csv / calibration.json