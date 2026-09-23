/**
 * Player-name normalization (DESIGN §10). Deterministic and lossy on purpose:
 * accents, suffixes, apostrophes, periods and hyphens are removed so that provider spellings meet.
 */

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

export function normalizeName(raw: string): string {
  const base = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[’'`.]/g, '') // apostrophes and periods vanish: "D'Angelo" → "dangelo", "P.J." → "pj"
    .replace(/[-‐‑–—_]/g, ' ') // hyphens become spaces
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = base.split(' ').filter((p) => p.length > 0);
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1]!)) parts.pop();
  return parts.join(' ');
}

/** Canonical 2–3 letter team code; common provider variants mapped. Unknown codes are upper-cased as-is. */
const TEAM_ALIASES: Record<string, string> = {
  GS: 'GSW',
  GSW: 'GSW',
  NY: 'NYK',
  NYK: 'NYK',
  NO: 'NOP',
  NOP: 'NOP',
  NOR: 'NOP',
  SA: 'SAS',
  SAS: 'SAS',
  PHO: 'PHX',
  PHX: 'PHX',
  BKN: 'BKN',
  BRK: 'BKN',
  BK: 'BKN',
  CHA: 'CHA',
  CHO: 'CHA',
  UTA: 'UTA',
  UTH: 'UTA',
  WAS: 'WAS',
  WSH: 'WAS',
};

export function normalizeTeam(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  if (t.length === 0 || t === 'FA' || t === 'NA') return null;
  return TEAM_ALIASES[t] ?? t;
}

/** Jaro-Winkler similarity in [0,1]. Used only for review SUGGESTIONS, never for automatic matching. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matchDist = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aM = new Array<boolean>(a.length).fill(false);
  const bM = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - matchDist);
    const hi = Math.min(i + matchDist + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bM[j] || a[i] !== b[j]) continue;
      aM[i] = true;
      bM[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aM[i]) continue;
    while (!bM[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}
