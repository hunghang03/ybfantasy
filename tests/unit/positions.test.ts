import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import { maxMatching, positionFraction, positionReport, slotInstances } from '@/domain/positions/positions';
import { DEFAULT_ROSTER } from '@/domain/types/league';
import type { Position } from '@/domain/types/core';

const cfg = defaultConfig();
const slots = slotInstances(DEFAULT_ROSTER);

describe('roster slot feasibility', () => {
  it('default Yahoo active slots', () => {
    expect(slots).toHaveLength(10);
  });

  it('matching uses flexible slots (G/F/UTIL)', () => {
    const three: Position[][] = [['PG'], ['PG'], ['PG']];
    expect(maxMatching(three, slots)).toBe(3); // PG, G, UTIL
    const five: Position[][] = [['PG'], ['PG'], ['PG'], ['PG'], ['PG']];
    expect(maxMatching(five, slots)).toBe(4); // PG, G, UTIL, UTIL
  });

  it('late draft with no centers → significant C urgency', () => {
    const roster: Position[][] = [['PG'], ['SG'], ['PG', 'SG'], ['SF'], ['PF'], ['SF', 'PF'], ['PG'], ['SG'], ['SF'], ['PF'], ['SG']];
    const rep = positionReport(roster, DEFAULT_ROSTER, 13);
    expect(rep.remainingPicks).toBe(2);
    expect(rep.required.C).toBe(2);
    expect(rep.urgency.C).toBe(1);
    expect(rep.feasible).toBe(true);
    const f = positionFraction(['C'], rep, cfg);
    expect(f.fraction).toBeCloseTo(0.05 + 0.2);
    const early = positionReport([['PG']], DEFAULT_ROSTER, 13);
    expect(early.required.C).toBe(2);
    expect(positionFraction(['C'], early, cfg).fraction).toBeLessThan(0.05);
  });

  it('detects an infeasible roster', () => {
    const roster: Position[][] = Array.from({ length: 12 }, () => ['PG']);
    const rep = positionReport(roster, DEFAULT_ROSTER, 13);
    expect(rep.feasible).toBe(false);
  });

  it('multi-position flexibility bonus is small and capped', () => {
    const rep = positionReport([], DEFAULT_ROSTER, 13);
    expect(positionFraction(['PG'], rep, cfg).multiPosFraction).toBe(0);
    expect(positionFraction(['PG', 'SG'], rep, cfg).multiPosFraction).toBe(0.01);
    expect(positionFraction(['PG', 'SG', 'SF', 'PF'], rep, cfg).multiPosFraction).toBe(0.02);
  });

  it('normal positional adjustment stays within 0–5%', () => {
    const rep = positionReport([['C'], ['C']], DEFAULT_ROSTER, 13);
    for (const p of ['PG', 'SG', 'SF', 'PF', 'C'] as Position[]) expect(positionFraction([p], rep, cfg).fraction).toBeLessThanOrEqual(0.05);
  });
});
