# Yahoo Fantasy Basketball 9-Cat Draft Decision Engine

A local-first, deterministic web app for **live Yahoo H2H 9-category snake drafts**. It answers one question: _given my roster, the remaining pool, category needs, positions, durability, Yahoo market data and my next pick, who should I draft now?_

- **Not a rankings clone.** Yahoo XRank / Rank / L7 ADP and projection providers are _inputs_. The engine is a decision layer on top of them.
- **Deterministic TypeScript.** No AI or LLM is involved in rankings or advice. Identical state gives identical output.
- **Works offline during the draft.** Everything is stored in your browser (IndexedDB). No backend is required.
- **Fully explainable.** Every number behind every recommendation is visible in Review / Debug.

## Quick start

```bash
npm ci
npm run dev            # http://localhost:3000
```

1. **Leagues.** Create a league, then open **Setup** to set teams, your draft position, roster, bench/IL, playoff weeks and the primary projection source.
2. **Data.** Import your projections (Hashtag-style CSV) and the Yahoo market CSV (XRank, Rank, Last 7 Days ADP). Optionally add availability history, player context and the playoff schedule. Alternatively, click **Load fictional sample data** to try the app.
3. **Draft.** For each pick:
   - **Taken** (D): the player went to another team.
   - **Mine** (M): you drafted the player.
   - **Undo** (U).
   - If Yahoo and the app disagree, set **Yahoo pick #**, press **Resync**, then catch up with _Catch-up (no advance)_.
4. **Review / Debug.** Explains why A ranks above B, term by term.

Keyboard: `↑↓`/`j k` select · `M` mine · `D` taken · `F` favorite · `A` avoid · `L` lock · `U` undo · `Enter` details · `/` search · `Esc` close. Shortcuts never fire while typing.

## Commands

| Command                                                 | Purpose                                              |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `npm run dev`                                           | development server                                   |
| `npm run build`                                         | static export to `out/`                              |
| `npm start`                                             | serve `out/`                                         |
| `npm test`                                              | unit + integration + invariant + perf tests (Vitest) |
| `npm run test:e2e`                                      | Playwright end-to-end tests (build first)            |
| `npm run typecheck` / `npm run lint` / `npm run format` | quality gates                                        |
| `npm run sample-data`                                   | regenerate the fictional sample CSVs                 |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): structure, data model, persistence, offline behavior, Supabase Phase 2 design
- [STRATEGY_ENGINE.md](STRATEGY_ENGINE.md): every formula and default weight, invariants, calibrations, limitations
- [DATA_IMPORT.md](DATA_IMPORT.md): file formats, validation, player identity and reconciliation
- [TESTING.md](TESTING.md): test map and commands
- [DEPLOYMENT.md](DEPLOYMENT.md): Vercel / static hosting
- [QA_HANDOFF.md](QA_HANDOFF.md): what to challenge first
- [docs/DESIGN.md](docs/DESIGN.md): the reviewed technical design (rev 3)

## Data and licensing

The repository ships **only fictional, seeded sample data**. Import your own projection and Yahoo exports locally; they never leave your browser.
