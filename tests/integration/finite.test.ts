import { describe, expect, it } from 'vitest';
import type { Dataset } from '@/domain/types/data';
import { appendResync } from '@/domain/draft/replay';
import { emptyDraft, league, run, synthDataset, synthPool, withSynth, type SynthSpec } from '../helpers/fixtures';
import type { DraftEvaluation } from '@/domain/recommendations/engine';

const LABELS = ['DRAFT_NOW', 'LEAN_DRAFT', 'WAIT', 'SAFE_WAIT', 'PASS'];

function assertFinite(x: unknown, path = ''): void {
  if (typeof x === 'number') {
    if (!Number.isFinite(x)) throw new Error(`non-finite at ${path}: ${x}`);
    return;
  }
  if (x instanceof Map) return;
  if (Array.isArray(x)) x.forEach((v, i) => assertFinite(v, `${path}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) assertFinite(v, `${path}.${k}`);
}

function check(ev: DraftEvaluation) {
  assertFinite(ev.players);
  assertFinite(ev.profile);
  assertFinite(ev.relScale);
  assertFinite(ev.totals.perGame);
  for (const p of ev.players) {
    expect(p.ddpRel).toBeGreaterThanOrEqual(0);
    expect(p.ddpRel).toBeLessThanOrEqual(1);
    expect(p.ddpScore).toBeGreaterThanOrEqual(0);
    expect(p.ddpScore).toBeLessThanOrEqual(100);
    expect(LABELS).toContain(p.label);
  }
  expect(ev.finiteRepairs).toEqual([]);
}

const same = (n: number, over: Partial<SynthSpec> = {}): SynthSpec[] => Array.from({ length: n }, (_, i) => ({ id: `P${i}`, adp: i + 1, ...over }));

const cases: [string, () => Dataset][] = [
  ['all identical players (σ = 0 everywhere)', () => synthDataset(same(250))],
  ['one constant category', () => synthDataset(synthPool(250).map((s) => ({ ...s, blk: 1 })))],
  ['zero FGA/FTA for everyone', () => synthDataset(synthPool(250).map((s) => ({ ...s, fgm: 0, fga: 0, ftm: 0, fta: 0 })))],
  ['exactly 30 eligible players', () => synthDataset(synthPool(30))],
  ['fewer than 30 players (INSUFFICIENT_DATA)', () => synthDataset(synthPool(10))],
  ['P larger than the pool', () => synthDataset(synthPool(120))],
  ['single player', () => synthDataset(synthPool(1))],
  ['everyone missing ADP', () => synthDataset(synthPool(250, 3, { withMarket: false }))],
  ['GP = 0 for many', () => synthDataset(synthPool(250).map((s, i) => ({ ...s, gp: i % 3 === 0 ? 0 : s.gp })))],
  ['extreme values', () => withSynth(synthDataset(synthPool(250)), [{ id: 'HUGE', pts: 1e6, reb: 1e6, ast: 1e6, stl: 1e6, blk: 1e6, threes: 1e6, to: 1e6, fgm: 1e6, fga: 1e6, ftm: 1e6, fta: 1e6, adp: 1 }])],
  ['empty dataset', () => ({ identities: [], market: [], projections: [], availability: [], context: [], playoffSchedule: [] })],
];

describe('T-FINITE-1: all normalization stays finite on pathological datasets', () => {
  for (const [name, make] of cases) {
    it(name, () => {
      const ds = make();
      const { ev } = run(ds, league());
      check(ev);
      // also late in the draft, final pick and completed draft
      for (const pick of [100, 179, 183]) {
        const r = appendResync([], pick, 14, 13, 't');
        if (!r.ok) throw new Error(r.error);
        check(run(ds, league(), { ...emptyDraft(), events: r.events }).ev);
      }
    });
  }

  it('INSUFFICIENT_DATA produces no recommendation', () => {
    const { ev } = run(synthDataset(synthPool(10)), league());
    expect(ev.status).toBe('INSUFFICIENT_DATA');
    expect(ev.recommendedId).toBeNull();
  });

  it('all DDP negative / all equal keeps rel in [0,1]', () => {
    const { ev } = run(synthDataset(same(250)), league());
    expect(new Set(ev.players.map((p) => p.ddpRaw)).size).toBe(1);
    expect(ev.relScale.spread).toBeGreaterThanOrEqual(0.5);
  });
});
