import type { PlayerIdentity } from '../types/data';
import { normalizeName, normalizeTeam } from './normalize';

/**
 * Human-confirmed alias table (source of truth: data/aliases.csv; a unit test keeps this list identical).
 * Each entry pairs two spellings of ONE player on one team. Add an entry only after the identity has been
 * confirmed from the source screenshots — never to clear a review queue.
 */
export interface AliasEntry {
  /** One spelling (e.g. as in the Yahoo market transcription). */
  alias: string;
  /** The other spelling (e.g. as in the Yahoo projection transcription). */
  canonicalName: string;
  /** Team the pair is confirmed for (the alias applies only to an identity on this team). */
  team?: string | null;
}

export const CONFIRMED_ALIASES: readonly AliasEntry[] = [
  { alias: 'Herb Jones', canonicalName: 'Herbert Jones', team: 'NOP' },
  { alias: 'Jaylin Wells', canonicalName: 'Jaylen Wells', team: 'MEM' },
  { alias: 'Mike Brown Jr.', canonicalName: 'Mikel Brown Jr.', team: 'BKN' },
  { alias: 'M Wagner', canonicalName: 'Moritz Wagner', team: 'BKN' },
  { alias: 'Nickeil Alexander-Walker', canonicalName: 'N. Alexander-Walker', team: 'ATL' },
  { alias: 'Ron Holland II', canonicalName: 'Ronald Holland II', team: 'DET' },
];

/** Parse `alias,canonical,team` rows. */
export function parseAliasRows(rows: readonly Record<string, string | undefined>[]): AliasEntry[] {
  return rows
    .map((r) => ({
      alias: (r.alias ?? r.Alias ?? '').trim(),
      canonicalName: (r.canonical ?? r.Canonical ?? r.canonicalName ?? '').trim(),
      team: (r.team ?? r.Team ?? '').trim() || null,
    }))
    .filter((a) => a.alias && a.canonicalName);
}

/**
 * Attach confirmed aliases to identities, deterministically and in either direction: the identity carrying
 * EITHER spelling (on the entry's team) receives the other spelling as an alias, so whichever dataset is
 * imported first, the other one matches via the ALIAS step. Never merges identities: if both spellings already
 * exist as separate identities, or a spelling is ambiguous, nothing is changed and a problem is reported.
 */
export function applyAliases(
  identities: readonly PlayerIdentity[],
  aliases: readonly AliasEntry[],
): { identities: PlayerIdentity[]; problems: string[]; applied: number } {
  const problems: string[] = [];
  let applied = 0;
  const out = identities.map((i) => ({ ...i, aliases: [...i.aliases] }));
  for (const a of aliases) {
    const team = normalizeTeam(a.team ?? null);
    const names = [normalizeName(a.alias), normalizeName(a.canonicalName)];
    const onTeam = (i: PlayerIdentity) => !team || i.nbaTeam === team;
    const hits = names.map((n) => out.filter((i) => onTeam(i) && i.normalizedName === n));
    const label = `"${a.alias}" ↔ "${a.canonicalName}"${team ? ` (${team})` : ''}`;
    if (hits[0]!.length > 1 || hits[1]!.length > 1) {
      problems.push(`Alias ${label}: ambiguous — more than one identity with that name.`);
      continue;
    }
    if (hits[0]!.length === 1 && hits[1]!.length === 1) {
      if (hits[0]![0] !== hits[1]![0])
        problems.push(
          `Alias ${label}: both spellings exist as separate identities — resolve manually (not merged).`,
        );
      continue;
    }
    const target = hits[0]![0] ?? hits[1]![0];
    if (!target) continue; // neither spelling present in this dataset: nothing to do
    const other = hits[0]![0] ? a.canonicalName : a.alias;
    if (!target.aliases.some((x) => normalizeName(x) === normalizeName(other))) {
      target.aliases.push(other);
      applied++;
    }
  }
  return { identities: out, problems, applied };
}
