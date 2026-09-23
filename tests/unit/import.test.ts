import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { autoMapColumns } from '@/domain/import/fields';
import {
  parseNumber,
  parsePctCell,
  parsePositions,
  parseStatus,
  parseTable,
  sanitizeText,
} from '@/domain/import/parse';
import { planImport } from '@/domain/import/plan';
import type { ImportKind, PlayerIdentity } from '@/domain/types/data';
import { seqId } from '../helpers/fixtures';

const cfg = defaultConfig();
function plan(
  kind: ImportKind,
  csv: string,
  identities: PlayerIdentity[] = [],
  createPolicy: 'AUTO' | 'CREATE_UNMATCHED' | 'NEVER' = 'AUTO',
) {
  const table = parseTable(csv);
  return planImport({
    kind,
    provider: kind === 'YAHOO_MARKET' ? 'yahoo' : 'hashtag',
    season: '2026-27',
    description: 't',
    table,
    columnMap: autoMapColumns(kind, table.headers),
    identities,
    mappings: [],
    config: cfg,
    createPolicy,
    batchId: 'b1',
    now: 'now',
    newId: seqId('n'),
  });
}

const HEADER = 'PLAYER,TEAM,POS,GP,FG%,FT%,3PM,PTS,REB,AST,STL,BLK,TO';

describe('cell parsing', () => {
  it('numbers and percents', () => {
    expect(parseNumber('12.5')).toBe(12.5);
    expect(parseNumber('45%')).toBe(0.45);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNaN();
  });
  it('Hashtag-style pct cells carry makes/attempts', () => {
    expect(parsePctCell('0.483 (7.1/14.7)')).toEqual({ pct: 0.483, makes: 7.1, attempts: 14.7 });
    expect(parsePctCell('48.3%').pct).toBeCloseTo(0.483);
    expect(parsePctCell('48.3').pct).toBeCloseTo(0.483);
  });
  it('positions and statuses', () => {
    expect(parsePositions('PG,SG').positions).toEqual(['PG', 'SG']);
    expect(parsePositions('G/F').positions).toEqual(['PG', 'SG', 'SF', 'PF']);
    expect(parsePositions('PG,XX').invalid).toEqual(['XX']);
    expect(parseStatus('GTD')).toBe('DTD');
    expect(parseStatus('INJ')).toBe('OUT_SHORT');
    expect(parseStatus('weird')).toBe('INVALID');
  });
  it('sanitizes free text', () => {
    expect(sanitizeText('a\u0000b<script>')).toBe('a b<script>');
    expect(sanitizeText('x'.repeat(500)).length).toBe(300);
  });
  it('JSON arrays parse too', () => {
    const t = parseTable('[{"PLAYER":"A","GP":10}]', 'json');
    expect(t.rows[0]).toEqual({ PLAYER: 'A', GP: '10' });
    expect(parseTable('{"a":1}', 'json').errors).not.toHaveLength(0);
  });
});

