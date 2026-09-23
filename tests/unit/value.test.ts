import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { computeValue, type ReplacementLevel } from '@/domain/value/value';
import { mapCategories } from '@/domain/types/core';
import { league, run, synthDataset, synthPool, withSynth } from '../helpers/fixtures';

const cfg = defaultConfig();
const repl = (L: number, R = -3): ReplacementLevel => ({
  perGame: R,
  zRepl: mapCategories(() => -0.5),
  missedGameLoss: L,
  bandIds: [],
  usedFallback: false,
});

describe('availability-adjusted value (R2-2)', () => {
  it('ESV = PGV at a = 1; LossPerMissedGame ≥ 0', () => {
    const v = computeValue(5, 82, repl(7), cfg);
    expect(v.expectedSeasonVAR).toBeCloseTo(v.perGameVAR);
    expect(v.missedGameLoss).toBeGreaterThanOrEqual(0);
  });

  it('T-MISS-1(b)/T-MISS-2: ESV is non-increasing as GP falls, for any PGV sign', () => {
    for (const pg of [8, 2, -3, -6, -10]) {
      let prev = Number.POSITIVE_INFINITY;
      const atFull = computeValue(pg, 82, repl(7), cfg).expectedSeasonVAR;
      for (let gp = 82; gp >= 0; gp -= 2) {
        const esv = computeValue(pg, gp, repl(7), cfg).expectedSeasonVAR;
        expect(esv).toBeLessThanOrEqual(prev + 1e-12);
        expect(esv).toBeLessThanOrEqual(atFull + 1e-12);
        prev = esv;
      }
    }
  });

  it('T-MISS-1(a): TO does not enter the missed-game loss — same PGV, very different TO → identical ESV', () => {
    // Two players with the same PGV (REB compensates for TO) but very different turnovers.
    const base = synthPool(260);
    let reb = 5.5;
    let ctx = run(synthDataset(base), league()).ctx;
    for (let iter = 0; iter < 6; iter++) {
      const ds = withSynth(synthDataset(base), [
        { id: 'LOWTO', to: 1.0, reb: 5.5, gp: 60 },
        { id: 'HIGHTO', to: 2.8, reb, gp: 60 },
      ]);
      ctx = run(ds, league()).ctx;
      const d = ctx.byId.get('LOWTO')!.value.perGameRaw - ctx.byId.get('HIGHTO')!.value.perGameRaw;
      reb += d * ctx.population.stats.sd.REB;
    }
    const a = ctx.byId.get('LOWTO')!.value;
    const b = ctx.byId.get('HIGHTO')!.value;
    expect(ctx.byId.get('HIGHTO')!.stats.rawZ.TO).toBeLessThan(ctx.byId.get('LOWTO')!.stats.rawZ.TO - 1.5);
    expect(Math.abs(a.perGameVAR - b.perGameVAR)).toBeLessThan(1e-3);
    expect(Math.abs(a.missedGameLoss - b.missedGameLoss)).toBeLessThan(1e-3);
    expect(Math.abs(a.expectedSeasonVAR - b.expectedSeasonVAR)).toBeLessThan(1e-3);
  });

  it('T-MISS-1(c): an all-zero player gains nothing from zero turnovers once games are missed', () => {
    const ds = withSynth(synthDataset(synthPool(260)), [
      { id: 'ZERO', pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, threes: 0, to: 0, fgm: 0, fga: 0, ftm: 0, fta: 0, gp: 40 },
    ]);
    const z = run(ds, league()).ctx.byId.get('ZERO')!;
    const full = computeValue(z.value.perGameRaw, 82, run(ds, league()).ctx.replacement, cfg).expectedSeasonVAR;
    expect(z.value.expectedSeasonVAR).toBeLessThanOrEqual(full);
  });

  it('T-MISS-3: L uses only positive counting categories of the replacement band', () => {
    const { ctx } = run(synthDataset(synthPool(260)), league());
    const L = ctx.replacement.missedGameLoss;
    // Recompute from the band: TO / FGA / FTA are not part of it.
    const band = ctx.replacement.bandIds.map((id) => ctx.byId.get(id)!.player.proj!);
    const s = ctx.population.stats;
    const mean = (f: (x: (typeof band)[number]) => number) => band.reduce((a, x) => a + f(x), 0) / band.length;
    const expected =
      mean((x) => x.threes) / s.sd.THREES +
      mean((x) => x.pts) / s.sd.PTS +
      mean((x) => x.reb) / s.sd.REB +
      mean((x) => x.ast) / s.sd.AST +
      mean((x) => x.stl) / s.sd.STL +
      mean((x) => x.blk) / s.sd.BLK;
    expect(L).toBeCloseTo(expected, 10);
  });

  it('replacement coefficient: more streaming recovery → smaller missed-game loss', () => {
    const lo = computeValue(5, 60, repl(7), { ...cfg, replacementCoefficient: 0.1 }).expectedSeasonVAR;
    const hi = computeValue(5, 60, repl(7), { ...cfg, replacementCoefficient: 0.9 }).expectedSeasonVAR;
    expect(hi).toBeGreaterThan(lo);
    expect(hi).toBeLessThan(computeValue(5, 82, repl(7), cfg).expectedSeasonVAR);
  });

  it('BPV blends per-game and season value (never pure season totals)', () => {
    const v = computeValue(5, 41, repl(7), cfg);
    expect(v.basePlayerValue).toBeCloseTo(v.perGameVAR + 0.5 * (v.expectedSeasonVAR - v.perGameVAR));
    expect(v.scaleU).toBeGreaterThanOrEqual(1);
  });
});
