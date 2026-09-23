import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { computePopulationStats, computeRawZ, capZ, teamPct } from '@/domain/stats/zscores';
import { rosterTotals } from '@/domain/roster/profile';
import { league, run, synthDataset, synthLine, synthPool, withSynth } from '../helpers/fixtures';

const cfg = defaultConfig();

describe('z-scores', () => {
  const pool = synthPool(250).map((s) => synthLine(s));
  const stats = computePopulationStats(pool, cfg);

  it('counting categories: (x − μ)/σ', () => {
    const line = { ...synthLine({ id: 'x' }), pts: stats.mu.PTS + 2 * stats.sd.PTS };
    expect(computeRawZ(line, stats, 1e-9).rawZ.PTS).toBeCloseTo(2, 10);
  });

  it('TO is inverted: fewer turnovers → positive z', () => {
    const low = computeRawZ({ ...synthLine({ id: 'a' }), to: stats.mu.TO - stats.sd.TO }, stats, 1e-9).rawZ.TO;
    const high = computeRawZ({ ...synthLine({ id: 'b' }), to: stats.mu.TO + stats.sd.TO }, stats, 1e-9).rawZ.TO;
    expect(low).toBeCloseTo(1, 10);
    expect(high).toBeCloseTo(-1, 10);
  });

  it('league rate p = ΣM/ΣA, never a mean of percentages', () => {
    const lines = [
      { ...synthLine({ id: 'a' }), ftm: 9, fta: 10 },
      { ...synthLine({ id: 'b' }), ftm: 1, fta: 2 },
    ];
    const s = computePopulationStats(lines, cfg);
    expect(s.pFT).toBeCloseTo(10 / 12);
    expect(s.pFT).not.toBeCloseTo((0.9 + 0.5) / 2);
  });

  it('FT impact is volume-sensitive: 89% on 9 FTA ≫ 91% on 1 FTA (spec §14 fixture)', () => {
    const A = computeRawZ({ ...synthLine({ id: 'A' }), ftm: 0.91, fta: 1 }, stats, 1e-9);
    const B = computeRawZ({ ...synthLine({ id: 'B' }), ftm: 8.01, fta: 9 }, stats, 1e-9);
    expect(stats.pFT).toBeLessThan(0.89);
    expect(B.ftImpact).toBeGreaterThan(A.ftImpact * 3);
    expect(B.rawZ.FT_PCT).toBeGreaterThan(A.rawZ.FT_PCT + 1);
  });

  it('FG impact is volume-sensitive too', () => {
    const A = computeRawZ({ ...synthLine({ id: 'A' }), fgm: 0.62, fga: 1 }, stats, 1e-9);
    const B = computeRawZ({ ...synthLine({ id: 'B' }), fgm: 10.8, fga: 18 }, stats, 1e-9);
    expect(B.rawZ.FG_PCT).toBeGreaterThan(A.rawZ.FG_PCT + 1);
  });

  it('capped z keeps raw z intact', () => {
    const raw = { FG_PCT: 5, FT_PCT: -4, THREES: 1, PTS: 0, REB: 0, AST: 0, STL: 0, BLK: 0, TO: -3.5 };
    const capped = capZ(raw, 3);
    expect(capped).toMatchObject({ FG_PCT: 3, FT_PCT: -3, TO: -3, THREES: 1 });
    expect(raw.FG_PCT).toBe(5);
  });
});

describe('percentage aggregation', () => {
  it('roster FG%/FT% = ΣM/ΣA (never averaged); summed impact is the makes/attempts form', () => {
    const ds = synthDataset([
      ...synthPool(220),
      { id: 'X1', fgm: 9, fga: 10, ftm: 1, fta: 1 },
      { id: 'X2', fgm: 4, fga: 20, ftm: 9, fta: 10 },
    ]);
    const { ctx } = run(ds, league());
    const x1 = ctx.byId.get('X1')!;
    const x2 = ctx.byId.get('X2')!;
    const t = rosterTotals([x1, x2]);
    expect(t.fgPct).toBeCloseTo(13 / 30);
    expect(t.fgPct).not.toBeCloseTo((0.9 + 0.2) / 2);
    expect(t.ftPct).toBeCloseTo(10 / 11);
    const p = ctx.population.stats.pFG;
    expect(x1.stats.fgImpact + x2.stats.fgImpact).toBeCloseTo(30 * (13 / 30 - p), 10);
    expect(teamPct(0, 0)).toBeNull();
  });
});

describe('fantasy population', () => {
  it('P = teams × roster size + buffer, excludes GP < minGP, converges', () => {
    const ds = withSynth(synthDataset(synthPool(300)), [{ id: 'LOWGP', gp: 5, pts: 40 }]);
    const { ctx } = run(ds, league());
    expect(ctx.population.targetSize).toBe(14 * 13 + 20);
    expect(ctx.population.size).toBe(202);
    expect(ctx.population.memberIds).not.toContain('LOWGP');
    expect(ctx.population.converged).toBe(true);
    // still ranked (just not in the population)
    expect(ctx.byId.get('LOWGP')).toBeDefined();
  });

  it('buffer is configurable and league size changes P', () => {
    const cfg2 = { ...defaultConfig(), fantasyPopulationBuffer: 0 };
    const { ctx } = run(synthDataset(synthPool(300)), league({ teamCount: 10 }), undefined, cfg2);
    expect(ctx.population.size).toBe(130);
  });

  it('pool smaller than P uses everyone and a conservative replacement fallback', () => {
    const { ctx } = run(synthDataset(synthPool(100)), league());
    expect(ctx.population.size).toBe(100);
    expect(ctx.replacement.usedFallback).toBe(true);
    expect(ctx.warnings.map((w) => w.code)).toContain('REPLACEMENT_FALLBACK');
  });
});
