import type { ManualMapping, PlayerIdentity, ProviderId } from '../types/data';
import { jaroWinkler, normalizeName, normalizeTeam } from './normalize';

/**
 * Identity reconciliation (DESIGN §10). Matching order:
 *   1. manual mapping  2. provider ID  3. normalized name + team  4. alias  5. unique normalized name
 *   6. otherwise → review queue. Ambiguity at any step is NEVER auto-resolved.
 */

export interface MatchInput {
  provider: ProviderId;
  providerPlayerId: string | null;
  name: string;
  team: string | null;
}

export type MatchResult =
  | {
      kind: 'MATCHED';
      canonicalPlayerId: string;
      via: 'MANUAL' | 'PROVIDER_ID' | 'NAME_TEAM' | 'ALIAS' | 'NAME';
    }
  | { kind: 'IGNORED' }
  | { kind: 'AMBIGUOUS'; candidateIds: string[]; step: 'PROVIDER_ID' | 'NAME_TEAM' | 'ALIAS' | 'NAME' }
  | { kind: 'NO_MATCH' };

/** Stable key used to remember manual decisions for a provider row. */
export function providerKeyFor(input: MatchInput): string {
  if (input.providerPlayerId) return `id:${input.providerPlayerId}`;
  return `name:${normalizeName(input.name)}|${normalizeTeam(input.team) ?? ''}`;
}

export interface IdentityIndex {
  byId: Map<string, PlayerIdentity>;
  byProviderId: Map<string, string[]>; // `${provider}:${id}` → canonical ids
  byNameTeam: Map<string, string[]>;
  byAlias: Map<string, string[]>;
  byName: Map<string, string[]>;
  manual: Map<string, ManualMapping>; // `${provider}|${providerKey}`
}

function push(map: Map<string, string[]>, key: string, id: string): void {
  const arr = map.get(key);
  if (!arr) map.set(key, [id]);
  else if (!arr.includes(id)) arr.push(id);
}

export function buildIdentityIndex(
  identities: readonly PlayerIdentity[],
  mappings: readonly ManualMapping[],
): IdentityIndex {
  const idx: IdentityIndex = {
    byId: new Map(),
    byProviderId: new Map(),
    byNameTeam: new Map(),
    byAlias: new Map(),
    byName: new Map(),
    manual: new Map(),
  };
  for (const p of identities) addToIndex(idx, p);
  for (const m of mappings) idx.manual.set(`${m.provider}|${m.providerKey}`, m);
  return idx;
}

export function addToIndex(idx: IdentityIndex, p: PlayerIdentity): void {
  idx.byId.set(p.canonicalPlayerId, p);
  for (const [prov, pid] of Object.entries(p.providerIds))
    push(idx.byProviderId, `${prov}:${pid}`, p.canonicalPlayerId);
  if (p.yahooPlayerId) push(idx.byProviderId, `yahoo:${p.yahooPlayerId}`, p.canonicalPlayerId);
  push(idx.byNameTeam, `${p.normalizedName}|${p.nbaTeam ?? ''}`, p.canonicalPlayerId);
  push(idx.byName, p.normalizedName, p.canonicalPlayerId);
  for (const a of p.aliases) push(idx.byAlias, normalizeName(a), p.canonicalPlayerId);
}

export function matchPlayer(idx: IdentityIndex, input: MatchInput): MatchResult {
  const manual = idx.manual.get(`${input.provider}|${providerKeyFor(input)}`);
  if (manual) {
    if ('ignore' in manual.target) return { kind: 'IGNORED' };
    if (idx.byId.has(manual.target.canonicalPlayerId))
      return { kind: 'MATCHED', canonicalPlayerId: manual.target.canonicalPlayerId, via: 'MANUAL' };
  }
  if (input.providerPlayerId) {
    const ids = idx.byProviderId.get(`${input.provider}:${input.providerPlayerId}`) ?? [];
    if (ids.length === 1) return { kind: 'MATCHED', canonicalPlayerId: ids[0]!, via: 'PROVIDER_ID' };
    if (ids.length > 1) return { kind: 'AMBIGUOUS', candidateIds: [...ids].sort(), step: 'PROVIDER_ID' };
  }
  const n = normalizeName(input.name);
  const team = normalizeTeam(input.team);
  if (team) {
    const ids = idx.byNameTeam.get(`${n}|${team}`) ?? [];
    if (ids.length === 1) return { kind: 'MATCHED', canonicalPlayerId: ids[0]!, via: 'NAME_TEAM' };
    if (ids.length > 1) return { kind: 'AMBIGUOUS', candidateIds: [...ids].sort(), step: 'NAME_TEAM' };
  }
  const aliasIds = idx.byAlias.get(n) ?? [];
  if (aliasIds.length === 1) return { kind: 'MATCHED', canonicalPlayerId: aliasIds[0]!, via: 'ALIAS' };
  if (aliasIds.length > 1) return { kind: 'AMBIGUOUS', candidateIds: [...aliasIds].sort(), step: 'ALIAS' };
  const nameIds = idx.byName.get(n) ?? [];
  if (nameIds.length === 1) return { kind: 'MATCHED', canonicalPlayerId: nameIds[0]!, via: 'NAME' };
  if (nameIds.length > 1) return { kind: 'AMBIGUOUS', candidateIds: [...nameIds].sort(), step: 'NAME' };
  return { kind: 'NO_MATCH' };
}

/** Fuzzy suggestions for the review screen only. */
export function suggestCandidates(
  idx: IdentityIndex,
  name: string,
  limit = 5,
): { canonicalPlayerId: string; name: string; team: string | null; score: number }[] {
  const n = normalizeName(name);
  const scored: { canonicalPlayerId: string; name: string; team: string | null; score: number }[] = [];
  for (const p of idx.byId.values()) {
    const s = Math.max(
      jaroWinkler(n, p.normalizedName),
      ...p.aliases.map((a) => jaroWinkler(n, normalizeName(a))),
    );
    if (s >= 0.8)
      scored.push({
        canonicalPlayerId: p.canonicalPlayerId,
        name: p.canonicalName,
        team: p.nbaTeam,
        score: s,
      });
  }
  scored.sort((a, b) => b.score - a.score || (a.canonicalPlayerId < b.canonicalPlayerId ? -1 : 1));
  return scored.slice(0, limit);
}
