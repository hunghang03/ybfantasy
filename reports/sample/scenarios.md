# Calibration scenarios

Deterministic 14-team H2H 9-cat drafts. Others draft by Yahoo market order; "my" picks follow the foundation policy within the engine's top-8 candidates.

## Slot 1 — balanced

Final roster: 1 Quincy Calloway (PG) · 28 Cyrus Ingram (SG/SF) · 29 Linus Eastlake (C) · 56 Milo Northcott (PF) · 57 Kade Draven (C) · 84 Florian Yarrow (PG/SG) · 85 Idris Pembrook (SG) · 112 Hugo Kestrel (PG) · 113 Eli Fairbourne (C) · 140 Eli Zeller (PG/SG) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 66 SAFE_WAIT; Emeka Blackwood 64 WAIT |
| 2 | 29 | balanced — no punt yet. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 75 LEAN_DRAFT |
| 4 | 57 | balanced — no punt yet. | 3PM > PTS > TO | — | Kade Draven (DRAFT_NOW) | Kade Draven 90 DRAFT_NOW; Galen Stroud 100 DRAFT_NOW; Finn Marlow 77 LEAN_DRAFT |
| 6 | 85 | balanced — no punt yet. | 3PM > PTS > TO | 3PM:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 100 DRAFT_NOW; Emeka Corvell 95 DRAFT_NOW; Idris Underhill 90 DRAFT_NOW |
| 9 | 140 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 59 WAIT; Blake Hartwell 55 WAIT |
| 12 | 169 | balanced — no punt yet. | 3PM > TO > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 85 LEAN_DRAFT; Ivo Pembrook 83 LEAN_DRAFT |

## Slot 1 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 1 Quincy Calloway (PG) · 28 Cyrus Ingram (SG/SF) · 29 Linus Eastlake (C) · 56 Milo Northcott (PF) · 57 Kade Draven (C) · 84 Florian Yarrow (PG/SG) · 85 Idris Pembrook (SG) · 112 Hugo Kestrel (PG) · 113 Eli Zeller (PG/SG) · 140 Eli Fairbourne (C) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | Soft punt TO — 60% confidence (still recoverable) [manual]. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 66 SAFE_WAIT; Emeka Blackwood 65 WAIT |
| 2 | 29 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 94 DRAFT_NOW; Niall Northcott 75 WAIT |
| 4 | 57 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Kade Draven (DRAFT_NOW) | Kade Draven 93 DRAFT_NOW; Galen Stroud 100 DRAFT_NOW; Florian Ravensworth 97 DRAFT_NOW |
| 6 | 85 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | 3PM:WEAK TO:SOFT_PUNT | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 96 DRAFT_NOW; Emeka Corvell 88 DRAFT_NOW; Idris Underhill 85 DRAFT_NOW |
| 9 | 140 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > REB > PTS | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Eli Ravensworth 68 WAIT; Blake Hartwell 50 WAIT |
| 12 | 169 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 84 LEAN_DRAFT; Kade Abernet 77 LEAN_DRAFT |

## Slot 1 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 1 Hugo Corvell (PG) · 28 Linus Eastlake (C) · 29 Cyrus Ingram (SG/SF) · 56 Kade Draven (C) · 57 Milo Northcott (PF) · 84 Idris Underhill (SF/PF) · 85 Emeka Corvell (SG) · 112 Hugo Kestrel (PG) · 113 Eli Fairbourne (C) · 140 Eli Ravensworth (C) · 141 Lior Vexley (C) · 168 Eli Zeller (PG/SG) · 169 Ansel Stroud (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 84 SAFE_WAIT; Emeka Blackwood 75 WAIT |
| 2 | 29 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 70 WAIT; Orin Hartwell 66 WAIT |
| 4 | 57 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Florian Ravensworth 88 DRAFT_NOW; Orin Ravensworth 83 LEAN_DRAFT |
| 6 | 85 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Emeka Corvell (DRAFT_NOW) | Emeka Corvell 100 DRAFT_NOW; Hugo Kestrel 93 DRAFT_NOW; Eli Birchwell 80 LEAN_DRAFT |
| 9 | 140 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Ansel Stroud 100 SAFE_WAIT; Eli Zeller 59 WAIT |
| 12 | 169 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT | Ansel Stroud (DRAFT_NOW) | Ansel Stroud 100 DRAFT_NOW; Jalen Yarrow 71 WAIT; Nico Fairbourne 61 WAIT |

## Slot 1 — guardHeavy

