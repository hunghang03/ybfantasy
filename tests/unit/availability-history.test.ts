import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildContext } from '@/domain';
import {
  availabilityProjectionGap,
  computeAvailability,
  seasonMissShare,
} from '@/domain/availability/availability';
import { defaultConfig, parseStrategyConfig } from '@/domain/config/defaults';
import { autoMapColumns } from '@/domain/import/fields';
import { parseTable } from '@/domain/import/parse';
import { evaluateDraft } from '@/domain/recommendations/engine';
import type { AvailabilitySeason, Dataset } from '@/domain/types/data';
import { buildPlan } from '@/lib/importRunner';
import { emptyDraft, importInto, league } from '../helpers/fixtures';

/**
 * 3-season availability history (docs/AVAILABILITY_AUDIT.md). History is residual risk only: it never multiplies
 * BPV/DDP; projected GP (already in ESV) is untouched. Anthony Davis 76/51/20 (2023-24…2025-26) is a public
 * fixture supplied by the user; everything else here is fictional.
 */
const cfg = defaultConfig();
const HEADER = readFileSync('data/templates/availability-history.template.csv', 'utf8').trim();
const EMPTY: Dataset = {
  identities: [],
  market: [],
  projections: [],
  availability: [],
  context: [],
  playoffSchedule: [],
};
const season = (s: string, gp: number, over: Partial<AvailabilitySeason> = {}): AvailabilitySeason => ({
  canonicalPlayerId: 'p',
  season: s,
  importBatchId: 'b',
  gamesPlayed: gp,
  teamGames: 82,
  absences: [],
  ...over,
});
const AD = [season('2023-24', 76), season('2024-25', 51), season('2025-26', 20)];
const row = (o: Record<string, string | number> = {}) => {
  const v: Record<string, string | number> = {
    'Player ID': '',
    Player: 'Al Pha',
    'Team(s)': 'AAA',
    Season: '2025-26',
    GP: 70,
    'Games Available': 82,
    'Team Games': 82,
    'Missed LOW': '',
    'Missed MODERATE': '',
    'Missed HIGH': '',
    'Missed Unclassified': '',
    'Suspension Games': '',
    'Other Non-Injury Games': '',
    'Status Note': '',
    Source: 'fixture',
    'Captured At': '2026-09-27',
    Confidence: 'HIGH',
    'Review Fields': '',
    'QA Note': '',
    ...o,
  };
  return HEADER.split(',')
    .map((h) => {
      const x = String(v[h] ?? '');
      return /[,"]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x;
    })
    .join(',');
};
const MARKET = 'Player,Team,Pos,XRank\nAl Pha,AAA,PG,1\nBe Ta,PHI,SG,2\nHerbert Jones,NOP,SF,3\n';
const planHistory = (csv: string, ds: Dataset) =>
  buildPlan(
    {
      kind: 'AVAILABILITY',
      provider: 'nba_history',
      season: '2026-27',
      description: 't',
      createPolicy: 'NEVER',
    },
    parseTable(csv),
    null,
    ds.identities,
    [],
    cfg,
  );

describe('availability-history CSV schema', () => {
  it('every template column maps', () => {
    const map = autoMapColumns('AVAILABILITY', HEADER.split(','));
    expect(HEADER.split(',').filter((h) => !Object.values(map).includes(h))).toEqual([]);
    expect(map).toMatchObject({
      providerPlayerId: 'Player ID',
      name: 'Player',
      team: 'Team(s)',
      gamesAvailable: 'Games Available',
      suspensionGames: 'Suspension Games',
      otherNonInjuryGames: 'Other Non-Injury Games',
      note: 'Status Note',
      qaNote: 'QA Note',
    });
  });

  it('keeps raw cells and provenance; blank Player ID is never fabricated', () => {
    const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', MARKET);
    const p = planHistory(`${HEADER}\n${row({ 'QA Note': 'checked', 'Status Note': 'knee' })}`, ds);
    const r = p.records.availability[0]!;
    expect(r).toMatchObject({
      gamesPlayed: 70,
      gamesAvailable: 82,
      teamGames: 82,
      statusNote: 'knee',
      teams: ['AAA'],
    });
    expect(r.meta).toMatchObject({ source: 'fixture', confidence: 'HIGH', note: 'checked' });
    expect(r.raw?.GP).toBe('70');
    expect(p.identityUpdates.every((i) => Object.keys(i.providerIds).length === 0)).toBe(true);
  });

  it('a provided stable Player ID is recorded on the identity for that source', () => {
    const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', MARKET);
    const p = planHistory(`${HEADER}\n${row({ 'Player ID': 'src-123' })}`, ds);
    expect(p.identityUpdates[0]!.providerIds).toEqual({ nba_history: 'src-123' });
  });

  it('validation: confidence, GP ≤ available, accounting, season format, cap, flagged GP, duplicates', () => {
    const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', MARKET);
    const errs = (o: Record<string, string | number>) =>
      planHistory(`${HEADER}\n${row(o)}`, ds).rejected[0]?.errors.join(' ') ?? '';
    expect(errs({ Confidence: 'REVIEW' })).toMatch(/HIGH, MEDIUM or LOW/);
    expect(errs({ GP: 80, 'Games Available': 70 })).toMatch(/GP cannot exceed Games Available/);
    expect(errs({ GP: 70, 'Missed HIGH': 10, 'Suspension Games': 5 })).toMatch(
      /exceeds Games Available − GP \(12\)/,
    );
    expect(errs({ Season: '2025' })).toMatch(/2025-26/);
    expect(errs({ Season: '2025-27' })).toMatch(/consecutive/);
    expect(errs({ 'Games Available': 90 })).toMatch(/team games \+ 4/);
    expect(errs({ GP: '', 'Review Fields': 'GP' })).toMatch(/GP is flagged unreadable/);
    const dup = planHistory(`${HEADER}\n${row()}\n${row({ GP: 60 })}`, ds);
    expect(dup.duplicates).toHaveLength(1);
  });
});

describe('identity matching uses the existing system (no independent fuzzy merge)', () => {
  const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', MARKET);
  it('confirmed alias: "Herb Jones" history matches the "Herbert Jones" identity via ALIAS', () => {
    const p = planHistory(`${HEADER}\n${row({ Player: 'Herb Jones', 'Team(s)': 'NOP' })}`, ds);
    expect(p.matchedVia).toEqual({ ALIAS: 1 });
  });
  it('trade: several teams — matched via the team that fits; history never changes the current team', () => {
    const p = planHistory(
      `${HEADER}\n${row({ Player: 'Be Ta', 'Team(s)': 'MIA/PHI', 'Games Available': 83 })}`,
      ds,
    );
    expect(p.rejected).toEqual([]);
    expect(p.matchedVia).toEqual({ NAME_TEAM: 1 });
    expect(p.records.availability[0]!.teams).toEqual(['MIA', 'PHI']);
    const upd = p.identityUpdates.find((i) => i.canonicalName === 'Be Ta');
    expect(upd?.nbaTeam ?? 'PHI').toBe('PHI');
  });
  it('an unknown name goes to review; nothing is created', () => {
    const p = planHistory(`${HEADER}\n${row({ Player: 'Nobody Here', 'Team(s)': 'ZZZ' })}`, ds);
    expect(p.newIdentities).toEqual([]);
    expect(p.unmatched.map((u) => u.rawName)).toEqual(['Nobody Here']);
  });
});

describe('durability history → residual risk only', () => {
  it('Anthony Davis 76 / 51 / 20: H = .5·(62/82) + .3·(31/82) + .2·(6/82), all × 0.75 unclassified', () => {
    const a = computeAvailability(AD, null, 'DTD', cfg, '2025-26');
    const H = 0.75 * (0.5 * (62 / 82) + 0.3 * (31 / 82) + 0.2 * (6 / 82));
    expect(a.terms.history).toBeCloseTo(H, 12); // 0.3796
    expect(a.score).toBe(59);
    expect(a.risk).toBe('HIGH');
    expect(a.displayRisk).toBe('HIGH');
    expect(a.rhoEff).toBeCloseTo(0.5 * H + 0.03, 12);
    expect(a.terms.historyCoverage).toBe(1);
  });

  it('no history: default numbers unchanged, but shown as UNKNOWN instead of LOW; a status-driven level still shows', () => {
    const none = computeAvailability([], null, null, cfg, '2025-26');
    expect([none.terms.history, none.score, none.risk, none.displayRisk]).toEqual([
      0.1,
      90,
      'LOW',
      'UNKNOWN',
    ]);
    expect(computeAvailability([], null, 'INJ', cfg, '2025-26').displayRisk).toBe('MODERATE');
  });

  it('sophomore shrinkage: missing seasons keep their weight at the unknown default', () => {
    const one = computeAvailability([season('2025-26', 70)], null, null, cfg, '2025-26');
    expect(one.terms.history).toBeCloseTo(0.5 * 0.75 * (12 / 82) + 0.5 * 0.1, 12);
    expect(one.terms.historyCoverage).toBeCloseTo(0.5, 12);
    // a season outside the 3-year window is ignored (anchored by season, not by row order)
    const old = computeAvailability([season('2020-21', 10)], null, null, cfg, '2025-26');
    expect(old.terms.historyKnown).toBe(false);
  });

  it('partial season, shortened season, suspension and non-injury games', () => {
    expect(seasonMissShare(season('2025-26', 38, { gamesAvailable: 40 }), cfg)).toBeCloseTo(
      (2 / 40) * 0.75,
      12,
    );
    expect(seasonMissShare(season('2020-21', 70, { teamGames: 72 }), cfg)).toBeCloseTo((2 / 72) * 0.75, 12);
    expect(seasonMissShare(season('2025-26', 70, { suspensionGames: 10 }), cfg)).toBeCloseTo(
      (2 / 82) * 0.75,
      12,
    );
    expect(seasonMissShare(season('2025-26', 70, { otherNonInjuryGames: 12 }), cfg)).toBe(0);
    // itemised injuries use their recurrence; the unexplained remainder stays UNCLASSIFIED (never assumed injury type)
    const itemised = season('2025-26', 70, { absences: [{ games: 8, recurrence: 'HIGH' }] });
    expect(seasonMissShare(itemised, cfg)).toBeCloseTo((8 * 1.0 + 4 * 0.75) / 82, 12);
    // suspensions never count toward the chronic HIGH-recurrence pattern either
    const a = computeAvailability(
      [season('2025-26', 60, { suspensionGames: 22 }), season('2024-25', 60, { suspensionGames: 22 })],
      null,
      null,
      cfg,
      '2025-26',
    );
    expect(a.terms.chronic).toBe(0);
    expect(a.terms.history).toBeCloseTo(0.2 * 0.1, 12);
  });

  it('BPV is unchanged by history; only the residual RiskAdj moves DDP; the gap flag never scores', () => {
    const f = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', MARKET);
    const proj =
      'Player,Team,Pos,GP*,FGM/A*,FG%,FTM/A*,FT%,3PTM,PTS,REB,AST,ST,BLK,TO,Stat Basis\n' +
      Array.from({ length: 40 }, (_, i) =>
        [
          i === 0 ? 'Al Pha' : `Fill ${i}`,
          i === 0 ? 'AAA' : `T${i}`,
          'PG',
          i === 0 ? 58 : 70,
          `${400 + i}/900`,
          ((400 + i) / 900).toFixed(3),
          '150/190',
          (150 / 190).toFixed(3),
          100,
          1400 - i * 10,
          400,
          300,
          70,
          30,
          150,
          'TOTAL',
        ].join(','),
      ).join('\n');
    const base = importInto(f, 'PROJECTION', 'yahoo', proj);
    const hist = [
      HEADER,
      row({ Season: '2023-24', GP: 76 }),
      row({ Season: '2024-25', GP: 51 }),
      row({ Season: '2025-26', GP: 20 }),
    ].join('\n');
    const withHist = importInto(base, 'AVAILABILITY', 'nba_history', hist, cfg, 'NEVER');
    expect(withHist.availability).toHaveLength(3);
    const lg = league({ primaryProjectionProvider: 'yahoo', validationProviders: [] });
    const a = buildContext(base, lg, cfg);
    const b = buildContext(withHist, lg, cfg);
    const id = withHist.identities.find((i) => i.canonicalName === 'Al Pha')!.canonicalPlayerId;
    expect(b.byId.get(id)!.value).toEqual(a.byId.get(id)!.value); // BPV/ESV untouched (projected GP only)
    expect(a.byId.get(id)!.availability.displayRisk).toBe('UNKNOWN');
    expect(b.byId.get(id)!.availability.risk).toBe('HIGH');
    // Gap flag: projected 58 vs recent rate 49 → flagged, message only
    const gap = b.byId.get(id)!.availability.projectionGap!;
    expect(gap).toMatchObject({ projectedGp: 58, seasons: 3 });
    expect(gap.historicalGpRate).toBeCloseTo(49, 12);
    expect(b.byId.get(id)!.warnings.some((w) => w.startsWith('AVAILABILITY_PROJECTION_GAP'))).toBe(true);
    const noFlagCfg = { ...cfg, availabilityGapFlag: { minSeasons: 2, gpDifference: 99 } };
    const c = buildContext(withHist, lg, noFlagCfg);
    expect(c.byId.get(id)!.availability.projectionGap).toBeNull();
    const ddp = (ctx: ReturnType<typeof buildContext>) =>
      evaluateDraft(ctx, emptyDraft()).byId.get(id)!.ddpRaw;
    expect(ddp(c)).toBe(ddp(b)); // the flag changes nothing in scoring
    expect(ddp(b)).toBeLessThan(ddp(a)); // history acts only through the residual risk adjustment
    expect(evaluateDraft(b, emptyDraft()).byId.get(id)!.value.basePlayerValue).toBe(
      evaluateDraft(a, emptyDraft()).byId.get(id)!.value.basePlayerValue,
    );
  });

  it('gap flag needs ≥ 2 seasons and scales partial seasons to a full season', () => {
    expect(availabilityProjectionGap([season('2025-26', 20)], 70, cfg, '2025-26')).toBeNull();
    const g = availabilityProjectionGap(
      [season('2025-26', 38, { gamesAvailable: 41 }), season('2024-25', 80)],
      70,
      cfg,
      '2025-26',
    );
    expect(g!.historicalGpRate).toBeCloseTo((38 * 82) / 41 / 2 + 40, 12); // (76 + 80) / 2 = 78
  });

  it('config v6: availabilityGapFlag defaults for older configs', () => {
    const old = JSON.parse(JSON.stringify(cfg));
    delete old.availabilityGapFlag;
    const r = parseStrategyConfig(old);
    expect(r.ok && r.config.availabilityGapFlag).toEqual({ minSeasons: 2, gpDifference: 8 });
  });
});
