import type { Dataset, ProviderId, UnmatchedRow } from '../types/data';
import { nameEvidence } from '../identity/matcher';

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
    /** Unmatched projection rows waiting in review (e.g. a same-team spelling variant); not imported yet. */
    needsReview: number;
    teamMismatch: number;
    /** Matched players whose two sources disagree on team and/or eligibility (both kept; market used). */
    sourceDisagreements: number;
  };
  marketOnly: { id: string; name: string; team: string | null }[];
  projectionOnly: { id: string; name: string; team: string | null }[];
  ambiguous: { name: string; team: string | null; candidates: string[] }[];
  needsReview: { name: string; team: string | null; candidates: string[] }[];
  teamMismatch: { id: string; name: string; marketTeam: string | null; projectionTeam: string | null }[];
  sourceDisagreements: {
    id: string;
    name: string;
    fields: ('team' | 'positions')[];
    market: { team: string | null; positions: string[]; xrank: number | null; rank: number | null };
    projection: { team: string | null; positions: string[]; providerRank: number | null };
  }[];
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
  const queued = (reason: UnmatchedRow['reason']) =>
    unmatched
      .filter(
        (u) =>
          u.kind === 'PROJECTION' &&
          u.provider === provider &&
          u.reason === reason &&
          activeBatchIds.has(u.batchId),
      )
      .map((u) => ({
        name: u.rawName,
        team: u.rawTeam,
        candidates: u.candidateIds.map(
          (c) =>
            `${byId.get(c)?.canonicalName ?? c} (${byId.get(c)?.nbaTeam ?? '—'}) [${nameEvidence(
              u.rawName,
              byId.get(c)?.canonicalName ?? '',
            )
              .toLowerCase()
              .replace('_', ' ')}]`,
        ),
      }))
      .sort(byName);
  const ambiguous = queued('AMBIGUOUS');
  const needsReview = queued('NO_MATCH');
  const marketById = new Map(dataset.market.map((m) => [m.canonicalPlayerId, m]));
  const sourceDisagreements = matchedIds
    .map((id) => {
      const i = byId.get(id)!;
      const pl = proj.get(id)!;
      const m = marketById.get(id);
      const fields: ('team' | 'positions')[] = [];
      if (i.nbaTeam && pl.sourceTeam && i.nbaTeam !== pl.sourceTeam) fields.push('team');
      if (pl.sourcePositions?.length && i.positions.join() !== pl.sourcePositions.join())
        fields.push('positions');
      return {
        id,
        name: i.canonicalName,
        fields,
        market: {
          team: i.nbaTeam,
          positions: i.positions,
          xrank: m?.yahooXRank ?? null,
          rank: m?.yahooRank ?? null,
        },
        projection: {
          team: pl.sourceTeam ?? null,
          positions: pl.sourcePositions ?? [],
          providerRank: pl.providerRank ?? null,
        },
      };
    })
    .filter((r) => r.fields.length > 0)
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
      needsReview: needsReview.length,
      teamMismatch: teamMismatch.length,
      sourceDisagreements: sourceDisagreements.length,
    },
    marketOnly,
    projectionOnly,
    ambiguous,
    needsReview,
    teamMismatch,
    sourceDisagreements,
  };
}
