import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { applyAliases, CONFIRMED_ALIASES, parseAliasRows } from '@/domain/identity/aliases';
import {
  buildIdentityIndex,
  matchPlayer,
  nameEvidence,
  sameTeamNearMatches,
} from '@/domain/identity/matcher';
import { parseTable } from '@/domain/import/parse';
import { reconcileMarketAndProjections } from '@/domain/dataset/reconcileSources';
import { dataConfidence } from '@/domain/confidence/confidence';
import { buildPlan } from '@/lib/importRunner';
import type { Dataset } from '@/domain/types/data';
import { importInto } from '../helpers/fixtures';

/** Identity review decisions from the 2026-27 real-data QA (Codex/user), made deterministic. */
const cfg = defaultConfig();
const EMPTY: Dataset = {
  identities: [],
  market: [],
  projections: [],
  availability: [],
  context: [],
  playoffSchedule: [],
};
const PH =
  'Player,Team,Pos,Pre-Season Rank,GP*,FGM/A*,FG%,FTM/A*,FT%,3PTM,PTS,REB,AST,ST,BLK,TO,Stat Basis,Source,Captured At,Confidence,Review Fields,QA Note';
const prow = (name: string, team: string, pos = 'PG', rank = 100) =>
  `${name},${team},"${pos}",${rank},70,560/1200,0.467,210/250,0.84,140,1540,300,420,70,20,150,TOTAL,s,2026-09-26,HIGH,,`;

describe('confirmed alias table', () => {
  it('data/aliases.csv and CONFIRMED_ALIASES are identical (single source of truth)', () => {
    const csv = parseAliasRows(parseTable(readFileSync('data/aliases.csv', 'utf8')).rows);
    expect(csv).toEqual(CONFIRMED_ALIASES.map((a) => ({ ...a, team: a.team ?? null })));
  });
  it('contains exactly the 6 confirmed pairs — not the rejected or held ones', () => {
    const pairs = CONFIRMED_ALIASES.map((a) => `${a.alias}→${a.canonicalName}`);
    expect(pairs).toHaveLength(6);
    for (const bad of ['Kobe Wagner', 'Dylan Acuff Jr.', 'Drew Peterson'])
      expect(pairs.some((p) => p.includes(bad))).toBe(false);
  });

  it('market-first import: every confirmed projection spelling matches its market identity via ALIAS', () => {
    const market = [
      'Player,Team,Pos,XRank',
      ...CONFIRMED_ALIASES.map((a, i) => `${a.alias},${a.team},PG,${i + 1}`),
    ].join('\n');
    const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', market);
    const t = parseTable([PH, ...CONFIRMED_ALIASES.map((a) => prow(a.canonicalName, a.team!))].join('\n'));
    const plan = buildPlan(
      { kind: 'PROJECTION', provider: 'yahoo', season: '2026-27', description: 't', createPolicy: 'AUTO' },
      t,
      null,
      ds.identities,
      [],
      cfg,
    );
    expect(plan.unmatched).toEqual([]);
    expect(plan.newIdentities).toEqual([]);
    expect(plan.matchedVia).toEqual({ ALIAS: 6 });
  });

  it('works in either direction and never merges when both spellings already exist', () => {
    const one = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', 'Player,Team,Pos,XRank\nHerbert Jones,NOP,SF,1\n');
    const r1 = applyAliases(one.identities, CONFIRMED_ALIASES);
    expect(r1.identities[0]!.aliases).toContain('Herb Jones');
    const both = importInto(
      EMPTY,
      'YAHOO_MARKET',
      'yahoo',
      'Player,Team,Pos,XRank\nHerb Jones,NOP,SF,1\nHerbert Jones,NOP,SF,2\n',
    );
    const r2 = applyAliases(both.identities, CONFIRMED_ALIASES);
    expect(r2.problems[0]).toMatch(/both spellings exist as separate identities/);
    expect(r2.identities.every((i) => i.aliases.length === 0)).toBe(true);
  });

  it('an alias applies only on its team', () => {
    const other = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', 'Player,Team,Pos,XRank\nHerb Jones,LAL,SF,1\n');
    expect(applyAliases(other.identities, CONFIRMED_ALIASES).applied).toBe(0);
  });
});

