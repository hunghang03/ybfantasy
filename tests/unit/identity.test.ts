import { describe, expect, it } from 'vitest';
import {
  buildIdentityIndex,
  matchPlayer,
  providerKeyFor,
  suggestCandidates,
} from '@/domain/identity/matcher';
import { jaroWinkler, normalizeName, normalizeTeam } from '@/domain/identity/normalize';
import type { ManualMapping, PlayerIdentity } from '@/domain/types/data';

function ident(
  id: string,
  name: string,
  team: string | null,
  extra: Partial<PlayerIdentity> = {},
): PlayerIdentity {
  return {
    canonicalPlayerId: id,
    canonicalName: name,
    normalizedName: normalizeName(name),
    nbaTeam: team,
    aliases: [],
    providerIds: {},
    positions: [],
    positionsSource: 'NONE',
    ...extra,
  };
}

describe('name normalization', () => {
  it('handles accents, suffixes, apostrophes, periods and hyphens', () => {
    expect(normalizeName('Nikola Jokić')).toBe('nikola jokic');
    expect(normalizeName('Jaren Jackson Jr.')).toBe('jaren jackson');
    expect(normalizeName('Gary Trent Jr')).toBe('gary trent');
    expect(normalizeName('Robert Williams III')).toBe('robert williams');
    expect(normalizeName("D'Angelo Russell")).toBe('dangelo russell');
    expect(normalizeName('P.J. Washington')).toBe('pj washington');
    expect(normalizeName('Shai Gilgeous-Alexander')).toBe('shai gilgeous alexander');
    expect(normalizeName('  Multiple   Spaces  ')).toBe('multiple spaces');
    expect(normalizeName('Jr')).toBe('jr'); // never strips the whole name
  });
  it('normalizes team codes', () => {
    expect(normalizeTeam('gs')).toBe('GSW');
    expect(normalizeTeam('PHO')).toBe('PHX');
    expect(normalizeTeam('FA')).toBeNull();
    expect(normalizeTeam('')).toBeNull();
  });
  it('jaro-winkler similarity basics', () => {
    expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 2);
    expect(jaroWinkler('abc', 'abc')).toBe(1);
    expect(jaroWinkler('', 'abc')).toBe(0);
  });
});

describe('matching order', () => {
  const ids = [
    ident('A', 'Alex Stone', 'AAA', { providerIds: { bbm: 'b-1' }, aliases: ['Alexander Stone'] }),
    ident('B', 'Chris Lane', 'BBB'),
    ident('C', 'Chris Lane', 'CCC'),
    ident('D', 'Dee Solo', null),
  ];
  const idx = buildIdentityIndex(ids, []);

  it('1. provider ID', () => {
    expect(
      matchPlayer(idx, { provider: 'bbm', providerPlayerId: 'b-1', name: 'Totally Different', team: null }),
    ).toMatchObject({ kind: 'MATCHED', canonicalPlayerId: 'A', via: 'PROVIDER_ID' });
  });
  it('2. name + team', () => {
    expect(
      matchPlayer(idx, { provider: 'x', providerPlayerId: null, name: 'Chris Lane', team: 'CCC' }),
    ).toMatchObject({ canonicalPlayerId: 'C', via: 'NAME_TEAM' });
  });
  it('3. alias', () => {
    expect(
      matchPlayer(idx, { provider: 'x', providerPlayerId: null, name: 'Alexander Stone', team: null }),
    ).toMatchObject({ canonicalPlayerId: 'A', via: 'ALIAS' });
  });
  it('4. unique normalized name (team changed)', () => {
    expect(
      matchPlayer(idx, { provider: 'x', providerPlayerId: null, name: 'Alex Stone', team: 'ZZZ' }),
    ).toMatchObject({ canonicalPlayerId: 'A', via: 'NAME' });
  });
  it('never silently merges ambiguous players', () => {
    const r = matchPlayer(idx, { provider: 'x', providerPlayerId: null, name: 'Chris Lane', team: 'QQQ' });
    expect(r).toEqual({ kind: 'AMBIGUOUS', candidateIds: ['B', 'C'], step: 'NAME' });
  });
  it('no match goes to review', () => {
    expect(
      matchPlayer(idx, { provider: 'x', providerPlayerId: null, name: 'Nobody Here', team: null }).kind,
    ).toBe('NO_MATCH');
  });
  it('manual mappings win and survive (ignore too)', () => {
    const input = { provider: 'x', providerPlayerId: null, name: 'Chris Lane', team: 'QQQ' };
    const maps: ManualMapping[] = [
      {
        provider: 'x',
        providerKey: providerKeyFor(input),
        target: { canonicalPlayerId: 'B' },
        createdAt: '',
      },
    ];
    const idx2 = buildIdentityIndex(ids, maps);
    expect(matchPlayer(idx2, input)).toMatchObject({ canonicalPlayerId: 'B', via: 'MANUAL' });
    const ign: ManualMapping[] = [
      { provider: 'x', providerKey: providerKeyFor(input), target: { ignore: true }, createdAt: '' },
    ];
    expect(matchPlayer(buildIdentityIndex(ids, ign), input).kind).toBe('IGNORED');
  });
  it('fuzzy suggestions are suggestions only', () => {
    const s = suggestCandidates(idx, 'Chris Laine');
    expect(s.map((x) => x.canonicalPlayerId)).toEqual(expect.arrayContaining(['B', 'C']));
    expect(
      matchPlayer(idx, { provider: 'x', providerPlayerId: null, name: 'Chris Laine', team: 'BBB' }).kind,
    ).toBe('NO_MATCH');
  });
});
