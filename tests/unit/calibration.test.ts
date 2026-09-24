import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildContext } from '@/domain';
import { defaultConfig } from '@/domain/config/defaults';
import { autoMapColumns } from '@/domain/import/fields';
import { parseTable } from '@/domain/import/parse';
import { planImport } from '@/domain/import/plan';
import { derivePlayoffSchedule } from '@/calibration/playoffFromProjections';
import { reconcile } from '@/calibration/reconcile';
import { buildCalibrationReport, calibrationCsv, DISAGREE, MAJOR } from '@/calibration/report';
import { runScenario } from '@/calibration/scenarios';
import { generateSample } from '@/lib/sample/generator';
import { league, seqId } from '../helpers/fixtures';

const cfg = defaultConfig();
const HB = 'R#,ADP,PLAYER,TEAM,POS,GP,FG%,FT%,3PM,PTS,REB,AST,STL,BLK,TO,W18,W19,W20,W21';
const hbRow = (rank: number, adp: string, name: string, team: string, pos = 'PG') =>
  `${rank},${adp},${name},${team},${pos},70,0.480 (7.2/15),0.800 (4/5),2,20,5,6,1.2,0.5,2.5,3,4,3,4`;
const Y = 'Player,Team,Pos,XRank,Rank,Last 7 Days ADP,Status,Source,Captured At,Confidence,Review Fields';

describe('Yahoo screenshot import', () => {
  const plan = (csv: string) => {
    const t = parseTable(csv);
    return planImport({
      kind: 'YAHOO_MARKET',
      provider: 'yahoo',
      season: '2026-27',
      description: 't',
      table: t,
      columnMap: autoMapColumns('YAHOO_MARKET', t.headers),
      identities: [],
      mappings: [],
      config: cfg,
      createPolicy: 'AUTO',
      batchId: 'b',
      now: 'n',
      newId: seqId('y'),
    });
  };
  it('keeps source metadata and raw cells; unreadable fields are forced to null and flagged', () => {
    const p = plan(`${Y}\nAl Pha,AAA,PG,5,9,7.5,,yahoo_screenshot,2026-09-20T18:00Z,MEDIUM,adp;xrank\n`);
    const m = p.records.market[0]!;
    expect(m.yahooAdp7d).toBeNull();
    expect(m.yahooXRank).toBeNull();
    expect(m.yahooRank).toBe(9);
    expect(m.meta).toEqual({
      source: 'yahoo_screenshot',
      capturedAt: '2026-09-20T18:00Z',
      confidence: 'MEDIUM',
      reviewFields: ['adp', 'xrank'],
    });
    expect(m.raw?.['Last 7 Days ADP']).toBe('7.5');
    expect(p.rowWarnings[0]!.warnings.join(' ')).toMatch(/flagged unreadable/);
  });
  it('rejects an invalid confidence value', () => {
    expect(plan(`${Y}\nAl Pha,AAA,PG,5,9,7.5,,yahoo_screenshot,x,MAYBE,\n`).rejected).toHaveLength(1);
  });
});

describe('Hashtag-compatible import', () => {
  it('keeps provider rank/ADP and W18–W21 on the projection line only (never as Yahoo market data)', () => {
    const t = parseTable(`${HB}\n${hbRow(3, '12.5', 'Al Pha', 'AAA')}\n`);
    const p = planImport({
      kind: 'PROJECTION',
      provider: 'hashtag',
      season: '2026-27',
      description: 't',
      table: t,
      columnMap: autoMapColumns('PROJECTION', t.headers),
      identities: [],
      mappings: [],
      config: cfg,
      createPolicy: 'AUTO',
      batchId: 'b',
      now: 'n',
      newId: seqId('h'),
    });
    const l = p.records.projections[0]!;
    expect(l.providerRank).toBe(3);
    expect(l.providerAdp).toBe(12.5);
    expect(l.weekGames).toEqual({ 18: 3, 19: 4, 20: 3, 21: 4 });
    expect(l.raw?.['FG%']).toBe('0.480 (7.2/15)');
    expect(p.records.market).toHaveLength(0);
  });
  it('derives a team playoff schedule by mode and reports within-team conflicts', () => {
    const t = parseTable(
      `${HB}\n${hbRow(1, '', 'A One', 'AAA')}\n${hbRow(2, '', 'B Two', 'AAA')}\n${hbRow(3, '', 'C Three', 'AAA').replace(/3,4,3,4$/, '4,4,3,4')}\n`,
    );
    const p = planImport({
      kind: 'PROJECTION',
      provider: 'hashtag',
      season: 's',
      description: 't',
      table: t,
      columnMap: autoMapColumns('PROJECTION', t.headers),
      identities: [],
      mappings: [],
      config: cfg,
      createPolicy: 'AUTO',
      batchId: 'b',
      now: 'n',
      newId: seqId('h'),
    });
    const d = derivePlayoffSchedule(p.records.projections, p.newIdentities, 'hashtag', 's', 'x');
    expect(d.schedule).toEqual([
      { nbaTeam: 'AAA', season: 's', importBatchId: 'x', gamesByWeek: { 18: 3, 19: 4, 20: 3, 21: 4 } },
    ]);
    expect(d.conflicts).toEqual([{ team: 'AAA', week: 18, values: [3, 4] }]);
  });
});

