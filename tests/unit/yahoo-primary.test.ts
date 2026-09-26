import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildContext } from '@/domain';
import { defaultConfig } from '@/domain/config/defaults';
import { reconcileMarketAndProjections } from '@/domain/dataset/reconcileSources';
import { appendPick, appendResync, replay, undoLast } from '@/domain/draft/replay';
import { overallPickFor, userPicks } from '@/domain/draft/snake';
import { autoMapColumns } from '@/domain/import/fields';
import { parseStatus, parseTable } from '@/domain/import/parse';
import { planImport } from '@/domain/import/plan';
import { parseMadeAttempted } from '@/domain/import/rows';
import { evaluateDraft } from '@/domain/recommendations/engine';
import { buildDecisionRecord } from '@/domain/telemetry/decision';
import type { Dataset } from '@/domain/types/data';
import { rosterSize, type DraftEvent } from '@/domain/types/league';
import { generateSample } from '@/lib/sample/generator';
import { createMemoryRepository } from '@/persistence/memoryRepository';
import { emptyDraft, importInto, league, seqId } from '../helpers/fixtures';

/**
 * Yahoo as the PRIMARY projection source (Yahoo "Remaining Games (proj)" layout), Yahoo market as the
 * identity/timing source, and the draft-day manual workflow. All data here is fictional.
 */
const cfg = defaultConfig();
const HEADER = readFileSync('data/templates/yahoo-projections.template.csv', 'utf8').trim();
const EMPTY: Dataset = {
  identities: [],
  market: [],
  projections: [],
  availability: [],
  context: [],
  playoffSchedule: [],
};

function plan(csv: string, identities: Dataset['identities'] = [], provider = 'yahoo') {
  const t = parseTable(csv);
  return planImport({
    kind: 'PROJECTION',
    provider,
    season: '2026-27',
    description: 't',
    table: t,
    columnMap: autoMapColumns('PROJECTION', t.headers),
    identities,
    mappings: [],
    config: cfg,
    createPolicy: 'AUTO',
    batchId: 'b',
    now: 'n',
    newId: seqId('p'),
  });
}