Final roster: 1 Quincy Calloway (PG) · 28 Cyrus Ingram (SG/SF) · 29 Kellan Lockhart (PG) · 56 Kade Draven (C) · 57 Milo Northcott (PF) · 84 Emeka Corvell (SG) · 85 Hugo Kestrel (PG) · 112 Eli Fairbourne (C) · 113 Eli Zeller (PG/SG) · 140 Eli Ravensworth (C) · 141 Lior Vexley (C) · 168 Rowan Hartwell (C) · 169 Nico Fairbourne (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 66 SAFE_WAIT; Emeka Blackwood 64 WAIT |
| 2 | 29 | balanced — no punt yet. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 75 LEAN_DRAFT |
| 4 | 57 | balanced — no punt yet. | BLK > REB > TO | BLK:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Finn Marlow 62 WAIT; Galen Stroud 47 PASS |
| 6 | 85 | balanced — no punt yet. | REB > BLK > PTS | — | Niall Pembrook (LEAN_DRAFT) | Niall Pembrook 89 LEAN_DRAFT; Idris Underhill 65 WAIT; Eli Fairbourne 100 SAFE_WAIT |
| 9 | 140 | balanced — no punt yet. | PTS > REB > BLK | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 75 SAFE_WAIT; Wes Ravensworth 76 LEAN_DRAFT |
| 12 | 169 | balanced — no punt yet. | PTS > 3PM > TO | — | Nico Fairbourne (DRAFT_NOW) | Nico Fairbourne 100 DRAFT_NOW; Lior Jessop 96 DRAFT_NOW; Lior Draven 95 DRAFT_NOW |

## Slot 1 — bigHeavy

Final roster: 1 Florian Ingram (C) · 28 Niall Northcott (PF/C) · 29 Ulises Birchwell (PF/C) · 56 Florian Ravensworth (SF/PF) · 57 Milo Northcott (PF) · 84 Idris Underhill (SF/PF) · 85 Eli Birchwell (PG) · 112 Eli Fairbourne (C) · 113 Hugo Kestrel (PG) · 140 Eli Zeller (PG/SG) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | AST > 3PM > STL | FT%:CRITICAL 3PM:CRITICAL AST:WEAK STL:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Kellan Lockhart 63 SAFE_WAIT; Niall Northcott 49 PASS |
| 2 | 29 | balanced — no punt yet. | AST > 3PM > FT% | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 67 WAIT; Orin Hartwell 57 WAIT |
| 4 | 57 | balanced — no punt yet. | 3PM > PTS > AST | 3PM:WEAK PTS:WEAK AST:CRITICAL STL:WEAK | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Milo Northcott 96 DRAFT_NOW; Orin Ravensworth 69 WAIT |
| 6 | 85 | balanced — no punt yet. | PTS > AST > 3PM | 3PM:WEAK PTS:WEAK AST:CRITICAL | Eli Birchwell (DRAFT_NOW) | Eli Birchwell 97 DRAFT_NOW; Hugo Kestrel 100 DRAFT_NOW; Florian Yarrow 95 DRAFT_NOW |
| 9 | 140 | balanced — no punt yet. | PTS > AST > 3PM | PTS:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Ulises Vexley 63 WAIT; Blake Hartwell 40 PASS |
| 12 | 169 | balanced — no punt yet. | PTS > 3PM > TO | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Lior Draven 86 DRAFT_NOW; Lior Jessop 81 LEAN_DRAFT |

## Slot 1 — injuryRiskStars

Final roster: 1 Quincy Calloway (PG) · 28 Cyrus Ingram (SG/SF) · 29 Linus Eastlake (C) · 56 Milo Northcott (PF) · 57 Kade Draven (C) · 84 Florian Yarrow (PG/SG) · 85 Idris Pembrook (SG) · 112 Hugo Kestrel (PG) · 113 Eli Fairbourne (C) · 140 Eli Zeller (PG/SG) · 141 Ulises Vexley (PG) · 168 Lior Vexley (C) · 169 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 28 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 66 SAFE_WAIT; Emeka Blackwood 64 WAIT |
| 2 | 29 | balanced — no punt yet. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 75 LEAN_DRAFT |
| 4 | 57 | balanced — no punt yet. | 3PM > PTS > TO | — | Kade Draven (DRAFT_NOW) | Kade Draven 90 DRAFT_NOW; Galen Stroud 100 DRAFT_NOW; Finn Marlow 77 LEAN_DRAFT |
| 6 | 85 | balanced — no punt yet. | 3PM > PTS > TO | 3PM:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 100 DRAFT_NOW; Emeka Corvell 95 DRAFT_NOW; Idris Underhill 90 DRAFT_NOW |
| 9 | 140 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 59 WAIT; Blake Hartwell 55 WAIT |
| 12 | 169 | balanced — no punt yet. | 3PM > TO > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 85 LEAN_DRAFT; Ivo Pembrook 83 LEAN_DRAFT |

## Slot 4 — balanced

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Linus Eastlake (C) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Zeller (PG/SG) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | balanced — no punt yet. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 75 LEAN_DRAFT |
| 4 | 60 | balanced — no punt yet. | 3PM > FT% > TO | FT%:WEAK 3PM:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Galen Stroud 87 DRAFT_NOW; Orin Ravensworth 52 WAIT |
| 6 | 88 | balanced — no punt yet. | 3PM > TO > PTS | 3PM:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 100 DRAFT_NOW; Emeka Corvell 95 DRAFT_NOW; Eli Birchwell 89 DRAFT_NOW |
| 9 | 137 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 59 WAIT; Orin Northcott 65 WAIT |
| 12 | 172 | balanced — no punt yet. | 3PM > TO > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 86 DRAFT_NOW; Ivo Pembrook 85 LEAN_DRAFT |

## Slot 4 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Linus Eastlake (C) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Zeller (PG/SG) · 137 Eli Fairbourne (C) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | Soft punt TO — 60% confidence (still recoverable) [manual]. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 64 WAIT |
| 2 | 32 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 94 DRAFT_NOW; Niall Northcott 75 WAIT |
| 4 | 60 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > FT% > AST | FT%:WEAK 3PM:WEAK TO:SOFT_PUNT | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Galen Stroud 86 DRAFT_NOW; Florian Yarrow 77 WAIT |
| 6 | 88 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | 3PM:WEAK TO:SOFT_PUNT | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 97 DRAFT_NOW; Emeka Corvell 89 DRAFT_NOW; Eli Birchwell 91 DRAFT_NOW |
| 9 | 137 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > 3PM > REB | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Eli Ravensworth 68 WAIT; Blake Hartwell 47 PASS |
| 12 | 172 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 85 DRAFT_NOW; Kade Abernet 82 LEAN_DRAFT |

## Slot 4 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 4 Hugo Corvell (PG) · 25 Linus Eastlake (C) · 32 Cyrus Ingram (SG/SF) · 53 Soren Northcott (C) · 60 Kade Draven (C) · 81 Idris Underhill (SF/PF) · 88 Emeka Corvell (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Ravensworth (C) · 144 Lior Vexley (C) · 165 Eli Zeller (PG/SG) · 172 Ansel Stroud (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 84 SAFE_WAIT; Emeka Blackwood 74 WAIT |
| 2 | 32 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 70 WAIT; Orin Hartwell 66 WAIT |
| 4 | 60 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > AST | FT%:PUNT 3PM:WEAK | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 69 WAIT; Orin Ravensworth 57 WAIT |
| 6 | 88 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Emeka Corvell (DRAFT_NOW) | Emeka Corvell 100 DRAFT_NOW; Hugo Kestrel 97 LEAN_DRAFT; Eli Birchwell 83 LEAN_DRAFT |
| 9 | 137 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 97 LEAN_DRAFT; Ansel Stroud 100 SAFE_WAIT; Hollis Quill 73 WAIT |
| 12 | 172 | Punt FT% — 100% confidence [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Ansel Stroud (DRAFT_NOW) | Ansel Stroud 100 DRAFT_NOW; Jalen Yarrow 72 WAIT; Nico Fairbourne 62 WAIT |

## Slot 4 — guardHeavy

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Kellan Lockhart (PG) · 53 Soren Northcott (C) · 60 Kade Draven (C) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Ravensworth (C) · 144 Eli Zeller (PG/SG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | balanced — no punt yet. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 75 LEAN_DRAFT |
| 4 | 60 | balanced — no punt yet. | FG% > BLK > REB | FG%:WEAK BLK:WEAK | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 95 DRAFT_NOW; Finn Marlow 55 WAIT |
| 6 | 88 | balanced — no punt yet. | TO > 3PM > BLK | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Idris Pembrook 79 LEAN_DRAFT; Emeka Corvell 84 LEAN_DRAFT |
| 9 | 137 | balanced — no punt yet. | TO > PTS > FG% | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Eli Zeller 77 WAIT; Lior Vexley 81 WAIT |
| 12 | 172 | balanced — no punt yet. | TO > PTS > 3PM | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 84 LEAN_DRAFT; Ivo Pembrook 82 LEAN_DRAFT |

## Slot 4 — bigHeavy

Final roster: 4 Florian Ingram (C) · 25 Niall Northcott (PF/C) · 32 Ulises Birchwell (PF/C) · 53 Florian Ravensworth (SF/PF) · 60 Milo Northcott (PF) · 81 Idris Underhill (SF/PF) · 88 Eli Birchwell (PG) · 109 Eli Fairbourne (C) · 116 Hugo Kestrel (PG) · 137 Eli Zeller (PG/SG) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | AST > FT% > 3PM | FT%:CRITICAL 3PM:CRITICAL AST:WEAK STL:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Kellan Lockhart 62 WAIT; Niall Northcott 48 PASS |
| 2 | 32 | balanced — no punt yet. | AST > 3PM > FT% | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 67 WAIT; Orin Hartwell 58 WAIT |
| 4 | 60 | balanced — no punt yet. | AST > PTS > 3PM | 3PM:WEAK PTS:WEAK AST:CRITICAL STL:WEAK | Galen Stroud (DRAFT_NOW) | Galen Stroud 100 DRAFT_NOW; Milo Northcott 96 DRAFT_NOW; Orin Ravensworth 70 WAIT |
| 6 | 88 | balanced — no punt yet. | AST > PTS > 3PM | 3PM:WEAK PTS:WEAK AST:CRITICAL | Eli Birchwell (DRAFT_NOW) | Eli Birchwell 97 DRAFT_NOW; Idris Pembrook 86 DRAFT_NOW; Hugo Kestrel 100 WAIT |
| 9 | 137 | balanced — no punt yet. | PTS > 3PM > AST | PTS:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Orin Northcott 60 WAIT; Ulises Vexley 61 WAIT |
| 12 | 172 | balanced — no punt yet. | PTS > 3PM > TO | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Lior Draven 87 DRAFT_NOW; Wes Garrow 81 LEAN_DRAFT |

## Slot 4 — injuryRiskStars

Final roster: 4 Quincy Calloway (PG) · 25 Cyrus Ingram (SG/SF) · 32 Linus Eastlake (C) · 53 Soren Northcott (C) · 60 Milo Northcott (PF) · 81 Florian Yarrow (PG/SG) · 88 Idris Pembrook (SG) · 109 Hugo Kestrel (PG) · 116 Eli Fairbourne (C) · 137 Eli Zeller (PG/SG) · 144 Ulises Vexley (PG) · 165 Lior Vexley (C) · 172 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 25 | balanced — no punt yet. | FG% > BLK > REB | FG%:CRITICAL REB:WEAK BLK:CRITICAL TO:WEAK | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 65 SAFE_WAIT; Emeka Blackwood 63 WAIT |
| 2 | 32 | balanced — no punt yet. | REB > BLK > FG% | FG%:WEAK REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Emeka Blackwood 93 DRAFT_NOW; Niall Northcott 75 LEAN_DRAFT |
| 4 | 60 | balanced — no punt yet. | 3PM > FT% > TO | FT%:WEAK 3PM:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Galen Stroud 87 DRAFT_NOW; Orin Ravensworth 52 WAIT |
| 6 | 88 | balanced — no punt yet. | 3PM > TO > PTS | 3PM:WEAK | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 100 DRAFT_NOW; Emeka Corvell 95 DRAFT_NOW; Eli Birchwell 89 DRAFT_NOW |
| 9 | 137 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 59 WAIT; Orin Northcott 65 WAIT |
| 12 | 172 | balanced — no punt yet. | 3PM > TO > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 86 DRAFT_NOW; Ivo Pembrook 85 LEAN_DRAFT |

## Slot 7 — balanced

Final roster: 7 Tate Dunmore (PG) · 22 Hugo Corvell (PG) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Milo Northcott (PF) · 78 Idris Underhill (SF/PF) · 91 Eli Fairbourne (C) · 106 Hugo Kestrel (PG) · 119 Eli Ravensworth (C) · 134 Eli Zeller (PG/SG) · 147 Lior Vexley (C) · 162 Rowan Hartwell (C) · 175 Nico Fairbourne (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | REB > TO > BLK | REB:WEAK BLK:WEAK TO:CRITICAL | Hugo Corvell (LEAN_DRAFT) | Hugo Corvell 79 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 61 SAFE_WAIT |
| 2 | 35 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 64 WAIT; Linus Eastlake 81 LEAN_DRAFT |
| 4 | 63 | balanced — no punt yet. | BLK > TO > REB | TO:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Kade Draven 96 DRAFT_NOW; Finn Marlow 62 WAIT |
| 6 | 91 | balanced — no punt yet. | TO > REB > BLK | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Emeka Corvell 57 WAIT; Hugo Kestrel 49 PASS |
| 9 | 134 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Rowan Hartwell 58 SAFE_WAIT; Orin Northcott 64 WAIT |
| 12 | 175 | balanced — no punt yet. | 3PM > TO > PTS | — | Nico Fairbourne (DRAFT_NOW) | Nico Fairbourne 100 DRAFT_NOW; Ivo Pembrook 92 DRAFT_NOW; Kade Abernet 89 DRAFT_NOW |

## Slot 7 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 7 Tate Dunmore (PG) · 22 Hugo Corvell (PG) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Kade Draven (C) · 78 Florian Yarrow (PG/SG) · 91 Idris Pembrook (SG) · 106 Niall Pembrook (C) · 119 Hugo Kestrel (PG) · 134 Eli Fairbourne (C) · 147 Eli Zeller (PG/SG) · 162 Lior Vexley (C) · 175 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > FG% | REB:WEAK BLK:WEAK TO:SOFT_PUNT | Hugo Corvell (LEAN_DRAFT) | Hugo Corvell 80 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 62 SAFE_WAIT |
| 2 | 35 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 64 WAIT; Linus Eastlake 81 LEAN_DRAFT |
| 4 | 63 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > TO | TO:SOFT_PUNT | Kade Draven (DRAFT_NOW) | Kade Draven 99 DRAFT_NOW; Milo Northcott 100 DRAFT_NOW; Finn Marlow 64 WAIT |
| 6 | 91 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > 3PM > REB | TO:SOFT_PUNT | Idris Pembrook (DRAFT_NOW) | Idris Pembrook 89 DRAFT_NOW; Eli Fairbourne 100 SAFE_WAIT; Emeka Corvell 88 DRAFT_NOW |
| 9 | 134 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > REB > BLK | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Eli Zeller 59 WAIT; Eli Ravensworth 65 WAIT |
| 12 | 175 | Soft punt TO — 60% confidence (hard to recover) [manual]. | TO > 3PM > REB | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 83 LEAN_DRAFT; Ivo Pembrook 77 LEAN_DRAFT |

## Slot 7 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 7 Hugo Corvell (PG) · 22 Linus Eastlake (C) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Kade Draven (C) · 78 Idris Underhill (SF/PF) · 91 Emeka Corvell (SG) · 106 Hugo Kestrel (PG) · 119 Eli Fairbourne (C) · 134 Eli Ravensworth (C) · 147 Lior Vexley (C) · 162 Eli Zeller (PG/SG) · 175 Ansel Stroud (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > FG% | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (LEAN_DRAFT) | Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 83 SAFE_WAIT; Tate Dunmore 80 LEAN_DRAFT |
| 2 | 35 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 70 WAIT; Orin Hartwell 67 WAIT |
| 4 | 63 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > AST | FT%:PUNT 3PM:WEAK | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 70 WAIT; Orin Ravensworth 58 WAIT |
| 6 | 91 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Emeka Corvell (DRAFT_NOW) | Emeka Corvell 100 DRAFT_NOW; Hugo Kestrel 98 LEAN_DRAFT; Idris Pembrook 76 LEAN_DRAFT |
| 9 | 134 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > AST > PTS | FT%:PUNT 3PM:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 97 LEAN_DRAFT; Ansel Stroud 100 SAFE_WAIT; Hollis Quill 73 WAIT |
| 12 | 175 | Punt FT% — 100% confidence [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Ansel Stroud (DRAFT_NOW) | Ansel Stroud 100 DRAFT_NOW; Jalen Yarrow 73 WAIT; Nico Fairbourne 63 WAIT |

## Slot 7 — guardHeavy

Final roster: 7 Tate Dunmore (PG) · 22 Hugo Corvell (PG) · 35 Cyrus Ingram (SG/SF) · 50 Yuri Ravensworth (SG/SF) · 63 Kade Draven (C) · 78 Niall Pembrook (C) · 91 Emeka Corvell (SG) · 106 Hugo Kestrel (PG) · 119 Eli Fairbourne (C) · 134 Eli Ravensworth (C) · 147 Eli Zeller (PG/SG) · 162 Lior Vexley (C) · 175 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | REB > TO > BLK | REB:WEAK BLK:WEAK TO:CRITICAL | Hugo Corvell (LEAN_DRAFT) | Hugo Corvell 79 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 61 SAFE_WAIT |
| 2 | 35 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 64 WAIT; Linus Eastlake 81 LEAN_DRAFT |
| 4 | 63 | balanced — no punt yet. | BLK > REB > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Kade Draven (DRAFT_NOW) | Kade Draven 100 DRAFT_NOW; Milo Northcott 85 LEAN_DRAFT; Finn Marlow 56 WAIT |
| 6 | 91 | balanced — no punt yet. | TO > REB > BLK | TO:WEAK | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Emeka Corvell 69 WAIT; Idris Pembrook 60 WAIT |
| 9 | 134 | balanced — no punt yet. | TO > REB > BLK | TO:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Eli Zeller 64 WAIT; Ivo Pembrook 80 SAFE_WAIT |
| 12 | 175 | balanced — no punt yet. | TO > 3PM > REB | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 87 DRAFT_NOW; Ivo Pembrook 86 DRAFT_NOW |

## Slot 7 — bigHeavy

Final roster: 7 Florian Ingram (C) · 22 Niall Northcott (PF/C) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Milo Northcott (PF) · 78 Idris Underhill (SF/PF) · 91 Idris Pembrook (SG) · 106 Eli Fairbourne (C) · 119 Hugo Kestrel (PG) · 134 Eli Zeller (PG/SG) · 147 Blake Hartwell (PF) · 162 Lior Vexley (C) · 175 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | AST > 3PM > STL | FT%:CRITICAL 3PM:CRITICAL AST:WEAK STL:CRITICAL | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 91 DRAFT_NOW; Hugo Corvell 88 DRAFT_NOW; Kellan Lockhart 61 WAIT |
| 2 | 35 | balanced — no punt yet. | 3PM > AST > STL | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL STL:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Kellan Lockhart 67 WAIT; Orin Hartwell 58 WAIT |
| 4 | 63 | balanced — no punt yet. | AST > 3PM > FT% | FT%:WEAK 3PM:WEAK AST:CRITICAL STL:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 97 DRAFT_NOW; Hugo Kestrel 100 SAFE_WAIT; Florian Yarrow 94 WAIT |
| 6 | 91 | balanced — no punt yet. | AST > 3PM > STL | 3PM:WEAK AST:CRITICAL | Idris Pembrook (LEAN_DRAFT) | Idris Pembrook 84 LEAN_DRAFT; Emeka Corvell 75 LEAN_DRAFT; Hugo Kestrel 100 WAIT |
| 9 | 134 | balanced — no punt yet. | AST > 3PM > PTS | AST:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Ulises Vexley 61 WAIT; Orin Northcott 55 WAIT |
| 12 | 175 | balanced — no punt yet. | AST > 3PM > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Wes Garrow 99 DRAFT_NOW; Nico Fairbourne 81 LEAN_DRAFT |

## Slot 7 — injuryRiskStars

Final roster: 7 Tate Dunmore (PG) · 22 Hugo Corvell (PG) · 35 Cyrus Ingram (SG/SF) · 50 Soren Northcott (C) · 63 Milo Northcott (PF) · 78 Idris Underhill (SF/PF) · 91 Eli Fairbourne (C) · 106 Hugo Kestrel (PG) · 119 Eli Ravensworth (C) · 134 Eli Zeller (PG/SG) · 147 Lior Vexley (C) · 162 Rowan Hartwell (C) · 175 Nico Fairbourne (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 22 | balanced — no punt yet. | REB > TO > BLK | REB:WEAK BLK:WEAK TO:CRITICAL | Hugo Corvell (LEAN_DRAFT) | Hugo Corvell 79 LEAN_DRAFT; Cyrus Ingram 100 LEAN_DRAFT; Linus Eastlake 61 SAFE_WAIT |
| 2 | 35 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Niall Northcott 64 WAIT; Linus Eastlake 81 LEAN_DRAFT |
| 4 | 63 | balanced — no punt yet. | BLK > TO > REB | TO:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Kade Draven 96 DRAFT_NOW; Finn Marlow 62 WAIT |
| 6 | 91 | balanced — no punt yet. | TO > REB > BLK | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Emeka Corvell 57 WAIT; Hugo Kestrel 49 PASS |
| 9 | 134 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Rowan Hartwell 58 SAFE_WAIT; Orin Northcott 64 WAIT |
| 12 | 175 | balanced — no punt yet. | 3PM > TO > PTS | — | Nico Fairbourne (DRAFT_NOW) | Nico Fairbourne 100 DRAFT_NOW; Ivo Pembrook 92 DRAFT_NOW; Kade Abernet 89 DRAFT_NOW |

## Slot 11 — balanced

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Linus Eastlake (C) · 46 Yuri Ravensworth (SG/SF) · 67 Milo Northcott (PF) · 74 Hugo Kestrel (PG) · 95 Eli Fairbourne (C) · 102 Niall Pembrook (C) · 123 Idris Thorne (PG) · 130 Eli Zeller (PG/SG) · 151 Eli Ravensworth (C) · 158 Lior Vexley (C) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 80 LEAN_DRAFT; Niall Northcott 54 WAIT |
| 2 | 39 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 73 WAIT; Yuri Ravensworth 54 WAIT |
| 4 | 67 | balanced — no punt yet. | BLK > TO > REB | — | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Eli Fairbourne 53 SAFE_WAIT; Finn Marlow 65 WAIT |
| 6 | 95 | balanced — no punt yet. | TO > REB > BLK | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Emeka Corvell 60 WAIT; Idris Pembrook 54 WAIT |
| 9 | 130 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 64 WAIT; Orin Northcott 66 WAIT |
| 12 | 179 | balanced — no punt yet. | 3PM > TO > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 81 LEAN_DRAFT; Wes Garrow 78 LEAN_DRAFT |

## Slot 11 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 11 Cyrus Ingram (SG/SF) · 18 Tate Dunmore (PG) · 39 Linus Eastlake (C) · 46 Orin Wolcott (SG/SF) · 67 Milo Northcott (PF) · 74 Eli Fairbourne (C) · 95 Idris Pembrook (SG) · 102 Hugo Kestrel (PG) · 123 Eli Zeller (PG/SG) · 130 Eli Ravensworth (C) · 151 Blake Hartwell (PF) · 158 Lior Vexley (C) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | Soft punt TO — 60% confidence (still recoverable) [manual]. | AST > BLK > REB | REB:WEAK AST:WEAK BLK:WEAK TO:SOFT_PUNT | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 100 DRAFT_NOW; Hugo Corvell 97 DRAFT_NOW; Kellan Lockhart 64 WAIT |
| 2 | 39 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Orin Wolcott 54 WAIT; Soren Northcott 69 WAIT |
| 4 | 67 | Soft punt TO — 60% confidence (still recoverable) [manual]. | BLK > REB > TO | TO:SOFT_PUNT | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Finn Marlow 65 WAIT; Eli Fairbourne 51 SAFE_WAIT |
| 6 | 95 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > AST | TO:SOFT_PUNT | Idris Pembrook (LEAN_DRAFT) | Idris Pembrook 86 LEAN_DRAFT; Emeka Corvell 83 LEAN_DRAFT; Hugo Kestrel 100 WAIT |
| 9 | 130 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > TO > PTS | TO:SOFT_PUNT | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Rowan Hartwell 77 SAFE_WAIT; Blake Hartwell 66 WAIT |
| 12 | 179 | Soft punt TO — 60% confidence (still recoverable) [manual]. | PTS > TO > 3PM | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 81 LEAN_DRAFT; Kade Abernet 73 WAIT |

## Slot 11 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 11 Hugo Corvell (PG) · 18 Tate Dunmore (PG) · 39 Linus Eastlake (C) · 46 Soren Northcott (C) · 67 Milo Northcott (PF) · 74 Emeka Corvell (SG) · 95 Eli Fairbourne (C) · 102 Hugo Kestrel (PG) · 123 Ansel Stroud (C) · 130 Eli Ravensworth (C) · 151 Lior Vexley (C) · 158 Eli Zeller (PG/SG) · 179 Jalen Yarrow (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 80 LEAN_DRAFT; Kellan Lockhart 53 WAIT |
| 2 | 39 | Punt FT% — 100% confidence (still recoverable) [manual]. | REB > BLK > TO | FT%:PUNT REB:CRITICAL BLK:CRITICAL TO:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Kade Draven 62 SAFE_WAIT; Soren Northcott 78 WAIT |
| 4 | 67 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > PTS | FT%:PUNT 3PM:WEAK TO:WEAK | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Orin Ravensworth 85 DRAFT_NOW; Quincy Marlow 60 WAIT |
| 6 | 95 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > TO > PTS | FT%:PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Idris Pembrook 70 WAIT; Hugo Kestrel 72 WAIT |
| 9 | 130 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 100 LEAN_DRAFT; Hollis Quill 71 WAIT; Orin Northcott 51 WAIT |
| 12 | 179 | Punt FT% — 100% confidence [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Jalen Yarrow (DRAFT_NOW) | Jalen Yarrow 100 DRAFT_NOW; Nico Fairbourne 93 DRAFT_NOW; Rowan Hartwell 86 DRAFT_NOW |

## Slot 11 — guardHeavy

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Yuri Ravensworth (SG/SF) · 46 Orin Wolcott (SG/SF) · 67 Milo Northcott (PF) · 74 Niall Pembrook (C) · 95 Hugo Kestrel (PG) · 102 Eli Fairbourne (C) · 123 Eli Ravensworth (C) · 130 Eli Zeller (PG/SG) · 151 Lior Vexley (C) · 158 Blake Hartwell (PF) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 80 LEAN_DRAFT; Niall Northcott 54 WAIT |
| 2 | 39 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 73 WAIT; Yuri Ravensworth 54 WAIT |
| 4 | 67 | balanced — no punt yet. | BLK > REB > FG% | REB:CRITICAL BLK:CRITICAL | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Finn Marlow 68 WAIT; Eli Fairbourne 77 SAFE_WAIT |
| 6 | 95 | balanced — no punt yet. | REB > BLK > TO | REB:WEAK BLK:WEAK | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Hugo Kestrel 42 PASS; Emeka Corvell 44 PASS |
| 9 | 130 | balanced — no punt yet. | PTS > 3PM > REB | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Rowan Hartwell 69 SAFE_WAIT; Lior Vexley 66 WAIT |
| 12 | 179 | balanced — no punt yet. | PTS > TO > 3PM | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 86 DRAFT_NOW; Ivo Pembrook 83 LEAN_DRAFT |

## Slot 11 — bigHeavy

Final roster: 11 Emeka Blackwood (C) · 18 Niall Northcott (PF/C) · 39 Linus Eastlake (C) · 46 Milo Northcott (PF) · 67 Orin Ravensworth (SF/PF) · 74 Florian Yarrow (PG/SG) · 95 Idris Pembrook (SG) · 102 Hugo Kestrel (PG) · 123 Eli Zeller (PG/SG) · 130 Eli Fairbourne (C) · 151 Blake Hartwell (PF) · 158 Lior Draven (SG/SF) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | AST > 3PM > FT% | FT%:CRITICAL 3PM:CRITICAL AST:CRITICAL STL:WEAK | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 91 DRAFT_NOW; Cyrus Ingram 100 DRAFT_NOW; Hugo Corvell 88 DRAFT_NOW |
| 2 | 39 | balanced — no punt yet. | AST > 3PM > STL | FT%:WEAK 3PM:WEAK AST:CRITICAL STL:CRITICAL | Orin Wolcott (DRAFT_NOW) | Orin Wolcott 98 DRAFT_NOW; Yuri Ravensworth 95 LEAN_DRAFT; Quincy Fairbourne 100 DRAFT_NOW |
| 4 | 67 | balanced — no punt yet. | 3PM > FT% > AST | FT%:CRITICAL 3PM:CRITICAL PTS:WEAK AST:CRITICAL STL:WEAK | Florian Yarrow (LEAN_DRAFT) | Florian Yarrow 96 LEAN_DRAFT; Hugo Kestrel 100 SAFE_WAIT; Idris Pembrook 90 SAFE_WAIT |
| 6 | 95 | balanced — no punt yet. | 3PM > AST > PTS | FT%:WEAK 3PM:CRITICAL AST:WEAK | Idris Pembrook (LEAN_DRAFT) | Idris Pembrook 92 LEAN_DRAFT; Emeka Corvell 81 LEAN_DRAFT; Hugo Kestrel 100 WAIT |
| 9 | 130 | balanced — no punt yet. | 3PM > PTS > TO | — | Eli Fairbourne (DRAFT_NOW) | Eli Fairbourne 100 DRAFT_NOW; Orin Northcott 68 WAIT; Ulises Vexley 57 WAIT |
| 12 | 179 | balanced — no punt yet. | 3PM > PTS > AST | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Wes Garrow 85 LEAN_DRAFT; Nico Fairbourne 83 LEAN_DRAFT |

## Slot 11 — injuryRiskStars

Final roster: 11 Hugo Corvell (PG) · 18 Cyrus Ingram (SG/SF) · 39 Linus Eastlake (C) · 46 Yuri Ravensworth (SG/SF) · 67 Milo Northcott (PF) · 74 Hugo Kestrel (PG) · 95 Eli Fairbourne (C) · 102 Niall Pembrook (C) · 123 Idris Thorne (PG) · 130 Eli Zeller (PG/SG) · 151 Eli Ravensworth (C) · 158 Lior Vexley (C) · 179 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 18 | balanced — no punt yet. | BLK > REB > TO | REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 80 LEAN_DRAFT; Niall Northcott 54 WAIT |
| 2 | 39 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 73 WAIT; Yuri Ravensworth 54 WAIT |
| 4 | 67 | balanced — no punt yet. | BLK > TO > REB | — | Milo Northcott (DRAFT_NOW) | Milo Northcott 100 DRAFT_NOW; Eli Fairbourne 53 SAFE_WAIT; Finn Marlow 65 WAIT |
| 6 | 95 | balanced — no punt yet. | TO > REB > BLK | — | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Emeka Corvell 60 WAIT; Idris Pembrook 54 WAIT |
| 9 | 130 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 64 WAIT; Orin Northcott 66 WAIT |
| 12 | 179 | balanced — no punt yet. | 3PM > TO > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 81 LEAN_DRAFT; Wes Garrow 78 LEAN_DRAFT |

## Slot 14 — balanced

Final roster: 14 Cyrus Ingram (SG/SF) · 15 Tate Dunmore (PG) · 42 Linus Eastlake (C) · 43 Orin Wolcott (SG/SF) · 70 Orin Ravensworth (SF/PF) · 71 Eli Fairbourne (C) · 98 Emeka Corvell (SG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Ravensworth (C) · 154 Eli Zeller (PG/SG) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | AST > BLK > REB | REB:WEAK AST:WEAK BLK:WEAK | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 100 DRAFT_NOW; Hugo Corvell 98 DRAFT_NOW; Kellan Lockhart 64 WAIT |
| 2 | 42 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 73 SAFE_WAIT; Orin Wolcott 55 WAIT |
| 4 | 70 | balanced — no punt yet. | TO > BLK > REB | TO:WEAK | Orin Ravensworth (LEAN_DRAFT) | Orin Ravensworth 83 LEAN_DRAFT; Eli Fairbourne 100 SAFE_WAIT; Idris Underhill 70 SAFE_WAIT |
| 6 | 98 | balanced — no punt yet. | PTS > 3PM > AST | — | Emeka Corvell (LEAN_DRAFT) | Emeka Corvell 89 LEAN_DRAFT; Niall Pembrook 60 WAIT; Hugo Kestrel 100 SAFE_WAIT |
| 9 | 127 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 77 LEAN_DRAFT; Eli Zeller 100 WAIT; Rowan Hartwell 63 SAFE_WAIT |
| 12 | 182 | balanced — no punt yet. | TO > 3PM > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 87 DRAFT_NOW; Ivo Pembrook 84 LEAN_DRAFT |

## Slot 14 — softPuntTO (overrides {"TO":"SOFT"})

Final roster: 14 Cyrus Ingram (SG/SF) · 15 Tate Dunmore (PG) · 42 Linus Eastlake (C) · 43 Orin Wolcott (SG/SF) · 70 Eli Fairbourne (C) · 71 Orin Ravensworth (SF/PF) · 98 Emeka Corvell (SG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Zeller (PG/SG) · 154 Eli Ravensworth (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | Soft punt TO — 60% confidence (still recoverable) [manual]. | AST > BLK > REB | REB:WEAK AST:WEAK BLK:WEAK TO:SOFT_PUNT | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 100 DRAFT_NOW; Hugo Corvell 97 DRAFT_NOW; Linus Eastlake 64 WAIT |
| 2 | 42 | Soft punt TO — 60% confidence (still recoverable) [manual]. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:SOFT_PUNT | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 69 SAFE_WAIT; Orin Wolcott 55 WAIT |
| 4 | 70 | Soft punt TO — 60% confidence (still recoverable) [manual]. | TO > BLK > REB | TO:SOFT_PUNT | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Orin Ravensworth 89 LEAN_DRAFT; Hugo Kestrel 58 SAFE_WAIT |
| 6 | 98 | Soft punt TO — 60% confidence (still recoverable) [manual]. | PTS > 3PM > AST | TO:SOFT_PUNT | Emeka Corvell (LEAN_DRAFT) | Emeka Corvell 82 LEAN_DRAFT; Hugo Kestrel 100 SAFE_WAIT; Niall Pembrook 55 WAIT |
| 9 | 127 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > PTS > TO | TO:SOFT_PUNT | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Ravensworth 68 WAIT; Lior Vexley 53 WAIT |
| 12 | 182 | Soft punt TO — 60% confidence (still recoverable) [manual]. | 3PM > TO > PTS | TO:SOFT_PUNT | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 86 DRAFT_NOW; Kade Abernet 78 LEAN_DRAFT |

## Slot 14 — puntFT (overrides {"FT_PCT":"HARD"})

Final roster: 14 Hugo Corvell (PG) · 15 Linus Eastlake (C) · 42 Soren Northcott (C) · 43 Orin Wolcott (SG/SF) · 70 Orin Ravensworth (SF/PF) · 71 Quincy Marlow (C) · 98 Hugo Kestrel (PG) · 99 Niall Pembrook (C) · 126 Hollis Quill (SG) · 127 Eli Fairbourne (C) · 154 Eli Ravensworth (C) · 155 Eli Zeller (PG/SG) · 182 Ansel Stroud (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | Punt FT% — 100% confidence (still recoverable) [manual]. | BLK > REB > TO | FT%:PUNT REB:WEAK BLK:CRITICAL | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 79 LEAN_DRAFT; Kellan Lockhart 51 WAIT |
| 2 | 42 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK PTS:WEAK | Orin Wolcott (LEAN_DRAFT) | Orin Wolcott 99 LEAN_DRAFT; Soren Northcott 100 SAFE_WAIT; Yuri Ravensworth 85 LEAN_DRAFT |
| 4 | 70 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Orin Ravensworth (DRAFT_NOW) | Orin Ravensworth 100 DRAFT_NOW; Quincy Marlow 72 WAIT; Emeka Kestrel 66 WAIT |
| 6 | 98 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > AST | FT%:PUNT 3PM:WEAK | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 100 LEAN_DRAFT; Niall Pembrook 68 WAIT; Milo Fairbourne 69 WAIT |
| 9 | 127 | Punt FT% — 100% confidence (still recoverable) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Eli Fairbourne (DRAFT_NOW) | Eli Fairbourne 100 DRAFT_NOW; Ansel Stroud 96 SAFE_WAIT; Idris Thorne 59 WAIT |
| 12 | 182 | Punt FT% — 100% confidence (hard to recover) [manual]. | 3PM > PTS > TO | FT%:PUNT 3PM:WEAK | Ansel Stroud (DRAFT_NOW) | Ansel Stroud 100 DRAFT_NOW; Jalen Yarrow 73 WAIT; Nico Fairbourne 63 WAIT |

## Slot 14 — guardHeavy

Final roster: 14 Cyrus Ingram (SG/SF) · 15 Tate Dunmore (PG) · 42 Orin Wolcott (SG/SF) · 43 Yuri Ravensworth (SG/SF) · 70 Eli Fairbourne (C) · 71 Niall Pembrook (C) · 98 Hugo Kestrel (PG) · 99 Emeka Corvell (SG) · 126 Eli Ravensworth (C) · 127 Eli Zeller (PG/SG) · 154 Lior Vexley (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | AST > BLK > REB | REB:WEAK AST:WEAK BLK:WEAK | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 100 DRAFT_NOW; Hugo Corvell 98 DRAFT_NOW; Kellan Lockhart 64 WAIT |
| 2 | 42 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 73 SAFE_WAIT; Orin Wolcott 55 WAIT |
| 4 | 70 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:WEAK | Eli Fairbourne (LEAN_DRAFT) | Eli Fairbourne 100 LEAN_DRAFT; Niall Pembrook 83 SAFE_WAIT; Quincy Marlow 68 WAIT |
| 6 | 98 | balanced — no punt yet. | REB > TO > BLK | — | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 99 LEAN_DRAFT; Eli Ravensworth 78 SAFE_WAIT; Emeka Corvell 100 DRAFT_NOW |
| 9 | 127 | balanced — no punt yet. | REB > PTS > TO | — | Eli Zeller (LEAN_DRAFT) | Eli Zeller 90 LEAN_DRAFT; Lior Vexley 100 WAIT; Ivo Pembrook 98 SAFE_WAIT |
| 12 | 182 | balanced — no punt yet. | TO > REB > PTS | — | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Ivo Pembrook 88 DRAFT_NOW; Nico Fairbourne 88 DRAFT_NOW |

## Slot 14 — bigHeavy

Final roster: 14 Linus Eastlake (C) · 15 Niall Northcott (PF/C) · 42 Milo Northcott (PF) · 43 Florian Ravensworth (SF/PF) · 70 Orin Ravensworth (SF/PF) · 71 Florian Yarrow (PG/SG) · 98 Hugo Kestrel (PG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Zeller (PG/SG) · 154 Eli Fairbourne (C) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | AST > FT% > 3PM | FT%:CRITICAL 3PM:CRITICAL PTS:WEAK AST:CRITICAL STL:WEAK | Cyrus Ingram (DRAFT_NOW) | Cyrus Ingram 100 DRAFT_NOW; Tate Dunmore 92 DRAFT_NOW; Hugo Corvell 87 DRAFT_NOW |
| 2 | 42 | balanced — no punt yet. | PTS > AST > 3PM | FT%:CRITICAL 3PM:WEAK PTS:WEAK AST:CRITICAL STL:WEAK | Yuri Ravensworth (DRAFT_NOW) | Yuri Ravensworth 96 DRAFT_NOW; Orin Wolcott 92 WAIT; Marek Birchwell 100 SAFE_WAIT |
| 4 | 70 | balanced — no punt yet. | 3PM > PTS > FT% | FT%:WEAK 3PM:WEAK PTS:WEAK AST:CRITICAL | Florian Yarrow (LEAN_DRAFT) | Florian Yarrow 100 LEAN_DRAFT; Hugo Kestrel 98 SAFE_WAIT; Idris Pembrook 87 SAFE_WAIT |
| 6 | 98 | balanced — no punt yet. | PTS > 3PM > AST | 3PM:WEAK PTS:WEAK AST:WEAK | Hugo Kestrel (LEAN_DRAFT) | Hugo Kestrel 100 LEAN_DRAFT; Eli Zeller 83 SAFE_WAIT; Idris Thorne 75 SAFE_WAIT |
| 9 | 127 | balanced — no punt yet. | 3PM > PTS > AST | 3PM:WEAK PTS:WEAK | Eli Zeller (LEAN_DRAFT) | Eli Zeller 100 LEAN_DRAFT; Eli Fairbourne 73 WAIT; Orin Northcott 63 WAIT |
| 12 | 182 | balanced — no punt yet. | 3PM > PTS > TO | 3PM:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 80 LEAN_DRAFT; Ansel Stroud 72 WAIT |

## Slot 14 — injuryRiskStars

Final roster: 14 Cyrus Ingram (SG/SF) · 15 Tate Dunmore (PG) · 42 Linus Eastlake (C) · 43 Orin Wolcott (SG/SF) · 70 Orin Ravensworth (SF/PF) · 71 Eli Fairbourne (C) · 98 Emeka Corvell (SG) · 99 Niall Pembrook (C) · 126 Idris Thorne (PG) · 127 Eli Ravensworth (C) · 154 Eli Zeller (PG/SG) · 155 Blake Hartwell (PF) · 182 Rowan Hartwell (C)

| After round | Pick | Build | Priority | Weak/punt categories | Recommended | Top-3 |
|---|---|---|---|---|---|---|
| 1 | 15 | balanced — no punt yet. | AST > BLK > REB | REB:WEAK AST:WEAK BLK:WEAK | Tate Dunmore (DRAFT_NOW) | Tate Dunmore 100 DRAFT_NOW; Hugo Corvell 98 DRAFT_NOW; Kellan Lockhart 64 WAIT |
| 2 | 42 | balanced — no punt yet. | REB > BLK > TO | REB:CRITICAL BLK:CRITICAL TO:WEAK | Linus Eastlake (DRAFT_NOW) | Linus Eastlake 100 DRAFT_NOW; Soren Northcott 73 SAFE_WAIT; Orin Wolcott 55 WAIT |
| 4 | 70 | balanced — no punt yet. | TO > BLK > REB | TO:WEAK | Orin Ravensworth (LEAN_DRAFT) | Orin Ravensworth 83 LEAN_DRAFT; Eli Fairbourne 100 SAFE_WAIT; Idris Underhill 70 SAFE_WAIT |
| 6 | 98 | balanced — no punt yet. | PTS > 3PM > AST | — | Emeka Corvell (LEAN_DRAFT) | Emeka Corvell 89 LEAN_DRAFT; Niall Pembrook 60 WAIT; Hugo Kestrel 100 SAFE_WAIT |
| 9 | 127 | balanced — no punt yet. | 3PM > TO > PTS | — | Eli Ravensworth (LEAN_DRAFT) | Eli Ravensworth 77 LEAN_DRAFT; Eli Zeller 100 WAIT; Rowan Hartwell 63 SAFE_WAIT |
| 12 | 182 | balanced — no punt yet. | TO > 3PM > PTS | TO:WEAK | Rowan Hartwell (DRAFT_NOW) | Rowan Hartwell 100 DRAFT_NOW; Nico Fairbourne 87 DRAFT_NOW; Ivo Pembrook 84 LEAN_DRAFT |
