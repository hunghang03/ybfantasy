/**
 * Numeric safety helpers (DESIGN §5.0, R2-7). Every division / standard deviation in the engine
 * goes through these so outputs are always finite.
 */

export const DEFAULT_EPS = 1e-9;

export function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** num / den, or `fallback` when |den| <= eps or either side is non-finite. */
export function safeDiv(num: number, den: number, fallback: number, eps = DEFAULT_EPS): number {
  if (!Number.isFinite(num) || !Number.isFinite(den) || Math.abs(den) <= eps) return fallback;
  const r = num / den;
  return Number.isFinite(r) ? r : fallback;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/** Population SD (divide by n). Returns 0 when fewer than `minSamples` values. */
export function safeSd(values: readonly number[], minSamples = 2): number {
  if (values.length < minSamples) return 0;
  const m = mean(values);
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  const sd = Math.sqrt(s / values.length);
  return Number.isFinite(sd) ? sd : 0;
}

/** (x − mean) / sd, or 0 when sd <= eps. */
export function zOrZero(x: number, m: number, sd: number, eps = DEFAULT_EPS): number {
  return safeDiv(x - m, sd, 0, eps);
}

/** Clamp; NaN maps to `lo`. */
export function clamp(x: number, lo: number, hi: number): number {
  if (Number.isNaN(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

export function clamp01(x: number): number {
  return clamp(x, 0, 1);
}

export function sum(values: readonly number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

/** Pearson correlation; 0 if either SD is ~0. */
export function pearson(a: readonly number[], b: readonly number[], eps = DEFAULT_EPS): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i]! - ma;
    const db = b[i]! - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  return clamp(safeDiv(cov, Math.sqrt(va * vb), 0, eps), -1, 1);
}

/** Piecewise-linear interpolation over sorted (x, y) points; flat outside the range. */
export function interpolate(points: readonly (readonly [number, number])[], x: number): number {
  if (points.length === 0) return 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (x <= x1) {
      const t = safeDiv(x - x0, x1 - x0, 0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

/** Deterministic string compare for tiebreaks. */
export function cmpId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Replace every non-finite number inside a plain object tree with 0, collecting the paths.
 * Used as the last-line finite-output contract on evaluations.
 */
export function sanitizeFinite<T>(value: T, path = '', bad: string[] = []): { value: T; bad: string[] } {
  const walk = (v: unknown, p: string): unknown => {
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) {
        bad.push(p);
        return 0;
      }
      return Object.is(v, -0) ? 0 : v;
    }
    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${p}[${i}]`));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = walk(x, p ? `${p}.${k}` : k);
      return out;
    }
    return v;
  };
  return { value: walk(value, path) as T, bad };
}