/** One template row. Stats default to a plausible PER_GAME line. */
function yrow(o: Partial<Record<string, string | number>> = {}): string {
  const v: Record<string, string | number> = {
    Player: 'Al Pha',
    Team: 'AAA',
    Pos: 'PG,SG',
    'Pre-Season Rank': 12,
    'GP*': 70,
    'FGM/A*': '8.1/16.4',
    'FG%': 0.494,
    'FTM/A*': '4.2/5.0',
    'FT%': 0.84,
    '3PTM': 2.1,
    PTS: 22.5,
    REB: 5.1,
    AST: 6.2,
    ST: 1.1,
    BLK: 0.4,
    TO: 2.6,
    'Stat Basis': 'PER_GAME',
    Source: 'yahoo_screenshot',
    'Captured At': '2026-09-26',
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
}

describe('Yahoo projection CSV schema', () => {
  it('template columns auto-map, including asterisked headers and the combined FGM/A, FTM/A cells', () => {
    const map = autoMapColumns('PROJECTION', HEADER.split(','));
    expect(map).toMatchObject({
      name: 'Player',
      team: 'Team',
      positions: 'Pos',
      providerRank: 'Pre-Season Rank',
      gp: 'GP*',
      fgma: 'FGM/A*',
      fgPct: 'FG%',
      ftma: 'FTM/A*',
      ftPct: 'FT%',
      threes: '3PTM',
      pts: 'PTS',
      reb: 'REB',
      ast: 'AST',
      stl: 'ST',
      blk: 'BLK',
      to: 'TO',
      statBasis: 'Stat Basis',
      source: 'Source',
      capturedAt: 'Captured At',
      confidence: 'Confidence',
      reviewFields: 'Review Fields',
      qaNote: 'QA Note',
    });
    expect(HEADER.split(',').filter((h) => !Object.values(map).includes(h))).toEqual([]);
  });

  it('splits decimal made/attempted cells exactly; never derives attempts', () => {
    expect(parseMadeAttempted('8.1/16.4')).toMatchObject({ makes: 8.1, attempts: 16.4 });
    expect(parseMadeAttempted(' 612.5 / 1,301.2 ')).toMatchObject({ makes: 612.5, attempts: 1301.2 });
    expect(parseMadeAttempted('.5/1')).toMatchObject({ makes: 0.5, attempts: 1 });
    expect(parseMadeAttempted('8.1-16.4')).toBe('INVALID');
    expect(parseMadeAttempted('49.4%')).toBe('INVALID');
    expect(parseMadeAttempted('')).toBeNull();
  });

  it('PER_GAME row: makes/attempts flow unchanged; provenance and raw cells are kept', () => {
    const p = plan(`${HEADER}\n${yrow({ 'QA Note': 'checked' })}`);
    expect(p.rejected).toEqual([]);
    expect(p.rowWarnings).toEqual([]);
    const l = p.records.projections[0]!;
    expect([l.fgm, l.fga, l.ftm, l.fta]).toEqual([8.1, 16.4, 4.2, 5.0]);
    expect(l.sourcePct).toEqual({ fg: 0.494, ft: 0.84 });
    expect(l.providerRank).toBe(12);
    expect(l.meta).toEqual({
      source: 'yahoo_screenshot',
      capturedAt: '2026-09-26',
      confidence: 'HIGH',
      reviewFields: [],
      note: 'checked',
    });
    expect(l.raw?.['FGM/A*']).toBe('8.1/16.4');
    expect(p.batch.capturedAt).toEqual(['2026-09-26']);
  });

  it('TOTAL basis: decimal totals are divided by GP (never rounded to integers)', () => {
    const p = plan(
      `${HEADER}\n${yrow({ 'Stat Basis': 'TOTAL', 'GP*': 70, 'FGM/A*': '567.7/1149.4', 'FG%': 0.494, 'FTM/A*': '294.3/350.1', 'FT%': 0.841, '3PTM': 147, PTS: 1575, REB: 357, AST: 434, ST: 77, BLK: 28, TO: 182 })}`,
    );
    expect(p.rejected).toEqual([]);
    const l = p.records.projections[0]!;
    expect(l.fgm).toBeCloseTo(567.7 / 70, 12);
    expect(l.fga).toBeCloseTo(1149.4 / 70, 12);
    expect(l.ftm).toBeCloseTo(294.3 / 70, 12);
    expect(l.fta).toBeCloseTo(350.1 / 70, 12);
    expect(l.pts).toBeCloseTo(22.5, 12);
  });

  it('totals without an explicit TOTAL basis are rejected, not guessed', () => {
    const p = plan(`${HEADER}\n${yrow({ 'Stat Basis': '', 'FGM/A*': '567/1149', PTS: 1575 })}`);
    expect(p.rejected[0]!.errors.join(' ')).toMatch(/stat basis TOTAL/);
  });

  it('a FG% without makes/attempts is rejected (attempts are never derived from %)', () => {
    const p = plan(`${HEADER}\n${yrow({ 'FGM/A*': '' })}`);
    expect(p.rejected[0]!.errors.join(' ')).toMatch(/FGA \(attempts\) is required/);
  });

  it('malformed or inconsistent shooting cells are rejected', () => {
    expect(plan(`${HEADER}\n${yrow({ 'FGM/A*': '8.1 of 16.4' })}`).rejected).toHaveLength(1);
    expect(plan(`${HEADER}\n${yrow({ 'FGM/A*': '16.4/8.1' })}`).rejected[0]!.errors.join(' ')).toMatch(
      /cannot exceed/,
    );
    expect(plan(`${HEADER}\n${yrow({ 'FG%': 0.62 })}`).rejected[0]!.errors.join(' ')).toMatch(/inconsistent/);
  });

  it('a stat flagged unreadable rejects the row; a flagged team is nulled with a warning', () => {
    const bad = plan(`${HEADER}\n${yrow({ 'Review Fields': 'FGM/A;PTS' })}`);
    expect(bad.rejected[0]!.errors.join(' ')).toMatch(/Flagged unreadable in the source: fg, pts/);
    const team = plan(`${HEADER}\n${yrow({ 'Review Fields': 'team' })}`);
    expect(team.rejected).toEqual([]);
    expect(team.newIdentities[0]!.nbaTeam).toBeNull();
    expect(team.rowWarnings[0]!.warnings.join(' ')).toMatch(/Needs review: team/);
  });

  it('Confidence is HIGH | MEDIUM | LOW only: REVIEW is rejected with guidance; LOW + Review Fields + QA Note is the review form', () => {
    const review = plan(`${HEADER}\n${yrow({ Confidence: 'REVIEW' })}`);
    expect(review.rejected[0]!.errors.join(' ')).toMatch(
      /HIGH, MEDIUM or LOW.*Confidence=LOW with Review Fields and a QA Note/,
    );
    // A flagged non-stat field with LOW confidence imports (field nulled, warning, provenance kept).
    const low = plan(
      `${HEADER}\n${yrow({ Confidence: 'LOW', 'Review Fields': 'Team', 'QA Note': 'team cell unreadable' })}`,
    );
    expect(low.rejected).toEqual([]);
    expect(low.records.projections[0]!.meta).toMatchObject({
      confidence: 'LOW',
      reviewFields: ['team'],
      note: 'team cell unreadable',
    });
    // A flagged stat with LOW confidence is still rejected: stats are never inferred.
    const stat = plan(`${HEADER}\n${yrow({ Confidence: 'LOW', 'Review Fields': 'PTS', 'QA Note': 'x' })}`);
    expect(stat.rejected).toHaveLength(1);
  });

  it('rows from different captures in one file raise a snapshot warning', () => {
    const p = plan(`${HEADER}\n${yrow()}\n${yrow({ Player: 'Be Ta', 'Captured At': '2026-09-27' })}`);
    expect(p.batch.capturedAt).toEqual(['2026-09-26', '2026-09-27']);
    expect(p.batchWarnings[0]).toMatch(/mixes 2 captures/);
  });
});

describe('Yahoo as the primary projection source', () => {
  const f = generateSample();
  let ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', f['yahoo-market.sample.csv']);
  ds = importInto(ds, 'PROJECTION', 'yahoo', f['projections-yahoo.sample.csv']);

  it('recommendations run with Yahoo projections alone — no Hashtag file, missing validation provider', () => {
    expect(ds.projections.every((p) => p.provider === 'yahoo')).toBe(true);
    const lg = league({ primaryProjectionProvider: 'yahoo', validationProviders: ['hashtag', 'bbm'] });
    const ctx = buildContext(ds, lg, cfg);
    const ev = evaluateDraft(ctx, emptyDraft());
    expect(ctx.status).toBe('OK');
    expect(ev.status).toBe('OK');
    expect(ev.recommendedId).not.toBeNull();
    expect(ctx.ranked.length).toBe(300);
    // No playoff schedule → neutral playoff adjustment, never fabricated.
    expect(ev.players.every((p) => p.adjustments.playoff === 0)).toBe(true);
  });

  it('the Yahoo-format sample reproduces the Hashtag-format sample per game within display rounding', () => {
    let hb = importInto(EMPTY, 'PROJECTION', 'hashtag', f['projections-hashtag.sample.csv']);
    hb = importInto(hb, 'YAHOO_MARKET', 'yahoo', f['yahoo-market.sample.csv']);
    const byName = new Map(
      hb.projections.map((p) => [
        hb.identities.find((i) => i.canonicalPlayerId === p.canonicalPlayerId)!.canonicalName,
        p,
      ]),
    );
    for (const y of ds.projections.slice(0, 50)) {
      const name = ds.identities.find((i) => i.canonicalPlayerId === y.canonicalPlayerId)!.canonicalName;
      const h = byName.get(name)!;
      expect(Math.abs(y.fga - h.fga)).toBeLessThan(0.06);
      expect(Math.abs(y.pts - h.pts)).toBeLessThan(0.06);
    }
  });

  it('market ranking never enters player quality: shuffling XRank/ADP leaves BPV and DDP-quality terms unchanged', () => {
    const lg = league({ primaryProjectionProvider: 'yahoo', validationProviders: [] });
    const a = buildContext(ds, lg, cfg);
    const shuffled: Dataset = {
      ...ds,
      market: ds.market.map((m, i) => ({
        ...m,
        yahooXRank: ((i * 37) % 300) + 1,
        yahooAdp7d: ((i * 53) % 300) + 1,
        yahooRank: ((i * 71) % 300) + 1,
      })),
    };
    const b = buildContext(shuffled, lg, cfg);
    for (const p of a.ranked.slice(0, 40)) {
      const q = b.byId.get(p.player.id)!;
      expect(q.value.basePlayerValue).toBe(p.value.basePlayerValue);
    }
  });
});

describe('percentages are volume-weighted (Yahoo combined cells)', () => {
  it('identical FG% with 10× the attempts has ~10× the FG impact', () => {
    const rows = [
      yrow({ Player: 'Vol Ume', 'FGM/A*': '11.0/20.0', 'FG%': 0.55 }),
      yrow({ Player: 'Tri Ckle', 'FGM/A*': '1.1/2.0', 'FG%': 0.55 }),
    ];
    for (let i = 0; i < 40; i++)
      rows.push(
        yrow({
          Player: `Fill ${i}`,
          Team: `T${i}`,
          'FGM/A*': `${(6 + (i % 5) * 0.3).toFixed(1)}/14.0`,
          'FG%': ((6 + (i % 5) * 0.3) / 14).toFixed(3),
        }),
      );
    const p = plan(`${HEADER}\n${rows.join('\n')}`);
    expect(p.rejected).toEqual([]);
    const ds: Dataset = { ...EMPTY, identities: p.newIdentities, projections: p.records.projections };
    const ctx = buildContext(
      ds,
      league({ primaryProjectionProvider: 'yahoo', validationProviders: [] }),
      cfg,
    );
    const by = (n: string) => ctx.ranked.find((x) => x.player.name === n)!.stats;
    const pFG = ctx.population.stats.pFG;
    expect(pFG).toBeLessThan(0.55);
    expect(by('Vol Ume').fgImpact).toBeCloseTo(20 * (0.55 - pFG), 10);
    expect(by('Tri Ckle').fgImpact).toBeCloseTo(2 * (0.55 - pFG), 10);
    expect(by('Vol Ume').rawZ.FG_PCT).toBeGreaterThan(by('Tri Ckle').rawZ.FG_PCT + 1);
  });
});

describe('market ↔ projection reconciliation', () => {
  const M = 'Player,Team,Pos,XRank,Rank,Last 7 Days ADP,Status';
  const market = [
    `${M}`,
    'Al Pha,AAA,PG,1,1,1.5,',
    'Be Ta,BBB,SG,2,2,2.5,',
    'Ce Ce,CCC,C,3,3,,INJ',
    'Sam Twin,DDD,SF,4,4,4.5,',
    'Sam Twin,EEE,PF,5,5,5.5,',
  ].join('\n');
  let ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', market);
  const pl = plan(
    [
      HEADER,
      yrow({ Player: 'Al Pha', Team: 'AAA' }),
      yrow({ Player: 'Be Ta', Team: 'ZZZ' }),
      yrow({ Player: 'De Novo', Team: 'NEW' }),
      yrow({ Player: 'Sam Twin', Team: 'QQQ' }),
    ].join('\n'),
    ds.identities,
  );
  ds = {
    ...ds,
    identities: [...ds.identities, ...pl.newIdentities],
    projections: pl.records.projections,
  };
  const r = reconcileMarketAndProjections(ds, 'yahoo', pl.unmatched, new Set(['b']));

  it('counts matched / market-only / projection-only / ambiguous / team mismatch', () => {
    expect(r.counts).toEqual({
      marketPlayers: 5,
      projectionPlayers: 3,
      matched: 2,
      marketOnly: 3,
      projectionOnly: 1,
      ambiguous: 1,
      needsReview: 0,
      teamMismatch: 1,
      sourceDisagreements: 2, // Be Ta team; Al Pha eligibility PG (market) vs PG,SG (projection)
    });
    expect(r.projectionOnly.map((x) => x.name)).toEqual(['De Novo']);
    expect(r.teamMismatch).toEqual([
      expect.objectContaining({ name: 'Be Ta', marketTeam: 'BBB', projectionTeam: 'ZZZ' }),
    ]);
    expect(r.ambiguous[0]!.candidates).toHaveLength(2);
  });
  it('ambiguous names are never merged; the market team stays authoritative', () => {
    expect(ds.identities.filter((i) => i.canonicalName === 'Sam Twin')).toHaveLength(2);
    expect(ds.identities.find((i) => i.canonicalName === 'Be Ta')!.nbaTeam).toBe('BBB');
  });
  it('Yahoo INJ stays INJ (no duration inferred); blank status stays null', () => {
    expect(parseStatus('INJ')).toBe('INJ');
    expect(ds.market.map((m) => m.status)).toEqual([null, null, 'INJ', null, null]);
  });
});

describe('identity creation policy (AUTO)', () => {
  const M = 'Player,Team,Pos,XRank\nAl Pha,AAA,PG,1\n';
  it('all-Yahoo identities: an unmatched Yahoo projection row is a new player', () => {
    const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', M);
    expect(ds.identities[0]!.origin).toBe('yahoo');
    const p = plan(`${HEADER}\n${yrow({ Player: 'Rook Ie', Team: 'NEW' })}`, ds.identities);
    expect(p.newIdentities.map((i) => i.canonicalName)).toEqual(['Rook Ie']);
    expect(p.unmatched).toEqual([]);
  });
  it('same-team spelling variants go to review with candidates, never become a second player', () => {
    // Patterns found in the real 2026-27 files (fictional names here): shortened first name, initial,
    // one-letter spelling change (STRONG), same surname + different first name (SURNAME_ONLY) → review.
    // Same first name + different surname (FIRST_NAME_ONLY) is NOT evidence: created as a separate player.
    const market = [
      'Player,Team,Pos,XRank',
      'Herb Stone,NOP,SF,1',
      'M Kowal,BKN,C,2',
      'Jaylin Brook,MEM,SG,3',
      'Kobe Lane,LAC,SG,4',
      'Sam Quill,DAL,PF,5',
      'Dyl Acre,SAC,PG,6',
    ].join('\n');
    const ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', market);
    const p = plan(
      [
        HEADER,
        yrow({ Player: 'Herbert Stone', Team: 'NOP' }),
        yrow({ Player: 'Marek Kowal', Team: 'BKN' }),
        yrow({ Player: 'Jaylen Brook', Team: 'MEM' }),
        yrow({ Player: 'Kobe Sands', Team: 'LAC' }),
        yrow({ Player: 'Darus Acre', Team: 'SAC' }), // same surname, unrelated first name → review (hold)
        yrow({ Player: 'Tom Quill', Team: 'HOU' }), // same surname, other team → genuinely new
        yrow({ Player: 'Ade Novo', Team: 'NEW' }),
        yrow({ Player: 'Bo Novo', Team: 'NEW' }), // two new same-team players in one file → both created
      ].join('\n'),
      ds.identities,
    );
    expect(p.unmatched.map((u) => [u.rawName, u.reason, u.candidateIds.length])).toEqual([
      ['Herbert Stone', 'NO_MATCH', 1],
      ['Marek Kowal', 'NO_MATCH', 1],
      ['Jaylen Brook', 'NO_MATCH', 1],
      ['Darus Acre', 'NO_MATCH', 1],
    ]);
    expect(p.newIdentities.map((i) => i.canonicalName)).toEqual([
      'Kobe Sands',
      'Tom Quill',
      'Ade Novo',
      'Bo Novo',
    ]);
  });
  it('review tokens may carry the header asterisk ("GP*", "FGM/A*")', () => {
    const p = plan(`${HEADER}\n${yrow({ 'Review Fields': 'GP*; FGM/A*' })}`);
    expect(p.rejected[0]!.errors.join(' ')).toMatch(/Flagged unreadable in the source: gp, fg\./);
  });
  it('identities from another provider: unmatched rows go to review, never auto-created', () => {
    const ds = importInto(EMPTY, 'PROJECTION', 'hashtag', `${HEADER}\n${yrow({ Player: 'Alex Stone' })}`);
    const p = plan(`${HEADER}\n${yrow({ Player: 'Alexander Stoner' })}`, ds.identities);
    expect(p.newIdentities).toEqual([]);
    expect(p.unmatched.map((u) => [u.rawName, u.reason])).toEqual([['Alexander Stoner', 'NO_MATCH']]);
  });
});

describe('projection snapshots', () => {
  it('only the explicitly active snapshot is used; an older one can be re-selected; never mixed', async () => {
    const repo = createMemoryRepository();
    const commit = async (pts: number, batchId: string, at: string) => {
      const t = parseTable(
        `${HEADER}\n${yrow({ PTS: pts, 'Captured At': at })}\n${yrow({ Player: 'Be Ta', PTS: pts, 'Captured At': at })}`,
      );
      const p = planImport({
        kind: 'PROJECTION',
        provider: 'yahoo',
        season: '2026-27',
        description: at,
        table: t,
        columnMap: autoMapColumns('PROJECTION', t.headers),
        identities: (await repo.loadDataset()).identities,
        mappings: [],
        config: cfg,
        createPolicy: 'AUTO',
        batchId,
        now: at,
        newId: seqId(batchId),
      });
      await repo.commitImport(p);
    };
    await commit(20, 'snap-1', '2026-09-26');
    await commit(25, 'snap-2', '2026-09-27');
    const pts = async () => (await repo.loadDataset()).projections.map((p) => p.pts);
    expect(await pts()).toEqual([25, 25]);
    await repo.activateBatch('snap-1');
    expect(await pts()).toEqual([20, 20]);
    const st = Object.fromEntries((await repo.listBatches()).map((b) => [b.id, b.status]));
    expect(st).toEqual({ 'snap-1': 'ACTIVE', 'snap-2': 'SUPERSEDED' });
  });
});

describe('draft-day manual workflow', () => {
  const f = generateSample();
  let ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', f['yahoo-market.sample.csv']);
  ds = importInto(ds, 'PROJECTION', 'yahoo', f['projections-yahoo.sample.csv']);
  const lg = league({ primaryProjectionProvider: 'yahoo', validationProviders: [], draftPosition: 4 });
  const ctx = buildContext(ds, lg, cfg);
  const R = rosterSize(lg.roster);
  const pick = (events: DraftEvent[], id: string, by: 'ME' | 'OTHER', advance = true) => {
    const r = appendPick(events, { playerId: id, by, advance, at: 't' }, lg.teamCount, R);
    if (!r.ok) throw new Error(r.error);
    return r.events;
  };
  const evAt = (events: DraftEvent[]) => evaluateDraft(ctx, { ...emptyDraft(), events });

  it('MARK TAKEN: marks unavailable, advances exactly one pick, recalculates; Undo restores exactly', () => {
    const e0: DraftEvent[] = [];
    const before = evAt(e0);
    const top = before.players[0]!.playerId;
    const e1 = pick(e0, top, 'OTHER');
    const after = evAt(e1);
    expect(after.draft.currentOverall).toBe(before.draft.currentOverall + 1);
    expect(after.byId.has(top)).toBe(false);
    expect(after.players.length).toBe(before.players.length - 1);
    expect(after.gap.beforeNext).toBe(before.gap.beforeNext - 1);
    expect(JSON.stringify(evAt(undoLast(e1)).players.map((p) => [p.playerId, p.priority]))).toBe(
      JSON.stringify(before.players.map((p) => [p.playerId, p.priority])),
    );
  });

  it('user pick at a configurable slot (4) records a decision record; Undo removes it with the pick', () => {
    let e: DraftEvent[] = [];
    for (let i = 0; i < 3; i++) e = pick(e, evAt(e).players[0]!.playerId, 'OTHER');
    const before = evAt(e);
    expect(before.timing.onTheClock).toBe(true);
    expect(before.draft.currentOverall).toBe(4);
    const choice = before.players[2]!.playerId;
    const d = buildDecisionRecord({
      ctx,
      league: lg,
      input: { ...emptyDraft(), events: e },
      before,
      playerId: choice,
      unprojectedAvailable: 0,
      activeBatchIds: ['b2', 'b1'],
      configVersion: cfg.version,
      now: 't',
    });
    expect(d).toMatchObject({ overallPick: 4, round: 1, onSchedule: true, followedRecommendation: false });
    expect(d.recommended!.playerId).toBe(before.recommendedId);
    expect('ddpRaw' in d.selected && d.selected.playerId).toBe(choice);
    expect(d.alternatives.length).toBe(8);
    expect(d.profileBefore).toHaveLength(9);
    expect(d.profileAfter).toHaveLength(9);
    expect(d.timing.nextPick).toBe(overallPickFor(14, 4, 2)); // 25
    expect(d.available.projected).toBe(before.players.length);
    expect(d.available.order[0]).toBe(before.players[0]!.playerId);
    expect(d.context.activeBatchIds).toEqual(['b1', 'b2']);
    // Record rides on the event; undo removes both.
    const r = appendPick(e, { playerId: choice, by: 'ME', decision: d, at: 't' }, 14, R);
    expect(r.ok && (r.events.at(-1) as { decision?: unknown }).decision).toEqual(d);
    const st = replay(r.ok ? r.events : []);
    expect(st.myPicks.map((p) => p.playerId)).toEqual([choice]);
    expect(undoLast(r.ok ? r.events : [])).toEqual(e);
    // Punt starts at NONE and only tendencies are allowed after one pick.
    expect(d.punt.before).toEqual([]);
    expect((d.punt.after ?? []).every((p) => p.level === 'TENDENCY')).toBe(true);
  });

  it('resync + catch-up picks + undo never corrupt the clock', () => {
    let e = pick([], evAt([]).players[0]!.playerId, 'OTHER');
    const r = appendResync(e, 5, 14, R);
    expect(r.ok).toBe(true);
    e = r.ok ? r.events : e;
    const s1 = replay(e);
    expect([s1.currentOverall, s1.unrecordedPicks]).toEqual([5, 3]);
    for (let i = 0; i < 3; i++) e = pick(e, evAt(e).players[0]!.playerId, 'OTHER', false);
    const s2 = replay(e);
    expect([s2.currentOverall, s2.unrecordedPicks, s2.accountedPicks]).toEqual([5, 0, 4]);
    expect(() => pick(e, evAt(e).players[0]!.playerId, 'OTHER', false)).toThrow(/No unrecorded picks/);
    // Undo walks back catch-ups, then the resync, exactly.
    let u = e;
    for (let i = 0; i < 4; i++) u = undoLast(u);
    expect(replay(u).currentOverall).toBe(2);
    expect(replay(u).unrecordedPicks).toBe(0);
  });
});

describe('14-team snake: slots 1, 4, 7, 11, 14 including round turns', () => {
  const expected: Record<number, number[]> = {
    1: [1, 28, 29, 56, 57, 84, 85, 112, 113, 140, 141, 168, 169],
    4: [4, 25, 32, 53, 60, 81, 88, 109, 116, 137, 144, 165, 172],
    7: [7, 22, 35, 50, 63, 78, 91, 106, 119, 134, 147, 162, 175],
    11: [11, 18, 39, 46, 67, 74, 95, 102, 123, 130, 151, 158, 179],
    14: [14, 15, 42, 43, 70, 71, 98, 99, 126, 127, 154, 155, 182],
  };
  for (const [slot, picks] of Object.entries(expected))
    it(`slot ${slot}`, () => {
      expect(userPicks({ teams: 14, slot: Number(slot), rounds: 13 })).toEqual(picks);
    });
});

describe('O1: sample-size-aware category states (presentation only)', () => {
  const f = generateSample();
  let ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', f['yahoo-market.sample.csv']);
  ds = importInto(ds, 'PROJECTION', 'yahoo', f['projections-yahoo.sample.csv']);
  const lg = league({ primaryProjectionProvider: 'yahoo', validationProviders: [], draftPosition: 1 });
  const ctx = buildContext(ds, lg, cfg);
  const R = rosterSize(lg.roster);

  it('display mapping per maturity; calculated state, d, need and DDP are unchanged', async () => {
    const { displayCategoryState, stateMaturity } = await import('@/domain/roster/profile');
    expect([0, 1, 2, 3, 4, 5, 9].map((k) => stateMaturity(k, cfg))).toEqual([
      'TENDENCY',
      'TENDENCY',
      'TENDENCY',
      'EMERGING',
      'EMERGING',
      'FULL',
      'FULL',
    ]);
    expect(displayCategoryState('CRITICAL', 'TENDENCY')).toBe('LEANING_WEAK');
    expect(displayCategoryState('WEAK', 'TENDENCY')).toBe('LEANING_WEAK');
    expect(displayCategoryState('COMPETITIVE', 'TENDENCY')).toBe('EVEN');
    expect(displayCategoryState('ELITE', 'TENDENCY')).toBe('LEANING_STRONG');
    expect(displayCategoryState('CRITICAL', 'EMERGING')).toBe('WEAK');
    expect(displayCategoryState('STRONG', 'EMERGING')).toBe('STRONG');
    expect(displayCategoryState('CRITICAL', 'FULL')).toBe('CRITICAL');
    // A manual punt is the user's choice: always shown.
    expect(displayCategoryState('PUNT', 'TENDENCY')).toBe('PUNT');
    expect(displayCategoryState('SOFT_PUNT', 'EMERGING')).toBe('SOFT_PUNT');
  });

  it('a one-player roster never shows CRITICAL, even when the calculated state is CRITICAL', () => {
    // Draft a specialist and walk the draft forward, checking the shown state at every roster size.
    let events: DraftEvent[] = [];
    const saw = { critCalcEarly: false };
    for (let k = 0; k < 7; k++) {
      const ev = evaluateDraft(ctx, { ...emptyDraft(), events });
      for (const p of ev.profile) {
        if (k <= 4) expect(p.displayState).not.toBe('CRITICAL');
        if (k <= 2)
          expect(['LEANING_STRONG', 'EVEN', 'LEANING_WEAK', 'SOFT_PUNT', 'PUNT']).toContain(p.displayState);
        if (k >= 5) expect(p.displayState).toBe(p.state);
        if (k <= 2 && p.state === 'CRITICAL') saw.critCalcEarly = true;
      }
      // my pick then 13 others (keeps it a realistic snake-ish sequence)
      const mine = ev.players.find((x) => x.positions.includes('C')) ?? ev.players[0]!;
      const r = appendPick(events, { playerId: mine.playerId, by: 'ME', at: 't' }, 14, R);
      events = r.ok ? r.events : events;
      for (let i = 0; i < 13; i++) {
        const o = evaluateDraft(ctx, { ...emptyDraft(), events }).players[0]!;
        const q = appendPick(events, { playerId: o.playerId, by: 'OTHER', at: 't' }, 14, R);
        events = q.ok ? q.events : events;
      }
    }
    // The fixture really exercises the case: a calculated CRITICAL exists early but is not shown.
    expect(saw.critCalcEarly).toBe(true);
  }, 60_000); // walks ~90 engine evaluations; generous timeout so CPU load cannot flake it
});

describe('no-market players: statistical rank separate from market urgency', () => {
  const f = generateSample();
  // Drop the market rows of three strong players: they keep their projections and value.
  let ds = importInto(EMPTY, 'YAHOO_MARKET', 'yahoo', f['yahoo-market.sample.csv']);
  ds = importInto(ds, 'PROJECTION', 'yahoo', f['projections-yahoo.sample.csv']);
  const lg = league({ primaryProjectionProvider: 'yahoo', validationProviders: [], draftPosition: 7 });
  const full = buildContext(ds, lg, cfg);
  const top = evaluateDraft(full, emptyDraft())
    .players.slice(3, 6)
    .map((p) => p.playerId);
  const noMarket: Dataset = { ...ds, market: ds.market.filter((m) => !top.includes(m.canonicalPlayerId)) };
  const ctx = buildContext(noMarket, lg, cfg);
  const ev = evaluateDraft(ctx, emptyDraft());

  it('value is unchanged; urgency is UNAVAILABLE and the label is NO_MARKET (or PASS on value)', () => {
    for (const id of top) {
      const a = full.byId.get(id)!;
      const b = ctx.byId.get(id)!;
      expect(b.value.basePlayerValue).toBe(a.value.basePlayerValue);
      const e = ev.byId.get(id)!;
      expect(e.market).toMatchObject({
        adp: null,
        xrank: null,
        marketRef: null,
        band: 'UNKNOWN',
        urgency: 'UNAVAILABLE',
      });
      expect(['NO_MARKET', 'PASS']).toContain(e.label);
      expect(e.ddpRank).toBeGreaterThan(0); // statistical rank still reported
    }
    expect(
      ev.players.filter((p) => p.market.urgency === 'AVAILABLE').every((p) => p.label !== 'NO_MARKET'),
    ).toBe(true);
  });

  it('planning never assumes a no-market player survives to my next pick', () => {
    for (const p of ev.players)
      if (p.planning?.nextBestConservative.playerId)
        expect(top).not.toContain(p.planning.nextBestConservative.playerId);
  });
});