describe('rejected pair: same first name + same team is not identity evidence', () => {
  it('nameEvidence grades the observed patterns', () => {
    expect(nameEvidence('Herb Jones', 'Herbert Jones')).toBe('STRONG');
    expect(nameEvidence('M Wagner', 'Moritz Wagner')).toBe('STRONG');
    expect(nameEvidence('Nickeil Alexander-Walker', 'N. Alexander-Walker')).toBe('STRONG');
    expect(nameEvidence('Jaylin Wells', 'Jaylen Wells')).toBe('STRONG');
    expect(nameEvidence('Mike Brown Jr.', 'Mikel Brown Jr.')).toBe('STRONG');
    expect(nameEvidence('Ron Holland II', 'Ronald Holland II')).toBe('STRONG');
    expect(nameEvidence('Dylan Acuff Jr.', 'Darius Acuff Jr.')).toBe('SURNAME_ONLY');
    expect(nameEvidence('Drew Peterson', 'Darryn Peterson')).toBe('SURNAME_ONLY');
    expect(nameEvidence('Kobe Wagner', 'Kobe Sanders')).toBe('FIRST_NAME_ONLY');
    // similar surname + unrelated first name is not evidence either (found on the real data)
    expect(nameEvidence('Kobe Wagner', 'Keaton Wagler')).toBe('NONE');
    // similar surname + compatible first name is a typo pattern → STRONG
    expect(nameEvidence('Jaylen Wels', 'Jaylen Wells')).toBe('STRONG');
    expect(nameEvidence('Anna Lee', 'Bo Cruz')).toBe('NONE');
  });

  it('Kobe Wagner / Kobe Sanders (and the whole first-name-only category) stay separate identities', () => {
    const market = importInto(
      EMPTY,
      'YAHOO_MARKET',
      'yahoo',
      'Player,Team,Pos,XRank\nKobe Wagner,LAC,SG,150\n',
    );
    const t = parseTable(`${PH}\n${prow('Kobe Sanders', 'LAC', 'SG,SF', 242)}`);
    const plan = buildPlan(
      { kind: 'PROJECTION', provider: 'yahoo', season: '2026-27', description: 't', createPolicy: 'AUTO' },
      t,
      null,
      market.identities,
      [],
      cfg,
    );
    expect(plan.unmatched).toEqual([]); // not even queued as a merge candidate
    expect(plan.newIdentities.map((i) => i.canonicalName)).toEqual(['Kobe Sanders']);
    const idx = buildIdentityIndex(market.identities, []);
    expect(
      matchPlayer(idx, { provider: 'yahoo', providerPlayerId: null, name: 'Kobe Sanders', team: 'LAC' }).kind,
    ).toBe('NO_MATCH');
    expect(sameTeamNearMatches(idx, 'Kobe Sanders', 'LAC', new Set())).toEqual([]);
  });

  it('held pairs (same surname, unrelated first name) stay in review, never merged or created', () => {
    const market = importInto(
      EMPTY,
      'YAHOO_MARKET',
      'yahoo',
      'Player,Team,Pos,XRank\nDylan Acuff Jr.,SAC,PG,114\nDrew Peterson,UTA,SG,96\n',
    );
    const t = parseTable(
      `${PH}\n${prow('Darius Acuff Jr.', 'SAC')}\n${prow('Darryn Peterson', 'UTA', 'SG')}`,
    );
    const plan = buildPlan(
      { kind: 'PROJECTION', provider: 'yahoo', season: '2026-27', description: 't', createPolicy: 'AUTO' },
      t,
      null,
      market.identities,
      [],
      cfg,
    );
    expect(plan.unmatched.map((u) => u.rawName)).toEqual(['Darius Acuff Jr.', 'Darryn Peterson']);
    expect(plan.newIdentities).toEqual([]);
    expect(plan.records.projections).toEqual([]);
  });
});

describe('source disagreements are flagged, never overwritten', () => {
  const market = importInto(
    EMPTY,
    'YAHOO_MARKET',
    'yahoo',
    'Player,Team,Pos,XRank,Rank\nCam Test,MEM,"SG,SF",81,64\nAndy Test,PHI,"SG,SF,PF",97,101\n',
  );
  const t = parseTable(
    `${PH}\n${prow('Cam Test', 'DEN', 'SF,PF', 193)}\n${prow('Andy Test', 'MIA', 'SG,SF,PF', 93)}`,
  );
  const plan = buildPlan(
    { kind: 'PROJECTION', provider: 'yahoo', season: '2026-27', description: 't', createPolicy: 'AUTO' },
    t,
    null,
    market.identities,
    [],
    cfg,
  );
  const ds: Dataset = { ...market, projections: plan.records.projections };
  const r = reconcileMarketAndProjections(ds, 'yahoo', [], new Set());

  it('both source observations are kept; identity keeps the Yahoo market team/eligibility', () => {
    const cam = ds.identities.find((i) => i.canonicalName === 'Cam Test')!;
    expect([cam.nbaTeam, cam.positions]).toEqual(['MEM', ['SG', 'SF']]);
    const line = ds.projections.find((p) => p.canonicalPlayerId === cam.canonicalPlayerId)!;
    expect([line.sourceTeam, line.sourcePositions, line.raw?.Team, line.raw?.Pos]).toEqual([
      'DEN',
      ['SF', 'PF'],
      'DEN',
      'SF,PF',
    ]);
    expect(ds.market.find((m) => m.canonicalPlayerId === cam.canonicalPlayerId)!.raw?.Team).toBe('MEM');
  });

  it('reconciliation lists the disagreement with both sources side by side', () => {
    expect(r.counts.sourceDisagreements).toBe(2);
    expect(r.sourceDisagreements.find((x) => x.name === 'Cam Test')).toMatchObject({
      fields: ['team', 'positions'],
      market: { team: 'MEM', positions: ['SG', 'SF'], xrank: 81, rank: 64 },
      projection: { team: 'DEN', positions: ['SF', 'PF'], providerRank: 193 },
    });
    expect(r.sourceDisagreements.find((x) => x.name === 'Andy Test')!.fields).toEqual(['team']);
  });

  it('the player carries a visible verification warning', () => {
    const cam = ds.identities.find((i) => i.canonicalName === 'Cam Test')!;
    const player = {
      id: cam.canonicalPlayerId,
      name: cam.canonicalName,
      team: cam.nbaTeam,
      positions: cam.positions,
      positionsSource: cam.positionsSource,
      proj: ds.projections.find((p) => p.canonicalPlayerId === cam.canonicalPlayerId)!,
      validation: [],
      market: ds.market.find((m) => m.canonicalPlayerId === cam.canonicalPlayerId)!,
      history: [],
      context: null,
      playoffGames: null,
    };
    const w = dataConfidence(player, []).warnings.join(' ');
    expect(w).toMatch(/Sources disagree on team: Yahoo market MEM, projection DEN/);
    expect(w).toMatch(/Sources disagree on eligibility: Yahoo market SG\/SF, projection SF\/PF/);
  });
});
