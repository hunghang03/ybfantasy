import { describe, expect, it } from 'vitest';
import { defaultConfig, weightForRound } from '@/domain/config/defaults';
import { computeAvailability, riskAdjustment } from '@/domain/availability/availability';
import type { AvailabilitySeason, PlayerContext } from '@/domain/types/data';

const cfg = defaultConfig();
const season = (s: string, gp: number, abs: AvailabilitySeason['absences'] = []): AvailabilitySeason => ({
  canonicalPlayerId: 'p',
  season: s,
  importBatchId: 'b',
  gamesPlayed: gp,
  teamGames: 82,
  absences: abs,
});
const ctx = (over: Partial<PlayerContext> = {}): PlayerContext => ({
  canonicalPlayerId: 'p',
  age: 26,
  currentStatus: 'HEALTHY',
  ...over,
});

describe('availability score', () => {
  it('recurrence class matters: same games missed, HIGH ≫ LOW', () => {
    const low = computeAvailability(
      [season('2025', 62, [{ games: 20, recurrence: 'LOW' }])],
      ctx(),
      null,
      cfg,
    );
    const high = computeAvailability(
      [season('2025', 62, [{ games: 20, recurrence: 'HIGH' }])],
      ctx(),
      null,
      cfg,
    );
    expect(high.score).toBeLessThan(low.score);
    expect(low.rhoHist).toBeCloseTo((20 * 0.25) / 82);
  });

  it('three-season weighting 50/30/20 (renormalized when fewer seasons)', () => {
    const h = computeAvailability(
      [season('2025', 82), season('2024', 82 - 41), season('2023', 82)].map((s) =>
        s.gamesPlayed < 82 ? { ...s, absences: [{ games: 41, recurrence: 'HIGH' as const }] } : s,
      ),
      ctx(),
      null,
      cfg,
    );
    expect(h.terms.history).toBeCloseTo(0.3 * 0.5);
    const two = computeAvailability(
      [season('2025', 82), season('2024', 41, [{ games: 41, recurrence: 'HIGH' }])],
      ctx(),
      null,
      cfg,
    );
    expect(two.terms.history).toBeCloseTo((0.3 * 0.5) / 0.8);
  });

  it('no detail → unclassified weight; no history → default risk flagged', () => {
    const nd = computeAvailability([season('2025', 62)], ctx(), null, cfg);
    expect(nd.terms.history).toBeCloseTo((20 / 82) * 0.75);
    const none = computeAvailability([], ctx(), null, cfg);
    expect(none.terms.historyKnown).toBe(false);
    expect(none.terms.history).toBe(cfg.unknownHistoryRisk);
  });

  it('chronic pattern, age, current status and manual note add risk', () => {
    const hist = [
      season('2025', 70, [{ games: 12, recurrence: 'HIGH' }]),
      season('2024', 70, [{ games: 12, recurrence: 'HIGH' }]),
    ];
    const a = computeAvailability(
      hist,
      ctx({ age: 34, currentStatus: 'OUT_LONG', manualRiskDelta: 0.1 }),
      null,
      cfg,
    );
    expect(a.terms.chronic).toBe(0.05);
    expect(a.terms.age).toBeCloseTo(0.04);
    expect(a.terms.status).toBe(0.2);
    expect(a.terms.manual).toBe(0.1);
    expect(a.risk).toBe('VERY_HIGH');
    expect(computeAvailability([], ctx({ currentStatus: 'OUT_SEASON' }), null, cfg).score).toBe(0);
  });

  it('market status is used only when no context status exists', () => {
    expect(computeAvailability([], null, 'DTD', cfg).status).toBe('DTD');
    expect(computeAvailability([], ctx(), 'DTD', cfg).status).toBe('HEALTHY');
  });

  it('risk bands', () => {
    const s = (x: number) => computeAvailability([], ctx({ manualRiskDelta: x - 0.1 }), null, cfg).risk;
    expect(s(0.1)).toBe('LOW');
    expect(s(0.2)).toBe('MODERATE');
    expect(s(0.4)).toBe('HIGH');
    expect(
      computeAvailability([], ctx({ currentStatus: 'OUT_LONG', manualRiskDelta: 0.3 }), null, cfg).risk,
    ).toBe('VERY_HIGH');
  });
});

describe('round-dependent risk (R3-1)', () => {
  it('weights fall by round and the term is never positive', () => {
    expect(weightForRound(cfg.riskWeightsByRound, 1)).toBe(0.6);
    expect(weightForRound(cfg.riskWeightsByRound, 5)).toBe(0.35);
    expect(weightForRound(cfg.riskWeightsByRound, 9)).toBe(0.15);
    expect(weightForRound(cfg.riskWeightsByRound, 13)).toBe(0.05);
    expect(riskAdjustment(0.4, 8, 1, cfg)).toBeCloseTo(-0.6 * 0.4 * 8);
    expect(riskAdjustment(0, 8, 1, cfg)).toBe(0);
    expect(riskAdjustment(0.4, 8, 12, cfg)).toBeGreaterThan(riskAdjustment(0.4, 8, 1, cfg));
  });

  it('residual weight applies only to historical risk; current status is applied in full', () => {
    const hist = [season('2025', 60, [{ games: 22, recurrence: 'HIGH' }])];
    const r0 = computeAvailability(hist, ctx({ currentStatus: 'OUT_LONG' }), null, {
      ...cfg,
      durabilityResidualWeight: 0,
    });
    const r5 = computeAvailability(hist, ctx({ currentStatus: 'OUT_LONG' }), null, {
      ...cfg,
      durabilityResidualWeight: 0.5,
    });
    const r1 = computeAvailability(hist, ctx({ currentStatus: 'OUT_LONG' }), null, {
      ...cfg,
      durabilityResidualWeight: 1,
    });
    expect(r0.rhoEff).toBeCloseTo(r0.rhoNow);
    expect(r0.rhoNow).toBeCloseTo(0.2);
    expect(r5.rhoEff).toBeCloseTo(0.5 * r5.rhoHist + 0.2);
    expect(r1.rhoEff).toBeCloseTo(r1.rhoFull);
    // Display score always uses the full index.
    expect(r0.score).toBe(r1.score);
  });
});
