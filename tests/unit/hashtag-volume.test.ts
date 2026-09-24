import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildContext } from '@/domain';
import { defaultConfig } from '@/domain/config/defaults';
import { autoMapColumns } from '@/domain/import/fields';
import { parseTable } from '@/domain/import/parse';
import { planImport } from '@/domain/import/plan';
import type { Dataset } from '@/domain/types/data';
import { league, seqId, synthPool } from '../helpers/fixtures';

/**
 * Data-pipeline fix: the Hashtag template carries FGM, FGA, FG%, FTM, FTA, FT%. Makes and attempts
 * must flow from the file into the canonical projection line (never reconstructed from %), and the
 * engine's percentage impact must then depend on volume.
 */
const cfg = defaultConfig();
const HEADER = readFileSync('data/templates/hashtag-projections.template.csv', 'utf8').trim();
const f1 = (x: number) => x.toFixed(1);
const f3 = (x: number) => x.toFixed(3);

function row(r: {
  rank: number;
  name: string;
  team: string;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  pts?: number;
}): string {
  // R#,ADP,PLAYER,TEAM,POS,GP,MPG,FGM,FGA,FG%,FTM,FTA,FT%,3PM,PTS,TREB,AST,STL,BLK,TO,W18..W21
  return [
    r.rank,
    '',
    r.name,
    r.team,
    'SF',
    72,
    30,
    f1(r.fgm),
    f1(r.fga),
    f3(r.fgm / r.fga),
    f1(r.ftm),
    f1(r.fta),
    f3(r.ftm / r.fta),
    1.6,
    r.pts ?? 15,
    5.5,
    3.5,
    1.0,
    0.6,
    1.8,
    3,
    4,
    3,
    4,
  ].join(',');
}

function importHashtag(text: string): { ds: Dataset; plan: ReturnType<typeof planImport> } {
  const table = parseTable(text);
  const plan = planImport({
    kind: 'PROJECTION',
    provider: 'hashtag',
    season: '2026-27',
    description: 'template',
    table,
    columnMap: autoMapColumns('PROJECTION', table.headers),
    identities: [],
    mappings: [],
    config: cfg,
    createPolicy: 'AUTO',
    batchId: 'hb',
    now: 'n',
    newId: seqId('hb'),
  });
  return {
    plan,
    ds: {
      identities: plan.newIdentities,
      market: [],
      projections: plan.records.projections,
      availability: [],
      context: [],
      playoffSchedule: [],
    },
  };
}

describe('Hashtag template → canonical makes/attempts → volume-sensitive impact', () => {
  const pool = synthPool(240).map((s, i) =>
    row({
      rank: i + 10,
      name: `Pool ${s.id}`,
      team: `T${i % 30}`,
      fgm: s.fgm!,
      fga: s.fga!,
      ftm: s.ftm!,
      fta: s.fta!,
    }),
  );
  const tested = [
    // Similar FT% (85.0% vs 85.7%), 10 vs ~1 attempts per game.
    row({ rank: 1, name: 'FT Volume', team: 'AAA', fgm: 6.0, fga: 13.0, ftm: 8.5, fta: 10.0 }),
    row({ rank: 2, name: 'FT Trickle', team: 'BBB', fgm: 6.0, fga: 13.0, ftm: 0.9, fta: 1.05 }),
    // Identical FG% (55.0%), 20 vs 2 attempts per game.
    row({ rank: 3, name: 'FG Volume', team: 'CCC', fgm: 11.0, fga: 20.0, ftm: 2.4, fta: 3.0 }),
    row({ rank: 4, name: 'FG Trickle', team: 'DDD', fgm: 1.1, fga: 2.0, ftm: 2.4, fta: 3.0 }),
  ];
  const { ds, plan } = importHashtag([HEADER, ...tested, ...pool].join('\n') + '\n');
  const ctx = buildContext(ds, league({ validationProviders: [] }), cfg);
  const byName = (n: string) => ctx.ranked.find((p) => p.player.name === n)!;

  it('the template has all six shooting columns', () => {
    for (const h of ['FGM', 'FGA', 'FG%', 'FTM', 'FTA', 'FT%']) expect(HEADER.split(',')).toContain(h);
  });

  it('makes/attempts flow unchanged into the projection line; all six raw fields are preserved', () => {
    expect(plan.rejected).toEqual([]);
    const l = byName('FT Volume').player.proj!;
    expect([l.fgm, l.fga, l.ftm, l.fta]).toEqual([6, 13, 8.5, 10]);
    expect(l.sourcePct).toEqual({ fg: 0.462, ft: 0.85 });
    expect(l.raw).toMatchObject({
      FGM: '6.0',
      FGA: '13.0',
      'FG%': '0.462',
      FTM: '8.5',
      FTA: '10.0',
      'FT%': '0.850',
    });
  });

  it('similar FT% with ~10× the attempts → materially larger FT impact and z', () => {
    const p = ctx.population.stats.pFT;
    expect(p).toBeLessThan(0.85);
    const vol = byName('FT Volume').stats;
    const tri = byName('FT Trickle').stats;
    expect(vol.ftImpact).toBeGreaterThan(5 * tri.ftImpact);
    expect(vol.rawZ.FT_PCT - tri.rawZ.FT_PCT).toBeGreaterThan(1);
  });

  it('identical FG% with 10× the attempts → 10× the FG impact', () => {
    const p = ctx.population.stats.pFG;
    expect(p).toBeLessThan(0.55);
    const vol = byName('FG Volume').stats;
    const tri = byName('FG Trickle').stats;
    expect(vol.fgImpact).toBeCloseTo(20 * (0.55 - p), 10);
    expect(tri.fgImpact).toBeCloseTo(2 * (0.55 - p), 10);
    expect(vol.rawZ.FG_PCT).toBeGreaterThan(tri.rawZ.FG_PCT + 1);
  });
});
