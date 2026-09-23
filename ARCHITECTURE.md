# Architecture

## Overview

```
Browser (everything draft-critical runs here)
 ├─ Next.js App Router pages (static export, all client components)
 │    /  Leagues · /setup · /data · /draft · /review · /settings
 ├─ state/store.ts (Zustand) — in-memory working set; synchronous updates
 │    └─ async write-through → persistence/Repository (IndexedDB via Dexie)
 ├─ state/useEngine.ts — memoized stage 1 (static context) + stage 2 (evaluation) per action
 └─ domain/ — pure TypeScript engine (no React, no I/O, no network)
Hosting: Vercel (static files). No API routes, no server functions, no backend.
```

## Principles

| Principle                | How it is enforced                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deterministic            | Pure functions only. Every sort has an id tiebreak. No `Math.random` or time in the engine.                                                             |
| Explainable              | Every `PlayerEvaluation` carries every intermediate term. The UI renders these values directly.                                                         |
| Local-first              | IndexedDB is the source of truth. Network is used only to load the app and the optional bundled sample CSVs.                                            |
| Single source of weights | `domain/config/defaults.ts`, validated by a Zod schema (`strategyConfig.ts`).                                                                           |
| Source isolation         | Market, projections (per provider), availability, context and playoff schedule are separate record types tied to import batches. They are never merged. |

## Directory map

```
src/domain/
  types/            core enums, data records, league/draft types, evaluation types
  config/           StrategyConfig schema + defaults + lookups
  numeric/          safeDiv / safeSd / zOrZero / sanitizeFinite
  draft/            snake math, event log replay (PICK / RESYNC / VOID), undo
  identity/         name normalization, matching order, fuzzy suggestions (review only)
  import/           CSV/JSON parsing, field specs + auto-mapping, row validation, import plan
  dataset/          assemble EnginePlayer views (primary vs validation sources)
  stats/            population selection, z-scores, percentage impact
  value/            replacement level, PGV, availability-adjusted ESV, BPV
  availability/     durability score, residual risk, round-weighted RiskAdj
  positions/        slot matching, feasibility, positional urgency, slot display
  roster/           standing vs expected competition, need, surplus, totals
  punts/            punt confidence with recoverability and hard-punt gates
  scarcity/         pool scarcity (ADP-free) and next-pick scarcity (market)
  playoffs/ upside/ confidence/
  market/           market reference, ordinal survival bands, timing labels, VOM
  recommendations/  static context, DDP scoring, engine orchestration + pick-pair, compare(A,B)
  advisor/          deterministic templates
src/persistence/    Repository interface, TableRepository (shared logic), Dexie + memory backends, backup schema
src/state/          Zustand store, engine hook
src/components/     UI (draft, review, primitives)
src/app/            pages
src/lib/            sample generator, import runner, ids/download, timing
```

## Data model

- **Identity.** `PlayerIdentity` holds canonical id, names, aliases, provider ids and positions (Yahoo is authoritative).
- **Source data.** `YahooMarket`, `ProjectionLine` (per provider, per game), `AvailabilitySeason`, `PlayerContext` and `TeamPlayoffSchedule`. Each carries an `importBatchId`.
- **Batches.** `ImportBatch` has a status of `ACTIVE`, `SUPERSEDED` or `REVERTED`. Loading keeps only records whose batch is ACTIVE.
- **Draft state.** It lives only in `LeagueDraft` (`events`, `flags`, `puntOverrides`), per league. Players never carry draft state.
- **Calculated data.** Never persisted as authoritative. It is recomputed from the above. The only exception is the per-pick `snapshot` (value and fit at the time you drafted), which is shown in the My Team panel.

## Engine stages

1. `buildContext(dataset, league, config)` → `StaticContext`, memoized on (dataset, league, config). It covers:
   - population, z-scores, replacement level, BPV
   - availability, upside, playoff, disagreement, confidence
   - cohorts, correlations, pool-scarcity baseline
2. `evaluateDraft(ctx, {events, flags, puntOverrides})` → `DraftEvaluation`. In order:
   - replay → timing → roster context (standing, punts, need, pool scarcity, positions)
   - DDP for every available player
   - market layer (bands, next-pick scarcity)
   - pick-pair planning for the top 10
   - labels → advisor → finite-output check

   It takes about 50 ms for 500 players (see `tests/perf`).

## Draft event log

- **Events:**
  - `PICK {playerId, by: ME|OTHER, advance, overallPick, snapshot?}`
  - `RESYNC {setCurrentOverall}`
  - `VOID {targetSeq}`
- **Undo.** Drop the last event. This works for any number of levels, and the replay is exact.
- **No hidden plan state.** Deviating from a recommendation simply records a different event.

## Persistence

- `Repository` defines leagues, drafts, dataset, batches, unmatched rows, mappings, config, settings, backup/restore and clear.
- `TableRepository` implements the rules once, on top of a keyed-table `Backend` with atomic `transaction()`. The rules are:
  - commit import (supersede the previous active batch of the same kind/provider)
  - revert (reactivate the previous version)
  - resolve unmatched (write the record plus a persistent `ManualMapping`)
  - backup/restore
- **Backends.** `createDexieBackend` (IndexedDB) and `createMemoryBackend` (snapshot rollback, used in tests). The store falls back to memory if IndexedDB is unavailable, and the header shows "Memory only".
- **UI writes** are serialized and non-blocking. The header badge shows Saved / Saving / Save error. A failed write never blocks drafting, because state is already in memory.

## Offline / PWA

`public/sw.js` caches the app shell, static assets and sample data. Pages are network-first with a cache fallback. Data lives in IndexedDB. `e2e/offline.spec.ts` verifies drafting and reloading while offline.

## Phase 2: Supabase (designed, not implemented)

Add `SupabaseRepository` as a **sync layer**, not a replacement:

- **Local stays the source of truth.** Immediate draft actions still write to Dexie first.
- **A background sync queue** pushes `leagues`, `drafts` (event logs), `mappings`, `config` and batches to Supabase tables keyed by `user_id`. Conflict policy is last-writer-wins per league draft, keyed by event `seq`; the event log makes merges straightforward.
- **Auth** uses Supabase Auth (email magic link). Row-level security applies on every table: `user_id = auth.uid()`.
- **Keys.** Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are ever in the client. There is never a service-role key.
- **Cloud failure** only changes the sync badge. It never blocks drafting.
- **Domain code is untouched.** It never imports a storage SDK.
