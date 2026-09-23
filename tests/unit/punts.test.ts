import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { computePunts, puntMultiplier, type PuntInputs } from '@/domain/punts/punts';
import { CATEGORIES, mapCategories, type Category, type CategoryRecord } from '@/domain/types/core';
import type { StaticPlayer } from '@/domain/types/evaluation';

const cfg = defaultConfig();

/** Minimal fake available player: only stats.cappedZ is read by recoverability. */
const fake = (z: Partial<CategoryRecord<number>>): StaticPlayer =>
  ({ stats: { cappedZ: { ...mapCategories(() => 0), ...z } } }) as unknown as StaticPlayer;

function inputs(opts: {
  d: Partial<CategoryRecord<number>>;
  k: number;
  supplyAST?: number; // capped z of AST among available players
  corr?: Partial<Record<Category, Partial<CategoryRecord<number>>>>;
  overrides?: PuntInputs['overrides'];
}): PuntInputs {
  const d = { ...mapCategories(() => 0), ...opts.d };
  const sd = mapCategories(() => 1);
  const sigmaT = mapCategories(() => Math.sqrt(opts.k));
  const B = mapCategories(() => 0);
  const s = mapCategories((c) => d[c] * sigmaT[c]);
  const correlations = mapCategories((c) =>
    mapCategories((c2) => (c === c2 ? 1 : (opts.corr?.[c]?.[c2] ?? opts.corr?.[c2]?.[c] ?? 0))),
  );
  const pool = Array.from({ length: 60 }, () => fake({ AST: opts.supplyAST ?? 0, TO: opts.supplyAST ?? 0 }));
  return {
    standing: { s, B, sigmaT, d },
    k: opts.k,
    totalRounds: 13,
    cohortMean: Array.from({ length: 14 }, () => mapCategories(() => 0)),
    teamSdBase: sd,
    correlations,
    availableByBpv: pool,
    teams: 14,
    overrides: opts.overrides ?? {},
  };
}

describe('punt weights', () => {
  it('TO weight curve 0.75 → 0.50 → 0.25 → 0.00', () => {
    expect(0.75 * puntMultiplier(0.3, cfg)).toBeCloseTo(0.75);
    expect(0.75 * puntMultiplier(0.6, cfg)).toBeCloseTo(0.5, 2);
    expect(0.75 * puntMultiplier(0.75, cfg)).toBeCloseTo(0.25, 2);
    expect(0.75 * puntMultiplier(0.95, cfg)).toBe(0);
  });
});

