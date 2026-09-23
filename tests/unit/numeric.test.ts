import { describe, expect, it } from 'vitest';
import { clamp, interpolate, pearson, safeDiv, safeSd, sanitizeFinite, zOrZero } from '@/domain/numeric/safe';

describe('numeric guards (T-FINITE-2)', () => {
  it('safeDiv returns fallback on ~0 or non-finite denominators', () => {
    expect(safeDiv(1, 0, 7)).toBe(7);
    expect(safeDiv(1, 1e-12, 7)).toBe(7);
    expect(safeDiv(1, Number.NaN, 7)).toBe(7);
    expect(safeDiv(Number.POSITIVE_INFINITY, 1, 7)).toBe(7);
    expect(safeDiv(1, 2, 7)).toBe(0.5);
    expect(safeDiv(1, -2, 7)).toBe(-0.5);
  });
  it('safeSd needs ≥ 2 samples; constant → 0', () => {
    expect(safeSd([5])).toBe(0);
    expect(safeSd([3, 3, 3])).toBe(0);
    expect(safeSd([1, 3])).toBe(1);
  });
  it('zOrZero is 0 when sd ≈ 0', () => {
    expect(zOrZero(10, 5, 0)).toBe(0);
    expect(zOrZero(10, 5, 5)).toBe(1);
  });
  it('clamp maps NaN to lower bound', () => {
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
  });
  it('pearson handles constant series', () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
  });
  it('interpolate is flat outside and linear inside', () => {
    const pts: [number, number][] = [
      [0.4, 1],
      [0.6, 0.667],
      [0.75, 0.333],
      [0.9, 0],
    ];
    expect(interpolate(pts, 0)).toBe(1);
    expect(interpolate(pts, 1)).toBe(0);
    expect(interpolate(pts, 0.5)).toBeCloseTo(0.8335);
  });
  it('sanitizeFinite repairs nested non-finite values', () => {
    const r = sanitizeFinite({ a: 1, b: { c: Number.NaN, d: [Number.POSITIVE_INFINITY, 2] } });
    expect(r.value).toEqual({ a: 1, b: { c: 0, d: [0, 2] } });
    expect(r.bad).toEqual(['b.c', 'b.d[0]']);
  });
});