describe('reconciliation', () => {
  it('puts every row in exactly one bucket; never discards unmatched players', () => {
    const hashtag = parseTable(
      [
        HB,
        hbRow(1, '1', 'Al Pha', 'AAA'),
        hbRow(2, '2', 'Chris Lane', 'BBB'),
        hbRow(3, '3', 'Chris Lane', 'CCC'),
        hbRow(4, '4', 'Traded Guy', 'DDD'),
        hbRow(5, '5', 'Nicolas Claxon', 'EEE'),
        hbRow(6, '6', 'Hashtag Only', 'FFF'),
      ].join('\n'),
    );
    const yahoo = parseTable(
      [
        Y,
        'Al Pha,AAA,PG,1,1,1.5,,yahoo_screenshot,t,HIGH,',
        'Chris Lane,ZZZ,C,2,2,2,,yahoo_screenshot,t,HIGH,',
        'Traded Guy,GGG,SF,3,3,3,,yahoo_screenshot,t,HIGH,',
        'Nic Claxon,EEE,C,4,4,4,,yahoo_screenshot,t,HIGH,',
        'Yahoo Only,HHH,PF,5,5,5,,yahoo_screenshot,t,HIGH,',
      ].join('\n'),
    );
    const { report, dataset } = reconcile({
      hashtag: { table: hashtag, provider: 'hashtag', description: 'hb' },
      yahoo: { table: yahoo, provider: 'yahoo', description: 'y' },
      aliases: [
        { alias: 'Nic Claxon', canonicalName: 'Nicolas Claxon', team: 'EEE' },
        { alias: 'X', canonicalName: 'Nobody' },
      ],
      season: '2026-27',
      config: cfg,
    });
    expect(report.counts).toMatchObject({
      matched: 3,
      yahooOnly: 1,
      ambiguous: 1,
      teamMismatch: 1,
      hashtagOnly: 3,
    });
    expect(report.teamMismatch[0]!.name).toBe('Traded Guy');
    expect(report.ambiguous[0]!.candidates).toHaveLength(2);
    expect(report.aliasProblems).toHaveLength(1);
    expect(report.matchedVia.ALIAS).toBe(1);
    // Yahoo rows: matched + yahooOnly + ambiguous (+ rejected + duplicates) = all rows.
    const c = report.counts;
    expect(c.matched + c.yahooOnly + c.ambiguous + c.yahooRejected + c.duplicates).toBe(c.yahooRows);
    // Hashtag identities: matched + hashtag-only = all projections.
    expect(c.matched + c.hashtagOnly).toBe(dataset.projections.length);
    // Yahoo-only player is kept (market-only, unranked).
    expect(dataset.identities.some((i) => i.canonicalName === 'Yahoo Only')).toBe(true);
    // Yahoo team is authoritative after matching.
    expect(dataset.identities.find((i) => i.canonicalName === 'Traded Guy')!.nbaTeam).toBe('GGG');
  });
});

