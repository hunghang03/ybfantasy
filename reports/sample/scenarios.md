# Calibration scenarios

Deterministic 14-team H2H 9-cat drafts. Others draft by Yahoo market order; "my" picks follow the foundation policy within the engine's top-8 candidates.

## Slot 1 — balanced

Final roster: 1 Hugo Corvell (PG) · 28 Cyrus Ingram (SG/SF) · 29 Linus Eastlake (C) · 56 Milo Northcott (PF) · 57 Galen Stroud (SF) · 84 Hugo Kestrel (PG) · 85 Eli Fairbourne (C) · 112 Eli Zeller (PG/SG) · 113 Idris Thorne (PG) · 140 Eli Ravensworth (C) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 62 SAFE_WAIT; Emeka Blackwood 60 WAIT |
| 2 | 29 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 90 DRAFT_NOW; Niall Northcott 77 LEAN_DRAFT |
| 4 | 57 | balanced — no punt yet. | TO > 3PM > PTS | — | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Florian Ravensworth 83 LEAN_DRAFT; Finn Marlow 65 WAIT |
| 6 | 85 | balanced — no punt yet. | BLK > REB > TO | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Idris Underhill 73 WAIT; Idris Pembrook 55 WAIT |
| 9 | 140 | balanced — no punt yet. | TO > REB > PTS | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 79 SAFE_WAIT; Blake Hartwell 65 WAIT |
| 12 | 169 | balanced — no punt yet. | 3PM > PTS > TO | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 93 DRAFT_NOW; Ansel Stroud 90 DRAFT_NOW |

## Slot 1 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 1 Hugo Corvell (PG) · 28 Cyrus Ingram (SG/SF) · 29 Linus Eastlake (C) · 56 Milo Northcott (PF) · 57 Galen Stroud (SF) · 84 Florian Yarrow (PG/SG) · 85 Eli Fairbourne (C) · 112 Hugo Kestrel (PG) · 113 Eli Zeller (PG/SG) · 140 Eli Ravensworth (C) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 63 SAFE_WAIT; Emeka Blackwood 61 WAIT |
| 2 | 29 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 91 DRAFT_NOW; Niall Northcott 76 LEAN_DRAFT |
| 4 | 57 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Florian Ravensworth 89 DRAFT_NOW; Finn Marlow 67 WAIT |
| 6 | 85 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > 3PM | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Idris Underhill 80 LEAN_DRAFT; Hugo Kestrel 70 WAIT |
| 9 | 140 | Soft punt TO — 60% confidence (still recoverable) [manual]. | PTS > REB > 3PM | TO:SOFT_PUNT | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Blake Hartwell 78 WAIT; Rowan Hartwell 77 SAFE_WAIT |
| 12 | 169 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Ansel Stroud 94 DRAFT_NOW; Nico Fairbourne 92 DRAFT_NOW |