describe('punt confidence with recoverability (R2-3)', () => {
  const coherent = { AST: { PTS: -0.6, THREES: -0.5 } } as const;

  it('draft start: no punts', () => {
    const r = computePunts(inputs({ d: { AST: -3 }, k: 0 }), cfg);
    for (const c of CATEGORIES) expect(r.entries[c].pi).toBe(0);
  });

  it('picks 1–2 identify tendencies only (≤ 0.30)', () => {
    const r = computePunts(inputs({ d: { AST: -3 }, k: 2, supplyAST: 0 }), cfg);
    expect(r.entries.AST.pi).toBeLessThanOrEqual(0.3);
  });

  it('T-PUNT-REC-1: weak but fully recoverable category never becomes a punt, even with coherence', () => {
    const r = computePunts(
      inputs({ d: { AST: -2.5, PTS: 2, THREES: 2 }, k: 7, supplyAST: 3, corr: coherent }),
      cfg,
    );
    expect(r.entries.AST.deficit).toBe(1);
    expect(r.entries.AST.coherence).toBeGreaterThan(0.9);
    expect(r.entries.AST.recoverability).toBe(1);
    expect(r.entries.AST.pi).toBeLessThan(cfg.puntThresholds.soft);
    expect(r.m.AST).toBe(1);
  });

  it('T-PUNT-REC-2: hard punt requires every gate; flipping one gate caps π at 0.85', () => {
    const base = { d: { AST: -3, PTS: 2, THREES: 2 }, k: 8, supplyAST: 0, corr: coherent };
    const hard = computePunts(inputs(base), cfg).entries.AST;
    expect(hard.hardGatePassed).toBe(true);
    expect(hard.pi).toBeGreaterThanOrEqual(0.9);
    // recoverability 0.5
    const recHalf = computePunts(inputs({ ...base, supplyAST: 0 }), {
      ...cfg,
      hardPuntGate: { ...cfg.hardPuntGate, maxRecoverability: -0.01 },
    }).entries.AST;
    expect(recHalf.pi).toBeLessThanOrEqual(0.85);
    // coherence too low
    const noCoh = computePunts(inputs({ ...base, corr: {} }), cfg).entries.AST;
    expect(noCoh.hardGatePassed).toBe(false);
    expect(noCoh.pi).toBeLessThanOrEqual(0.85);
    // not enough draft progress
    const early = computePunts(inputs({ ...base, k: 5 }), cfg).entries.AST;
    expect(early.hardGatePassed).toBe(false);
    expect(early.pi).toBeLessThanOrEqual(0.85);
    // deficit below 0.8
    const mild = computePunts(inputs({ ...base, d: { ...base.d, AST: -1.6 } }), cfg).entries.AST;
    expect(mild.deficit).toBeLessThan(0.8);
    expect(mild.pi).toBeLessThanOrEqual(0.85);
  });

  it('recoverability computed from supply vs required', () => {
    const partial = computePunts(inputs({ d: { AST: -2 }, k: 7, supplyAST: 0.5 }), cfg).entries.AST;
    expect(partial.recoverability).toBeGreaterThan(0);
    expect(partial.recoverability).toBeLessThan(1);
    expect(partial.gain).toBeCloseTo(1.5);
  });

  it('multi-punt resistance damps secondary punts; warnings fire', () => {
    const r = computePunts(
      inputs({ d: { AST: -3, THREES: -3, FT_PCT: -3, PTS: 2 }, k: 9, supplyAST: 0 }),
      cfg,
    );
    const ranked = [...CATEGORIES].sort((a, b) => r.entries[b].piAuto - r.entries[a].piAuto);
    expect(r.entries[ranked[1]!].damping).toBe(0.6);
    expect(r.entries[ranked[2]!].damping).toBe(0.4);
    const three = computePunts(
      inputs({ d: {}, k: 3, overrides: { TO: 'HARD', FT_PCT: 'HARD', AST: 'SOFT' } }),
      cfg,
    );
    expect(three.warnings.map((w) => w.code)).toContain('MULTI_PUNT_BUILD_RISK');
    const two = computePunts(inputs({ d: {}, k: 3, overrides: { TO: 'HARD', FT_PCT: 'HARD' } }), cfg);
    expect(two.warnings.map((w) => w.code)).toEqual(['TWO_HARD_PUNTS']);
  });

  it('user overrides', () => {
    const r = computePunts(
      inputs({ d: { TO: -3 }, k: 8, overrides: { TO: 'NONE', FT_PCT: 'HARD', AST: 'SOFT' } }),
      cfg,
    );
    expect(r.entries.TO.pi).toBe(0);
    expect(r.entries.FT_PCT.pi).toBe(1);
    expect(r.m.FT_PCT).toBe(0);
    expect(r.entries.AST.pi).toBeGreaterThanOrEqual(0.6);
  });

  it('weak TO prior only acts when a TO deficit exists', () => {
    const none = computePunts(inputs({ d: { TO: 0 }, k: 6 }), cfg).entries.TO;
    expect(none.score).toBe(0);
    const some = computePunts(inputs({ d: { TO: -0.8 }, k: 6 }), cfg).entries.TO;
    expect(some.score).toBeGreaterThan(0.1 - 1e-9);
  });
});