describe('calibration report', () => {
  const f = generateSample();
  const { report: recon, dataset } = reconcile({
    hashtag: {
      table: parseTable(f['projections-hashtag.sample.csv']),
      provider: 'hashtag',
      description: 'hb',
    },
    yahoo: { table: parseTable(f['yahoo-market.sample.csv']), provider: 'yahoo', description: 'y' },
    season: '2026-27',
    config: cfg,
  });
  const lg = league({ validationProviders: [] });
  const r = buildCalibrationReport({ dataset, league: lg, config: cfg, topN: 200 });

  it('covers the fantasy-relevant union and uses the documented delta sign', () => {
    expect(recon.counts.matched).toBe(300);
    expect(r.rows.length).toBeGreaterThanOrEqual(200);
    for (const row of r.rows) {
      if (row.hashtagRank !== null)
        expect(row.deltaEngineVsHashtag).toBe(row.hashtagRank - row.engineBpvRank);
      if (row.yahooXRank !== null) expect(row.deltaEngineVsXRank).toBe(row.yahooXRank - row.engineBpvRank);
      const worst = Math.max(Math.abs(row.deltaEngineVsHashtag ?? 0), Math.abs(row.deltaEngineVsXRank ?? 0));
      expect(row.severity).toBe(worst >= MAJOR ? 'MAJOR' : worst >= DISAGREE ? 'DISAGREE' : 'NONE');
      expect(row.tentativeClasses.length > 0).toBe(row.severity !== 'NONE');
    }
  });
  it('never mutates the engine config and produces a parseable CSV', () => {
    expect(cfg).toEqual(defaultConfig());
    const csv = calibrationCsv(r);
    expect(parseTable(csv).rows).toHaveLength(r.rows.length);
  });
  it('Hashtag ADP never reaches Yahoo market fields', () => {
    for (const m of dataset.market) expect(Object.keys(m)).not.toContain('providerAdp');
    const withAdp = dataset.projections.filter((p) => p.providerAdp != null);
    expect(withAdp.length).toBeGreaterThan(100);
  });
});

describe('scenario QA fixtures (determinism)', () => {
  const f = generateSample();
  const { dataset } = reconcile({
    hashtag: {
      table: parseTable(f['projections-hashtag.sample.csv']),
      provider: 'hashtag',
      description: 'hb',
    },
    yahoo: { table: parseTable(f['yahoo-market.sample.csv']), provider: 'yahoo', description: 'y' },
    season: '2026-27',
    config: cfg,
  });
  it('matches the committed sample fixtures exactly', () => {
    // Fixtures were produced by `npm run calibrate:sample`, which also layers bbm/availability/context
    // on top; this test re-creates that dataset through the CLI's documented steps.
    const withExtras = addExtras(dataset, f);
    const ctx = buildContext(
      withExtras,
      league({ draftPosition: 1, primaryProjectionProvider: 'hashtag', validationProviders: ['bbm'] }),
      cfg,
    );
    for (const [slot, foundation] of [
      [11, 'balanced'],
      [4, 'puntFT'],
    ] as const) {
      const expected = JSON.parse(
        readFileSync(
          `reports/sample/scenarios/slot${String(slot).padStart(2, '0')}-${foundation}.json`,
          'utf8',
        ),
      );
      expect(JSON.parse(JSON.stringify(runScenario(ctx, slot, foundation)))).toEqual(expected);
    }
  }, 120_000);
});

function addExtras(ds: ReturnType<typeof reconcile>['dataset'], f: ReturnType<typeof generateSample>) {
  let out = ds;
  for (const [kind, provider, file] of [
    ['PROJECTION', 'bbm', 'projections-bbm.sample.csv'],
    ['AVAILABILITY', 'manual', 'availability.sample.csv'],
    ['CONTEXT', 'manual', 'context.sample.csv'],
  ] as const) {
    const t = parseTable(f[file]);
    let i = 0;
    const p = planImport({
      kind,
      provider,
      season: '2026-27',
      description: provider,
      table: t,
      columnMap: autoMapColumns(kind, t.headers),
      identities: out.identities,
      mappings: [],
      config: cfg,
      createPolicy: 'NEVER',
      batchId: `${provider}-${kind}`,
      now: '1970-01-01T00:00:00.000Z',
      newId: () => `${provider}-${++i}`,
    });
    out = {
      ...out,
      projections: kind === 'PROJECTION' ? [...out.projections, ...p.records.projections] : out.projections,
      availability: kind === 'AVAILABILITY' ? p.records.availability : out.availability,
      context: kind === 'CONTEXT' ? p.records.context : out.context,
    };
  }
  const d = derivePlayoffSchedule(out.projections, out.identities, 'hashtag', '2026-27', 'derived-playoff');
  return { ...out, playoffSchedule: d.schedule };
}