## Slot 1 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 1 Hugo Corvell (PG) · 28 Linus Eastlake (C) · 29 Cyrus Ingram (SG/SF) · 56 Kade Draven (C) · 57 Milo Northcott (PF) · 84 Idris Underhill (SF/PF) · 85 Emeka Corvell (SG) · 112 Hugo Kestrel (PG) · 113 Eli Fairbourne (C) · 140 Eli Ravensworth (C) · 141 Ansel Stroud (C) · 168 Lior Vexley (C) · 169 Eli Zeller (PG/SG)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 83 SAFE_WAIT; Emeka Blackwood 73 WAIT |
| 2 | 29 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 66 WAIT; Orin Hartwell 63 WAIT |
| 4 | 57 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > PTS | FT%:PUNT 3PM:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Florian Ravensworth 86 DRAFT_NOW; Orin Ravensworth 75 LEAN_DRAFT |
| 6 | 85 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Emeka Corvell (DRAFT_NOW) | Emeka Corvell 100 DRAFT_NOW; Eli Birchwell 84 LEAN_DRAFT; Hugo Kestrel 89 LEAN_DRAFT |
| 9 | 140 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 86 LEAN_DRAFT; Ansel Stroud 100 SAFE_WAIT; Eli Zeller 57 WAIT |
| 12 | 169 | Punt FT% — 100% confidence [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Eli Zeller (DRAFT_NOW) | Eli Zeller 100 DRAFT_NOW; Jalen Yarrow 70 WAIT; Nico Fairbourne 65 WAIT |

## Slot 1 — guardHeavy

Final roster: 1 Hugo Corvell (PG) · 28 Cyrus Ingram (SG/SF) · 29 Kellan Lockhart (PG) · 56 Milo Northcott (PF) · 57 Kade Draven (C) · 84 Hugo Kestrel (PG) · 85 Idris Pembrook (SG) · 112 Eli Fairbourne (C) · 113 Eli Zeller (PG/SG) · 140 Eli Ravensworth (C) · 141 Lior Vexley (C) · 168 Lior Jessop (PF) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 62 SAFE_WAIT; Emeka Blackwood 60 WAIT |
| 2 | 29 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 90 DRAFT_NOW; Niall Northcott 77 LEAN_DRAFT |
| 4 | 57 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Finn Marlow 54 WAIT; Eli Fairbourne 67 SAFE_WAIT |
| 6 | 85 | balanced — no punt yet. | REB > BLK > TO | REB:WEAK | Niall Pembrook (LEAN_DRAFT) | Niall Pembrook 86 LEAN_DRAFT; Idris Underhill 59 WAIT; Eli Fairbourne 100 SAFE_WAIT |
| 9 | 140 | balanced — no punt yet. | REB > PTS > TO | REB:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 80 SAFE_WAIT; Nico Fairbourne 78 SAFE_WAIT |
| 12 | 169 | balanced — no punt yet. | PTS > TO > 3PM | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Ansel Stroud 93 DRAFT_NOW; Nico Fairbourne 92 DRAFT_NOW |

## Slot 1 — bigHeavy

Final roster: 1 Florian Ingram (C) · 28 Niall Northcott (PF/C) · 29 Ulises Birchwell (PF/C) · 56 Milo Northcott (PF) · 57 Florian Ravensworth (SF/PF) · 84 Idris Underhill (SF/PF) · 85 Eli Birchwell (PG) · 112 Eli Fairbourne (C) · 113 Hugo Kestrel (PG) · 140 Eli Zeller (PG/SG) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Ansel Stroud (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | AST > 3PM > STL | FT%:CRITICAL 3PM:CRITICAL AST:WEAK STL:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Kellan Lockhart 59 SAFE_WAIT; Niall Northcott 47 PASS |
| 2 | 29 | balanced — no punt yet. | AST > FT% > 3PM | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 61 WAIT; Orin Hartwell 54 WAIT |
| 4 | 57 | balanced — no punt yet. | PTS > AST > STL | 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Florian Ravensworth 95 DRAFT_NOW; Orin Ravensworth 67 WAIT |
| 6 | 85 | balanced — no punt yet. | AST > PTS > 3PM | 3PM:WEAK PTS:WEAK AST:CRITICAL | Eli Birchwell (DRAFT_NOW) | Eli Birchwell 95 DRAFT_NOW; Hugo Kestrel 100 DRAFT_NOW; Florian Yarrow 96 DRAFT_NOW |
| 9 | 140 | balanced — no punt yet. | PTS > AST > 3PM | PTS:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Ulises Vexley 67 WAIT; Kade Ashgrove 44 PASS |
| 12 | 169 | balanced — no punt yet. | PTS > 3PM > TO | — | Ansel Stroud (DRAFT_NOW) | Ansel Stroud 100 DRAFT_NOW; Blake Calloway 99 DRAFT_NOW; Rowan Hartwell 99 DRAFT_NOW |

## Slot 1 — injuryRiskStars

Final roster: 1 Hugo Corvell (PG) · 28 Cyrus Ingram (SG/SF) · 29 Linus Eastlake (C) · 56 Milo Northcott (PF) · 57 Galen Stroud (SF) · 84 Hugo Kestrel (PG) · 85 Eli Fairbourne (C) · 112 Eli Zeller (PG/SG) · 113 Idris Thorne (PG) · 140 Eli Ravensworth (C) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 62 SAFE_WAIT; Emeka Blackwood 60 WAIT |
| 2 | 29 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 90 DRAFT_NOW; Niall Northcott 77 LEAN_DRAFT |
| 4 | 57 | balanced — no punt yet. | TO > 3PM > PTS | — | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Florian Ravensworth 83 LEAN_DRAFT; Finn Marlow 65 WAIT |
| 6 | 85 | balanced — no punt yet. | BLK > REB > TO | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Idris Underhill 73 WAIT; Idris Pembrook 55 WAIT |
| 9 | 140 | balanced — no punt yet. | TO > REB > PTS | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 79 SAFE_WAIT; Blake Hartwell 65 WAIT |
| 12 | 169 | balanced — no punt yet. | 3PM > PTS > TO | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 93 DRAFT_NOW; Ansel Stroud 90 DRAFT_NOW |

## Slot 4 — balanced

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Linus Eastlake (C) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Zeller (PG/SG) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 91 DRAFT_NOW; Niall Northcott 73 WAIT |
| 4 | 60 | balanced — no punt yet. | 3PM > FT% > TO | FT%:WEAK 3PM:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Galen Stroud 87 DRAFT_NOW; Florian Yarrow 66 WAIT |
| 6 | 88 | balanced — no punt yet. | 3PM > TO > PTS | 3PM:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 95 DRAFT_NOW; Emeka Corvell 86 DRAFT_NOW; Hugo Kestrel 100 WAIT |
| 9 | 137 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 54 WAIT; Orin Northcott 61 WAIT |
| 12 | 172 | balanced — no punt yet. | 3PM > TO > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 95 DRAFT_NOW; Ansel Stroud 91 DRAFT_NOW |

## Slot 4 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Linus Eastlake (C) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Zeller (PG/SG) · 137 Eli Fairbourne (C) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | Soft punt TO — 60% confidence (still recoverable) [manual]. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 73 WAIT |
| 4 | 60 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > FT% > TO | FT%:WEAK 3PM:WEAK TO:SOFT_PUNT | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Galen Stroud 87 DRAFT_NOW; Florian Yarrow 76 WAIT |
| 6 | 88 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | 3PM:WEAK TO:SOFT_PUNT | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 90 DRAFT_NOW; Eli Birchwell 89 DRAFT_NOW; Emeka Corvell 80 LEAN_DRAFT |
| 9 | 137 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > 3PM > REB | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Eli Ravensworth 63 WAIT; Blake Hartwell 40 PASS |
| 12 | 172 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Ansel Stroud 94 DRAFT_NOW; Nico Fairbourne 93 DRAFT_NOW |

## Slot 4 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 4 Hugo Corvell (PG) · 25 Linus Eastlake (C) · 32 Cyrus Ingram (SG/SF) · 53 Soren Northcott (C) · 60 Kade Draven (C) · 81 Idris Underhill (SF/PF) · 88 Emeka Corvell (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Ravensworth (C) · 144 Ansel Stroud (C) · 165 Eli Zeller (PG/SG) · 172 Lior Vexley (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 83 SAFE_WAIT; Emeka Blackwood 72 WAIT |
| 2 | 32 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 66 WAIT; Orin Hartwell 64 WAIT |
| 4 | 60 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > AST | FT%:PUNT 3PM:WEAK | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 77 LEAN_DRAFT; Orin Ravensworth 59 WAIT |
| 6 | 88 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Emeka Corvell (DRAFT_NOW) | Emeka Corvell 100 DRAFT_NOW; Hugo Kestrel 94 WAIT; Niall Pembrook 72 WAIT |
| 9 | 137 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 84 LEAN_DRAFT; Hollis Quill 69 WAIT; Eli Zeller 60 WAIT |
| 12 | 172 | Punt FT% — 100% confidence (hard to recover) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Lior Vexley (DRAFT_NOW) | Lior Vexley 100 DRAFT_NOW; Jalen Yarrow 71 WAIT; Nico Fairbourne 68 WAIT |

## Slot 4 — guardHeavy

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Kellan Lockhart (PG) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Hugo Kestrel (PG) · 88 Emeka Corvell (SG) · 109 Eli Fairbourne (C) · 116 Eli Zeller (PG/SG) · 137 Eli Ravensworth (C) · 144 Lior Vexley (C) · 165 Lior Jessop (PF) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 91 DRAFT_NOW; Niall Northcott 73 WAIT |
| 4 | 60 | balanced — no punt yet. | FG% > TO > BLK | FG%:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Kade Draven 88 DRAFT_NOW; Galen Stroud 46 PASS |
| 6 | 88 | balanced — no punt yet. | BLK > FG% > REB | — | Niall Pembrook (LEAN_DRAFT) | Niall Pembrook 88 LEAN_DRAFT; Idris Underhill 55 WAIT; Eli Fairbourne 100 SAFE_WAIT |
| 9 | 137 | balanced — no punt yet. | PTS > FG% > BLK | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 77 SAFE_WAIT; Nico Fairbourne 77 SAFE_WAIT |
| 12 | 172 | balanced — no punt yet. | PTS > 3PM > TO | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 94 DRAFT_NOW; Ansel Stroud 94 DRAFT_NOW |

## Slot 4 — bigHeavy

Final roster: 4 Florian Ingram (C) · 25 Niall Northcott (PF/C) · 32 Ulises Birchwell (PF/C) · 53 Milo Northcott (PF) · 60 Orin Ravensworth (SF/PF) · 81 Florian Yarrow (PG/SG) · 88 Eli Birchwell (PG) · 109 Eli Fairbourne (C) · 116 Hugo Kestrel (PG) · 137 Eli Zeller (PG/SG) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Ansel Stroud (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | AST > FT% > 3PM | FT%:CRITICAL 3PM:CRITICAL AST:WEAK STL:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Kellan Lockhart 58 WAIT; Niall Northcott 46 PASS |
| 2 | 32 | balanced — no punt yet. | FT% > AST > 3PM | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 62 WAIT; Orin Hartwell 55 WAIT |
| 4 | 60 | balanced — no punt yet. | STL > PTS > AST | 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Orin Ravensworth 70 WAIT; Hugo Kestrel 82 SAFE_WAIT |
| 6 | 88 | balanced — no punt yet. | PTS > STL > 3PM | 3PM:WEAK PTS:WEAK AST:WEAK STL:WEAK | Eli Birchwell (DRAFT_NOW) | Eli Birchwell 95 DRAFT_NOW; Idris Pembrook 86 DRAFT_NOW; Emeka Corvell 80 LEAN_DRAFT |
| 9 | 137 | balanced — no punt yet. | PTS > 3PM > STL | PTS:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Hollis Quill 62 WAIT; Orin Northcott 62 WAIT |
| 12 | 172 | balanced — no punt yet. | PTS > 3PM > STL | PTS:WEAK | Ansel Stroud (DRAFT_NOW) | Ansel Stroud 100 DRAFT_NOW; Rowan Hartwell 96 DRAFT_NOW; Blake Calloway 91 DRAFT_NOW |

## Slot 4 — injuryRiskStars

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Linus Eastlake (C) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Zeller (PG/SG) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 91 DRAFT_NOW; Niall Northcott 73 WAIT |
| 4 | 60 | balanced — no punt yet. | 3PM > FT% > TO | FT%:WEAK 3PM:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Galen Stroud 87 DRAFT_NOW; Florian Yarrow 66 WAIT |
| 6 | 88 | balanced — no punt yet. | 3PM > TO > PTS | 3PM:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 95 DRAFT_NOW; Emeka Corvell 86 DRAFT_NOW; Hugo Kestrel 100 WAIT |
| 9 | 137 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 54 WAIT; Orin Northcott 61 WAIT |
| 12 | 172 | balanced — no punt yet. | 3PM > TO > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 95 DRAFT_NOW; Ansel Stroud 91 DRAFT_NOW |

## Slot 7 — balanced

Final roster: 7 Hugo Corvell (PG) · 22 Tate Dunmore (PG) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Milo Northcott (PF) · 78 Eli Fairbourne (C) · 91 Idris Pembrook (SG) · 106 Niall Pembrook (C) · 119 Hugo Kestrel (PG) · 134 Eli Zeller (PG/SG) · 147 Eli Ravensworth (C) · 162 Lior Vexley (C) · 175 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL | Tate Dunmore (LEAN_DRAFT) | Tate Dunmore 78 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 59 SAFE_WAIT |
| 2 | 35 | balanced — no punt yet. | BLK > REB > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 60 WAIT; Linus Eastlake 80 LEAN_DRAFT |
| 4 | 63 | balanced — no punt yet. | TO > BLK > REB | TO:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Kade Draven 84 LEAN_DRAFT; Finn Marlow 53 WAIT |
| 6 | 91 | balanced — no punt yet. | TO > 3PM > REB | — | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 93 DRAFT_NOW; Emeka Corvell 91 DRAFT_NOW; Niall Pembrook 67 WAIT |
| 9 | 134 | balanced — no punt yet. | TO > 3PM > REB | TO:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 85 WAIT; Rowan Hartwell 77 SAFE_WAIT |
| 12 | 175 | balanced — no punt yet. | TO > 3PM > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Blake Calloway 91 DRAFT_NOW; Nico Fairbourne 88 DRAFT_NOW |

## Slot 7 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 7 Hugo Corvell (PG) · 22 Tate Dunmore (PG) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Milo Northcott (PF) · 78 Idris Underhill (SF/PF) · 91 Eli Fairbourne (C) · 106 Hugo Kestrel (PG) · 119 Eli Zeller (PG/SG) · 134 Eli Ravensworth (C) · 147 Blake Hartwell (PF) · 162 Lior Vexley (C) · 175 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Tate Dunmore (LEAN_DRAFT) | Tate Dunmore 81 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 60 SAFE_WAIT |
| 2 | 35 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 60 WAIT; Linus Eastlake 80 LEAN_DRAFT |
| 4 | 63 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > TO | TO:SOFT_PUNT | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Kade Draven 87 DRAFT_NOW; Finn Marlow 55 WAIT |
| 6 | 91 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > REB > BLK | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Hugo Kestrel 59 WAIT; Niall Pembrook 87 LEAN_DRAFT |
| 9 | 134 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > REB > BLK | TO:SOFT_PUNT | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 80 SAFE_WAIT; Nico Fairbourne 78 SAFE_WAIT |
| 12 | 175 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > 3PM > PTS | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 90 DRAFT_NOW; Ansel Stroud 88 DRAFT_NOW |

## Slot 7 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 7 Hugo Corvell (PG) · 22 Linus Eastlake (C) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Kade Draven (C) · 78 Idris Underhill (SF/PF) · 91 Emeka Corvell (SG) · 106 Hugo Kestrel (PG) · 119 Eli Fairbourne (C) · 134 Eli Ravensworth (C) · 147 Ansel Stroud (C) · 162 Eli Zeller (PG/SG) · 175 Lior Vexley (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > FG% | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 82 SAFE_WAIT; Tate Dunmore 78 LEAN_DRAFT |
| 2 | 35 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 67 WAIT; Orin Hartwell 64 WAIT |
| 4 | 63 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > AST | FT%:PUNT 3PM:WEAK | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 77 LEAN_DRAFT; Orin Ravensworth 60 WAIT |
| 6 | 91 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Emeka Corvell (DRAFT_NOW) | Emeka Corvell 100 DRAFT_NOW; Hugo Kestrel 95 WAIT; Ansel Stroud 71 SAFE_WAIT |
| 9 | 134 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 84 LEAN_DRAFT; Hollis Quill 69 WAIT; Eli Zeller 60 WAIT |
| 12 | 175 | Punt FT% — 100% confidence (hard to recover) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Lior Vexley (DRAFT_NOW) | Lior Vexley 100 DRAFT_NOW; Jalen Yarrow 73 WAIT; Nico Fairbourne 71 WAIT |

## Slot 7 — guardHeavy

Final roster: 7 Hugo Corvell (PG) · 22 Tate Dunmore (PG) · 35 Cyrus Ingram (SG/SF) · 50 Yuri Ravensworth (SG/SF) · 63 Kade Draven (C) · 78 Eli Fairbourne (C) · 91 Emeka Corvell (SG) · 106 Hugo Kestrel (PG) · 119 Eli Ravensworth (C) · 134 Eli Zeller (PG/SG) · 147 Lior Vexley (C) · 162 Rowan Hartwell (C) · 175 Nico Fairbourne (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL | Tate Dunmore (LEAN_DRAFT) | Tate Dunmore 78 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 59 SAFE_WAIT |
| 2 | 35 | balanced — no punt yet. | BLK > REB > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 60 WAIT; Linus Eastlake 80 LEAN_DRAFT |
| 4 | 63 | balanced — no punt yet. | BLK > REB > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 96 DRAFT_NOW; Finn Marlow 56 WAIT |
| 6 | 91 | balanced — no punt yet. | TO > REB > BLK | TO:WEAK | Niall Pembrook (DRAFT_NOW) | Niall Pembrook 100 DRAFT_NOW; Eli Ravensworth 68 SAFE_WAIT; Emeka Corvell 70 WAIT |
| 9 | 134 | balanced — no punt yet. | TO > REB > BLK | TO:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 76 LEAN_DRAFT; Nico Fairbourne 100 SAFE_WAIT; Rowan Hartwell 99 SAFE_WAIT |
| 12 | 175 | balanced — no punt yet. | TO > 3PM > REB | TO:WEAK | Nico Fairbourne (DRAFT_NOW) | Nico Fairbourne 100 DRAFT_NOW; Blake Calloway 95 DRAFT_NOW; Ivo Pembrook 84 LEAN_DRAFT |

## Slot 7 — bigHeavy

Final roster: 7 Florian Ingram (C) · 22 Niall Northcott (PF/C) · 35 Linus Eastlake (C) · 50 Milo Northcott (PF) · 63 Orin Ravensworth (SF/PF) · 78 Florian Yarrow (PG/SG) · 91 Idris Pembrook (SG) · 106 Hugo Kestrel (PG) · 119 Eli Zeller (PG/SG) · 134 Eli Fairbourne (C) · 147 Blake Hartwell (PF) · 162 Wes Garrow (SG) · 175 Lior Vexley (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | AST > STL > 3PM | FT%:CRITICAL 3PM:CRITICAL AST:WEAK STL:CRITICAL | Hugo Corvell (DRAFT_NOW) | Hugo Corvell 90 DRAFT_NOW; Tate Dunmore 89 DRAFT_NOW; Cyrus Ingram 100 LEAN_DRAFT |
| 2 | 35 | balanced — no punt yet. | 3PM > AST > FT% | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 61 WAIT; Orin Hartwell 55 WAIT |
| 4 | 63 | balanced — no punt yet. | 3PM > PTS > AST | FT%:CRITICAL 3PM:CRITICAL PTS:WEAK AST:CRITICAL STL:WEAK | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Hugo Kestrel 87 SAFE_WAIT; Florian Yarrow 85 WAIT |
| 6 | 91 | balanced — no punt yet. | 3PM > PTS > AST | FT%:WEAK 3PM:CRITICAL PTS:WEAK AST:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 88 DRAFT_NOW; Hugo Kestrel 100 WAIT; Eli Zeller 83 SAFE_WAIT |
| 9 | 134 | balanced — no punt yet. | PTS > 3PM > TO | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Ulises Vexley 69 WAIT; Orin Northcott 71 WAIT |
| 12 | 175 | balanced — no punt yet. | PTS > 3PM > TO | — | Lior Vexley (DRAFT_NOW) | Lior Vexley 100 DRAFT_NOW; Blake Calloway 98 DRAFT_NOW; Rowan Hartwell 97 DRAFT_NOW |

## Slot 7 — injuryRiskStars

Final roster: 7 Hugo Corvell (PG) · 22 Tate Dunmore (PG) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Milo Northcott (PF) · 78 Eli Fairbourne (C) · 91 Idris Pembrook (SG) · 106 Niall Pembrook (C) · 119 Hugo Kestrel (PG) · 134 Eli Zeller (PG/SG) · 147 Eli Ravensworth (C) · 162 Lior Vexley (C) · 175 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL | Tate Dunmore (LEAN_DRAFT) | Tate Dunmore 78 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 59 SAFE_WAIT |
| 2 | 35 | balanced — no punt yet. | BLK > REB > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 60 WAIT; Linus Eastlake 80 LEAN_DRAFT |
| 4 | 63 | balanced — no punt yet. | TO > BLK > REB | TO:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Kade Draven 84 LEAN_DRAFT; Finn Marlow 53 WAIT |
| 6 | 91 | balanced — no punt yet. | TO > 3PM > REB | — | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 93 DRAFT_NOW; Emeka Corvell 91 DRAFT_NOW; Niall Pembrook 67 WAIT |
| 9 | 134 | balanced — no punt yet. | TO > 3PM > REB | TO:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 85 WAIT; Rowan Hartwell 77 SAFE_WAIT |
| 12 | 175 | balanced — no punt yet. | TO > 3PM > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Blake Calloway 91 DRAFT_NOW; Nico Fairbourne 88 DRAFT_NOW |

## Slot 11 — balanced

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Linus Eastlake (C) · 46 Yuri Ravensworth (SG/SF) · 67 Milo Northcott (PF) · 74 Hugo Kestrel (PG) · 95 Niall Pembrook (C) · 102 Eli Fairbourne (C) · 123 Idris Thorne (PG) · 130 Eli Zeller (PG/SG) · 151 Eli Ravensworth (C) · 158 Lior Vexley (C) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 78 LEAN_DRAFT; Linus Eastlake 59 WAIT |
| 2 | 39 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 57 WAIT; Milo Northcott 56 SAFE_WAIT |
| 4 | 67 | balanced — no punt yet. | BLK > TO > REB | — | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Eli Fairbourne 55 SAFE_WAIT; Finn Marlow 56 WAIT |
| 6 | 95 | balanced — no punt yet. | TO > REB > BLK | — | Niall Pembrook (LEAN_DRAFT) | Niall Pembrook 82 LEAN_DRAFT; Eli Fairbourne 100 SAFE_WAIT; Emeka Corvell 49 PASS |
| 9 | 130 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 62 WAIT; Orin Northcott 62 WAIT |
| 12 | 179 | balanced — no punt yet. | 3PM > TO > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Wes Garrow 96 DRAFT_NOW; Nico Fairbourne 90 DRAFT_NOW |

## Slot 11 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Linus Eastlake (C) · 46 Yuri Ravensworth (SG/SF) · 67 Milo Northcott (PF) · 74 Hugo Kestrel (PG) · 95 Eli Fairbourne (C) · 102 Niall Pembrook (C) · 123 Idris Thorne (PG) · 130 Eli Zeller (PG/SG) · 151 Eli Ravensworth (C) · 158 Lior Vexley (C) · 179 Wes Garrow (SG)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 80 LEAN_DRAFT; Linus Eastlake 59 WAIT |
| 2 | 39 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 57 WAIT; Soren Northcott 69 WAIT |
| 4 | 67 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > TO | TO:SOFT_PUNT | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Eli Fairbourne 51 SAFE_WAIT; Finn Marlow 60 WAIT |
| 6 | 95 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Idris Pembrook 52 WAIT; Emeka Corvell 52 WAIT |
| 9 | 130 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > TO > PTS | TO:SOFT_PUNT | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 54 WAIT; Orin Northcott 58 WAIT |
| 12 | 179 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > TO > PTS | TO:SOFT_PUNT | Wes Garrow (DRAFT_NOW) | Wes Garrow 100 DRAFT_NOW; Rowan Hartwell 99 DRAFT_NOW; Ansel Stroud 87 DRAFT_NOW |

## Slot 11 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 11 Hugo Corvell (PG) · 18 Linus Eastlake (C) · 39 Soren Northcott (C) · 46 Orin Wolcott (SG/SF) · 67 Milo Northcott (PF) · 74 Emeka Corvell (SG) · 95 Niall Pembrook (C) · 102 Hugo Kestrel (PG) · 123 Eli Fairbourne (C) · 130 Hollis Quill (SG) · 151 Ansel Stroud (C) · 158 Eli Ravensworth (C) · 179 Jalen Yarrow (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > FG% | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 77 LEAN_DRAFT; Avery Fairbourne 59 WAIT |
| 2 | 39 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Orin Wolcott (LEAN_DRAFT) | Orin Wolcott 89 LEAN_DRAFT; Quincy Fairbourne 69 WAIT; Yuri Ravensworth 84 LEAN_DRAFT |
| 4 | 67 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK PTS:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Orin Ravensworth 79 LEAN_DRAFT; Galen Abernet 70 WAIT |
| 6 | 95 | Punt FT% — 100% confidence (still recoverable) [manual]. | PTS > 3PM > AST | FT%:PUNT | Niall Pembrook (DRAFT_NOW) | Niall Pembrook 100 DRAFT_NOW; Hugo Kestrel 95 WAIT; Ansel Stroud 93 SAFE_WAIT |
| 9 | 130 | Punt FT% — 100% confidence (still recoverable) [manual]. | PTS > 3PM > AST | FT%:PUNT 3PM:WEAK PTS:WEAK | Hollis Quill (DRAFT_NOW) | Hollis Quill 85 DRAFT_NOW; Eli Zeller 64 WAIT; Eli Ravensworth 79 WAIT |
| 12 | 179 | Punt FT% — 100% confidence (hard to recover) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Jalen Yarrow (DRAFT_NOW) | Jalen Yarrow 100 DRAFT_NOW; Nico Fairbourne 93 DRAFT_NOW; Blake Calloway 90 DRAFT_NOW |

## Slot 11 — guardHeavy

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Yuri Ravensworth (SG/SF) · 46 Orin Wolcott (SG/SF) · 67 Milo Northcott (PF) · 74 Eli Fairbourne (C) · 95 Hugo Kestrel (PG) · 102 Niall Pembrook (C) · 123 Eli Ravensworth (C) · 130 Eli Zeller (PG/SG) · 151 Lior Vexley (C) · 158 Blake Hartwell (PF) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 78 LEAN_DRAFT; Linus Eastlake 59 WAIT |
| 2 | 39 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 57 WAIT; Milo Northcott 56 SAFE_WAIT |
| 4 | 67 | balanced — no punt yet. | BLK > REB > FG% | REB:CRITICAL BLK:CRITICAL | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Finn Marlow 61 WAIT; Eli Fairbourne 77 SAFE_WAIT |
| 6 | 95 | balanced — no punt yet. | REB > BLK > PTS | REB:WEAK | Niall Pembrook (DRAFT_NOW) | Niall Pembrook 100 DRAFT_NOW; Eli Ravensworth 67 SAFE_WAIT; Hugo Kestrel 50 WAIT |
| 9 | 130 | balanced — no punt yet. | PTS > 3PM > REB | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Rowan Hartwell 69 SAFE_WAIT; Nico Fairbourne 66 SAFE_WAIT |
| 12 | 179 | balanced — no punt yet. | PTS > TO > 3PM | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 94 DRAFT_NOW; Ansel Stroud 89 DRAFT_NOW |

## Slot 11 — bigHeavy

Final roster: 11 Linus Eastlake (C) · 18 Avery Fairbourne (SF/PF) · 39 Milo Northcott (PF) · 46 Florian Ravensworth (SF/PF) · 67 Orin Ravensworth (SF/PF) · 74 Florian Yarrow (PG/SG) · 95 Idris Pembrook (SG) · 102 Eli Fairbourne (C) · 123 Idris Thorne (PG) · 130 Eli Zeller (PG/SG) · 151 Blake Hartwell (PF) · 158 Eli Ravensworth (C) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | AST > FT% > 3PM | FT%:CRITICAL 3PM:CRITICAL PTS:WEAK AST:CRITICAL STL:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Hugo Corvell 89 DRAFT_NOW; Tate Dunmore 90 DRAFT_NOW |
| 2 | 39 | balanced — no punt yet. | AST > FT% > 3PM | FT%:CRITICAL 3PM:WEAK AST:CRITICAL STL:WEAK | Yuri Ravensworth (DRAFT_NOW) | Yuri Ravensworth 100 DRAFT_NOW; Orin Wolcott 87 LEAN_DRAFT; Quincy Fairbourne 93 DRAFT_NOW |
| 4 | 67 | balanced — no punt yet. | 3PM > AST > FT% | FT%:CRITICAL 3PM:WEAK PTS:WEAK AST:CRITICAL | Florian Yarrow (LEAN_DRAFT) | Florian Yarrow 100 LEAN_DRAFT; Hugo Kestrel 96 SAFE_WAIT; Eli Birchwell 85 WAIT |
| 6 | 95 | balanced — no punt yet. | 3PM > AST > PTS | 3PM:WEAK AST:WEAK | Idris Pembrook (LEAN_DRAFT) | Idris Pembrook 82 LEAN_DRAFT; Hugo Kestrel 100 WAIT; Eli Zeller 87 SAFE_WAIT |
| 9 | 130 | balanced — no punt yet. | 3PM > PTS > AST | 3PM:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Orin Northcott 55 WAIT; Hollis Quill 51 WAIT |
| 12 | 179 | balanced — no punt yet. | 3PM > PTS > AST | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Wes Garrow 95 DRAFT_NOW; Nico Fairbourne 90 DRAFT_NOW |

## Slot 11 — injuryRiskStars

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Linus Eastlake (C) · 46 Yuri Ravensworth (SG/SF) · 67 Milo Northcott (PF) · 74 Hugo Kestrel (PG) · 95 Niall Pembrook (C) · 102 Eli Fairbourne (C) · 123 Idris Thorne (PG) · 130 Eli Zeller (PG/SG) · 151 Eli Ravensworth (C) · 158 Lior Vexley (C) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 78 LEAN_DRAFT; Linus Eastlake 59 WAIT |
| 2 | 39 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 57 WAIT; Milo Northcott 56 SAFE_WAIT |
| 4 | 67 | balanced — no punt yet. | BLK > TO > REB | — | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Eli Fairbourne 55 SAFE_WAIT; Finn Marlow 56 WAIT |
| 6 | 95 | balanced — no punt yet. | TO > REB > BLK | — | Niall Pembrook (LEAN_DRAFT) | Niall Pembrook 82 LEAN_DRAFT; Eli Fairbourne 100 SAFE_WAIT; Emeka Corvell 49 PASS |
| 9 | 130 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 62 WAIT; Orin Northcott 62 WAIT |
| 12 | 179 | balanced — no punt yet. | 3PM > TO > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Wes Garrow 96 DRAFT_NOW; Nico Fairbourne 90 DRAFT_NOW |

## Slot 14 — balanced

Final roster: 14 Hugo Corvell (PG) · 15 Cyrus Ingram (SG/SF) · 42 Linus Eastlake (C) · 43 Yuri Ravensworth (SG/SF) · 70 Eli Fairbourne (C) · 71 Orin Ravensworth (SF/PF) · 98 Emeka Corvell (SG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Zeller (PG/SG) · 154 Eli Ravensworth (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 77 LEAN_DRAFT; Linus Eastlake 58 WAIT |
| 2 | 42 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 58 WAIT; Milo Northcott 56 SAFE_WAIT |
| 4 | 70 | balanced — no punt yet. | TO > BLK > REB | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Orin Ravensworth 77 LEAN_DRAFT; Hugo Kestrel 52 SAFE_WAIT |
| 6 | 98 | balanced — no punt yet. | 3PM > AST > PTS | — | Emeka Corvell (LEAN_DRAFT) | Emeka Corvell 78 LEAN_DRAFT; Hugo Kestrel 100 SAFE_WAIT; Eli Zeller 81 SAFE_WAIT |
| 9 | 127 | balanced — no punt yet. | 3PM > TO > BLK | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 71 WAIT; Nico Fairbourne 58 SAFE_WAIT |
| 12 | 182 | balanced — no punt yet. | 3PM > TO > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 97 DRAFT_NOW; Ansel Stroud 84 LEAN_DRAFT |

## Slot 14 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 14 Hugo Corvell (PG) · 15 Cyrus Ingram (SG/SF) · 42 Linus Eastlake (C) · 43 Yuri Ravensworth (SG/SF) · 70 Eli Fairbourne (C) · 71 Orin Ravensworth (SF/PF) · 98 Hugo Kestrel (PG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Zeller (PG/SG) · 154 Eli Ravensworth (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > FG% | REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 80 LEAN_DRAFT; Linus Eastlake 58 WAIT |
| 2 | 42 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 57 WAIT; Soren Northcott 69 SAFE_WAIT |
| 4 | 70 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > TO | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Hugo Kestrel 69 SAFE_WAIT; Orin Ravensworth 84 LEAN_DRAFT |
| 6 | 98 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > AST > PTS | TO:SOFT_PUNT | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 100 LEAN_DRAFT; Eli Zeller 83 SAFE_WAIT; Niall Pembrook 57 WAIT |
| 9 | 127 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > TO > BLK | TO:SOFT_PUNT | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 68 WAIT; Blake Hartwell 58 WAIT |
| 12 | 182 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > TO > PTS | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 95 DRAFT_NOW; Ansel Stroud 87 DRAFT_NOW |

## Slot 14 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 14 Hugo Corvell (PG) · 15 Linus Eastlake (C) · 42 Soren Northcott (C) · 43 Orin Wolcott (SG/SF) · 70 Orin Ravensworth (SF/PF) · 71 Quincy Marlow (C) · 98 Hugo Kestrel (PG) · 99 Niall Pembrook (C) · 126 Hollis Quill (SG) · 127 Eli Fairbourne (C) · 154 Ansel Stroud (C) · 155 Eli Zeller (PG/SG) · 182 Jalen Yarrow (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 76 LEAN_DRAFT; Linus Eastlake 81 LEAN_DRAFT |
| 2 | 42 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Orin Wolcott (LEAN_DRAFT) | Orin Wolcott 92 LEAN_DRAFT; Yuri Ravensworth 87 LEAN_DRAFT; Marek Birchwell 69 SAFE_WAIT |
| 4 | 70 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK PTS:WEAK | Orin Ravensworth (DRAFT_NOW) | Orin Ravensworth 100 DRAFT_NOW; Quincy Marlow 71 WAIT; Emeka Kestrel 67 WAIT |
| 6 | 98 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 100 LEAN_DRAFT; Niall Pembrook 75 LEAN_DRAFT; Ansel Stroud 73 SAFE_WAIT |
| 9 | 127 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Eli Fairbourne (DRAFT_NOW) | Eli Fairbourne 95 DRAFT_NOW; Idris Thorne 49 PASS; Eli Zeller 52 WAIT |
| 12 | 182 | Punt FT% — 100% confidence (hard to recover) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Jalen Yarrow (DRAFT_NOW) | Jalen Yarrow 100 DRAFT_NOW; Nico Fairbourne 95 DRAFT_NOW; Rowan Hartwell 76 LEAN_DRAFT |

## Slot 14 — guardHeavy

Final roster: 14 Hugo Corvell (PG) · 15 Cyrus Ingram (SG/SF) · 42 Yuri Ravensworth (SG/SF) · 43 Orin Wolcott (SG/SF) · 70 Eli Fairbourne (C) · 71 Niall Pembrook (C) · 98 Hugo Kestrel (PG) · 99 Emeka Corvell (SG) · 126 Eli Ravensworth (C) · 127 Eli Zeller (PG/SG) · 154 Lior Vexley (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 77 LEAN_DRAFT; Linus Eastlake 58 WAIT |
| 2 | 42 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 58 WAIT; Milo Northcott 56 SAFE_WAIT |
| 4 | 70 | balanced — no punt yet. | REB > BLK > FG% | REB:CRITICAL BLK:CRITICAL | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Niall Pembrook 79 SAFE_WAIT; Quincy Marlow 69 WAIT |
| 6 | 98 | balanced — no punt yet. | REB > PTS > BLK | — | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 100 LEAN_DRAFT; Eli Ravensworth 81 SAFE_WAIT; Milo Fairbourne 92 LEAN_DRAFT |
| 9 | 127 | balanced — no punt yet. | PTS > REB > BLK | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Nico Fairbourne 94 SAFE_WAIT; Lior Underhill 88 LEAN_DRAFT |
| 12 | 182 | balanced — no punt yet. | PTS > TO > REB | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 95 DRAFT_NOW; Ansel Stroud 92 DRAFT_NOW |

## Slot 14 — bigHeavy

Final roster: 14 Linus Eastlake (C) · 15 Avery Fairbourne (SF/PF) · 42 Milo Northcott (PF) · 43 Florian Ravensworth (SF/PF) · 70 Orin Ravensworth (SF/PF) · 71 Florian Yarrow (PG/SG) · 98 Eli Fairbourne (C) · 99 Hugo Kestrel (PG) · 126 Idris Thorne (PG) · 127 Eli Zeller (PG/SG) · 154 Blake Hartwell (PF) · 155 Eli Ravensworth (C) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | AST > 3PM > FT% | FT%:CRITICAL 3PM:CRITICAL PTS:WEAK AST:CRITICAL STL:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 90 DRAFT_NOW; Hugo Corvell 89 DRAFT_NOW |
| 2 | 42 | balanced — no punt yet. | AST > 3PM > FT% | FT%:CRITICAL 3PM:WEAK AST:CRITICAL STL:WEAK | Yuri Ravensworth (DRAFT_NOW) | Yuri Ravensworth 100 DRAFT_NOW; Orin Wolcott 88 WAIT; Marek Birchwell 99 SAFE_WAIT |
| 4 | 70 | balanced — no punt yet. | 3PM > AST > FT% | FT%:CRITICAL 3PM:WEAK PTS:WEAK AST:CRITICAL | Florian Yarrow (LEAN_DRAFT) | Florian Yarrow 100 LEAN_DRAFT; Hugo Kestrel 96 SAFE_WAIT; Eli Birchwell 85 SAFE_WAIT |
| 6 | 98 | balanced — no punt yet. | 3PM > AST > PTS | 3PM:WEAK AST:WEAK | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 100 LEAN_DRAFT; Eli Zeller 87 SAFE_WAIT; Idris Thorne 70 SAFE_WAIT |
| 9 | 127 | balanced — no punt yet. | 3PM > PTS > AST | 3PM:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Orin Northcott 60 WAIT; Hollis Quill 52 WAIT |
| 12 | 182 | balanced — no punt yet. | 3PM > PTS > TO | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 93 DRAFT_NOW; Ansel Stroud 87 DRAFT_NOW |

## Slot 14 — injuryRiskStars

Final roster: 14 Hugo Corvell (PG) · 15 Cyrus Ingram (SG/SF) · 42 Linus Eastlake (C) · 43 Yuri Ravensworth (SG/SF) · 70 Eli Fairbourne (C) · 71 Orin Ravensworth (SF/PF) · 98 Emeka Corvell (SG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Zeller (PG/SG) · 154 Eli Ravensworth (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 77 LEAN_DRAFT; Linus Eastlake 58 WAIT |
| 2 | 42 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Yuri Ravensworth 58 WAIT; Milo Northcott 56 SAFE_WAIT |
| 4 | 70 | balanced — no punt yet. | TO > BLK > REB | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Orin Ravensworth 77 LEAN_DRAFT; Hugo Kestrel 52 SAFE_WAIT |
| 6 | 98 | balanced — no punt yet. | 3PM > AST > PTS | — | Emeka Corvell (LEAN_DRAFT) | Emeka Corvell 78 LEAN_DRAFT; Hugo Kestrel 100 SAFE_WAIT; Eli Zeller 81 SAFE_WAIT |
| 9 | 127 | balanced — no punt yet. | 3PM > TO > BLK | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 71 WAIT; Nico Fairbourne 58 SAFE_WAIT |
| 12 | 182 | balanced — no punt yet. | 3PM > TO > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 97 DRAFT_NOW; Ansel Stroud 84 LEAN_DRAFT |