describe('CSV validation', () => {
  it('first projection import creates identities; makes/attempts from pct cells', () => {
    const p = plan(
      'PROJECTION',
      `${HEADER}\nAl Pha,AAA,PG,70,0.500 (5/10),0.900 (9/10),2,20,5,8,1.5,0.3,3\n`,
    );
    expect(p.rejected).toEqual([]);
    expect(p.newIdentities).toHaveLength(1);
    expect(p.records.projections[0]).toMatchObject({ fgm: 5, fga: 10, ftm: 9, fta: 10, gp: 70 });
  });
  it('rejects rows without attempts (percent needs volume)', () => {
    const p = plan('PROJECTION', `${HEADER}\nAl Pha,AAA,PG,70,0.5,0.9,2,20,5,8,1.5,0.3,3\n`);
    expect(p.rejected[0]!.errors.join(' ')).toMatch(/attempts/);
  });
  it('rejects makes > attempts, negatives, bad numbers, out-of-range GP', () => {
    const csv = `${HEADER}\nA,AAA,PG,70,0.5 (11/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\nB,AAA,PG,70,0.5 (5/10),0.9 (9/10),-2,20,5,8,1.5,0.3,3\nC,AAA,PG,x,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\nD,AAA,PG,99,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\n`;
    const p = plan('PROJECTION', csv);
    expect(p.rejected.map((r) => r.name)).toEqual(['A', 'B', 'C', 'D']);
  });
  it('detects duplicates within an import', () => {
    const row = 'Al Pha,AAA,PG,70,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3';
    const p = plan('PROJECTION', `${HEADER}\n${row}\n${row}\n`);
    expect(p.duplicates).toHaveLength(1);
    expect(p.records.projections).toHaveLength(1);
  });
  it('reports missing required columns', () => {
    const p = plan('PROJECTION', 'PLAYER,GP\nA,10\n');
    expect(p.missingRequiredColumns).toEqual(expect.arrayContaining(['threes', 'pts']));
    expect(p.records.projections).toHaveLength(0);
  });
  it('TOTAL basis converts to per game', () => {
    const p = plan(
      'PROJECTION',
      `PLAYER,GP,FGM,FGA,FTM,FTA,3PM,PTS,REB,AST,STL,BLK,TO,BASIS\nA,50,250,500,100,125,50,700,300,150,50,25,100,TOTAL\n`,
    );
    expect(p.records.projections[0]).toMatchObject({ pts: 14, fga: 10, fta: 2.5 });
  });
  it('flags pct/makes disagreement as a warning, uses makes/attempts', () => {
    const p = plan(
      'PROJECTION',
      `PLAYER,GP,FGM,FGA,FG%,FTM,FTA,3PM,PTS,REB,AST,STL,BLK,TO\nA,50,5,10,0.6,2,3,1,12,4,3,1,1,2\n`,
    );
    expect(p.rowWarnings[0]!.warnings.join()).toMatch(/disagrees/);
    expect(p.records.projections[0]!.fgm).toBe(5);
  });
});

describe('provider reconciliation', () => {
  it('later imports match existing identities; unmatched go to review (never auto-merged)', () => {
    const first = plan(
      'PROJECTION',
      `${HEADER}\nChris Lane,AAA,PG,70,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\nChris Lane,BBB,C,70,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\n`,
    );
    const ids = first.newIdentities;
    expect(ids).toHaveLength(2);
    const m = plan(
      'YAHOO_MARKET',
      'Player,Team,Pos,ADP\nChris Lane,AAA,"PG,SG",12\nChris Lane,ZZZ,C,40\nNew Guy,CCC,SF,90\n',
      ids,
    );
    expect(m.records.market).toHaveLength(1);
    expect(m.unmatched.map((u) => [u.rawName, u.reason])).toEqual([
      ['Chris Lane', 'AMBIGUOUS'],
      ['New Guy', 'NO_MATCH'],
    ]);
    // Yahoo positions are authoritative
    expect(m.identityUpdates[0]!.positions).toEqual(['PG', 'SG']);
    expect(m.identityUpdates[0]!.positionsSource).toBe('YAHOO');
  });
  it('explicit CREATE_UNMATCHED creates identities for no-match rows but still never merges ambiguous ones', () => {
    const first = plan(
      'PROJECTION',
      `${HEADER}\nChris Lane,AAA,PG,70,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\nChris Lane,BBB,C,70,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\n`,
    );
    const m = plan(
      'YAHOO_MARKET',
      'Player,Team,ADP\nChris Lane,ZZZ,40\nNew Guy,CCC,90\n',
      first.newIdentities,
      'CREATE_UNMATCHED',
    );
    expect(m.newIdentities.map((i) => i.canonicalName)).toEqual(['New Guy']);
    expect(m.unmatched).toHaveLength(1);
  });
  it('market fields are kept separately (never collapsed)', () => {
    const first = plan('PROJECTION', `${HEADER}\nA B,AAA,PG,70,0.5 (5/10),0.9 (9/10),2,20,5,8,1.5,0.3,3\n`);
    const m = plan(
      'YAHOO_MARKET',
      'Player,Team,XRank,Rank,Last 7 Days ADP\nA B,AAA,5,9,7.5\n',
      first.newIdentities,
    );
    expect(m.records.market[0]).toMatchObject({ yahooXRank: 5, yahooRank: 9, yahooAdp7d: 7.5 });
  });
  it('auto-maps common headers', () => {
    const map = autoMapColumns('YAHOO_MARKET', ['Player', 'Team', 'Pos', 'XRank', 'Rank', 'Last 7 Days ADP']);
    expect(map).toMatchObject({ name: 'Player', xrank: 'XRank', rank: 'Rank', adp: 'Last 7 Days ADP' });
  });
});
