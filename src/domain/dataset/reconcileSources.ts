import type { Dataset, ProviderId, UnmatchedRow } from '../types/data';

/**
 * Yahoo market ↔ projection snapshot reconciliation (post-import, over ACTIVE batches only).
 *
 * The Yahoo market dataset owns Yahoo identities (name, team, eligibility). A projection snapshot is matched onto
 * them by the importer (explicit mapping → provider id → name + team → alias → unique name → review); ambiguous
 * rows are never merged and wait in the review queue. This report only counts and lists; it changes nothing.
 */
export interface SourceReconciliation {
  provider: ProviderId;
  counts: {
    marketPlayers: number;
    projectionPlayers: number;
    matched: number;
    marketOnly: number;
    projectionOnly: number;
    ambiguous: number;
    teamMismatch: number;
  };
  marketOnly: { id: string; name: string; team: string | null }[];
  projectionOnly: { id: string; name: string; team: string | null }[];
  ambiguous: { name: string; team: string | null; candidates: string[] }[];
  teamMismatch: { id: string; name: string; marketTeam: string | null; projectionTeam: string | null }[];
}

export function reconcileMarketAndProjections(
  dataset: Dataset,
  provider: ProviderId,
  unmatched: readonly UnmatchedRow[],
  activeBatchIds: ReadonlySet<string>,
): SourceReconciliation {
  const byId = new Map(dataset.identities.map((i) => [i.canonicalPlayerId, i]));
  const market = new Set(dataset.market.map((m) => m.canonicalPlayerId));
  const proj = new Map(
    dataset.projections.filter((p) => p.provider === provider).map((p) => [p.canonicalPlayerId, p]),
  );
  const who = (id: string) => ({
    id,
    name: byId.get(id)?.canonicalName ?? id,
    team: byId.get(id)?.nbaTeam ?? null,
  });
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  const marketOnly = [...market]
    .filter((id) => !proj.has(id))
    .map(who)
    .sort(byName);
  const projectionOnly = [...proj.keys()]
    .filter((id) => !market.has(id))
    .map(who)
    .sort(byName);
  const matchedIds = [...proj.keys()].filter((id) => market.has(id));
  const teamMismatch = matchedIds
    .map((id) => ({
      id,
      name: who(id).name,
      marketTeam: who(id).team,
      projectionTeam: proj.get(id)!.sourceTeam ?? null,
    }))
    .filter((r) => r.marketTeam && r.projectionTeam && r.marketTeam !== r.projectionTeam)
    .sort(byName);
  const ambiguous = unmatched
    .filter(
      (u) =>
        u.kind === 'PROJECTION' &&
        u.provider === provider &&
        u.reason === 'AMBIGUOUS' &&
        activeBatchIds.has(u.batchId),
    )
    .map((u) => ({
      name: u.rawName,
      team: u.rawTeam,
      candidates: u.candidateIds.map(
        (c) => `${byId.get(c)?.canonicalName ?? c} (${byId.get(c)?.nbaTeam ?? '—'})`,
      ),
    }))
    .sort(byName);
  return {
    provider,
    counts: {
      marketPlayers: market.size,
      projectionPlayers: proj.size,
      matched: matchedIds.length,
      marketOnly: marketOnly.length,
      projectionOnly: projectionOnly.length,
      ambiguous: ambiguous.length,
      teamMismatch: teamMismatch.length,
    },
    marketOnly,
    projectionOnly,
    ambiguous,
    teamMismatch,
  };
}
