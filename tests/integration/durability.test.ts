import { describe, expect, it } from 'vitest';
import { defaultConfig } from '@/domain/config/defaults';
import type { AvailabilitySeason, Dataset } from '@/domain/types/data';
import { appendResync } from '@/domain/draft/replay';
import {
  emptyDraft,
  league,
  run,
  synthDataset,
  synthPool,
  withSynth,
  type SynthSpec,
} from '../helpers/fixtures';

/**
 * T-DUR-1..3 (rev 3): elite 62-GP injury-risk player vs good 72-GP player vs lower-value 78-GP durable
 * player. The model must stay moderately aggressive about early-round durability without crushing
 * the elite per-game player twice for the same injury history.
 */
const trio: SynthSpec[] = [
  {
    id: 'ELITE_FRAGILE',
    positions: ['SF', 'PF'],
    gp: 62,
    pts: 27,
    reb: 8,
    ast: 5.5,
    stl: 1.5,
    blk: 1.0,
    threes: 2.8,
    to: 2.6,
    fgm: 9.6,
    fga: 18.5,
    ftm: 5.9,
    fta: 6.8,
  },
  {
    id: 'GOOD_SOLID',
    positions: ['SF', 'PF'],
    gp: 72,
    pts: 21,
    reb: 6.5,
    ast: 4.3,
    stl: 1.2,
    blk: 0.8,
    threes: 2.3,
    to: 2.1,
    fgm: 7.6,
    fga: 15.8,
    ftm: 3.9,
    fta: 4.7,
  },
  {
    id: 'DURABLE_LOWER',
    positions: ['SF', 'PF'],
    gp: 78,
    pts: 17,
    reb: 5.6,
    ast: 3.4,
    stl: 1.0,
    blk: 0.6,
    threes: 1.9,
    to: 1.7,
    fgm: 6.2,
    fga: 13.4,
    ftm: 2.9,
    fta: 3.6,
  },
];
const hist = (id: string, seasons: [number, number, 'LOW' | 'MODERATE' | 'HIGH'][]): AvailabilitySeason[] =>
  seasons.map(([season, missed, rec]) => ({
    canonicalPlayerId: id,
    season: `${season}-${String((season + 1) % 100).padStart(2, '0')}`, // 2025 → 2025-26
    importBatchId: 'syn',
    gamesPlayed: 82 - missed,
    teamGames: 82,
    absences: missed ? [{ games: missed, recurrence: rec }] : [],
  }));

function dataset(): Dataset {
  const ds = withSynth(synthDataset(synthPool(260)), trio);
  ds.availability = [
    ...hist('ELITE_FRAGILE', [
      [2025, 25, 'HIGH'],
      [2024, 24, 'HIGH'],
      [2023, 26, 'HIGH'],
    ]),
    ...hist('GOOD_SOLID', [
      [2025, 10, 'MODERATE'],
      [2024, 12, 'MODERATE'],
      [2023, 6, 'LOW'],
    ]),
    ...hist('DURABLE_LOWER', [
      [2025, 3, 'LOW'],
      [2024, 2, 'LOW'],
      [2023, 4, 'LOW'],
    ]),
  ];
  return ds;
}

function evalAtRound(round: number, residual = 0.5) {
  const cfg = { ...defaultConfig(), durabilityResidualWeight: residual };
  const lg = league({ draftPosition: 1 });
  const draft = emptyDraft();
  if (round > 1) {
    const r = appendResync([], (round - 1) * 14 + 1, 14, 13, 't');
    if (!r.ok) throw new Error(r.error);
    draft.events = r.events;
  }
  const { ev } = run(dataset(), lg, draft, cfg);
  const get = (id: string) => ev.byId.get(id)!;
  return { ev, ef: get('ELITE_FRAGILE'), gs: get('GOOD_SOLID'), dl: get('DURABLE_LOWER') };
}

describe('durability calibration (T-DUR)', () => {
  it('fixtures have the intended profile', () => {
    const { ef, gs, dl } = evalAtRound(1);
    expect(ef.value.perGameVAR).toBeGreaterThan(gs.value.perGameVAR);
    expect(gs.value.perGameVAR).toBeGreaterThan(dl.value.perGameVAR);
    expect(ef.availability.rhoHist).toBeGreaterThan(0.3);
    expect(ef.availability.rhoHist).toBeLessThan(0.4);
    expect(gs.availability.rhoHist).toBeLessThan(0.15);
    expect(dl.availability.rhoHist).toBeLessThan(0.05);
  });

  it('T-DUR-1: round 1 — elite fragile still beats durable-lower; penalty moderate; gap to good-solid shrinks', () => {
    const { ef, gs, dl } = evalAtRound(1);
    // (a)
    expect(ef.ddpRaw).toBeGreaterThan(dl.ddpRaw);
    // (b) combined availability penalty = ESV blend loss + RiskAdj, as a share of per-game VAR
    const penalty = ef.value.perGameVAR - ef.value.basePlayerValue - ef.adjustments.risk;
    const share = penalty / ef.value.perGameVAR;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.4);
    // (c) durability narrows the elite-vs-good gap materially
    const perGameGap = ef.value.perGameVAR - gs.value.perGameVAR;
    const ddpGap = ef.ddpRaw - gs.ddpRaw;
    expect(ddpGap).toBeLessThan(0.75 * perGameGap);
    if (process.env.PRINT_CALIBRATION)
      console.log(
        JSON.stringify({
          share,
          perGameGap,
          ddpGap,
          ef: [ef.value.perGameVAR, ef.value.basePlayerValue, ef.adjustments.risk, ef.ddpRaw],
          gs: [gs.value.perGameVAR, gs.value.basePlayerValue, gs.adjustments.risk, gs.ddpRaw],
          dl: [dl.value.perGameVAR, dl.value.basePlayerValue, dl.adjustments.risk, dl.ddpRaw],
        }),
      );
  });

  it('T-DUR-2: residual weight is honored; ESV never changes with it', () => {
    const r0 = evalAtRound(1, 0).ef;
    const r5 = evalAtRound(1, 0.5).ef;
    const r1 = evalAtRound(1, 1).ef;
    expect(r5.adjustments.risk).toBeLessThan(r0.adjustments.risk);
    expect(r1.adjustments.risk).toBeLessThan(r5.adjustments.risk);
    expect(r0.value).toEqual(r5.value);
    expect(r1.value).toEqual(r5.value);
    expect(r0.adjustments.risk).toBeCloseTo(0); // healthy now, history ignored at weight 0
  });

  it('T-DUR-3: late rounds — risk shrinks ≥ 10× and order follows BPV', () => {
    const early = evalAtRound(1).ef;
    const late = evalAtRound(12);
    expect(Math.abs(early.adjustments.risk)).toBeGreaterThanOrEqual(
      10 * Math.abs(late.ef.adjustments.risk) - 1e-9,
    );
    const byBpv = [late.ef, late.gs, late.dl]
      .sort((a, b) => b.value.basePlayerValue - a.value.basePlayerValue)
      .map((x) => x.playerId);
    const byDdp = [late.ef, late.gs, late.dl].sort((a, b) => b.ddpRaw - a.ddpRaw).map((x) => x.playerId);
    expect(byDdp).toEqual(byBpv);
  });

  it('a healthy replacement-level veteran does not rank highly just for durability', () => {
    const ds = withSynth(dataset(), [
      {
        id: 'VET',
        gp: 82,
        pts: 9,
        reb: 3.5,
        ast: 2,
        stl: 0.6,
        blk: 0.3,
        threes: 1,
        to: 1,
        fgm: 3.4,
        fga: 7.8,
        ftm: 1.2,
        fta: 1.5,
      },
    ]);
    ds.availability.push(
      ...hist('VET', [
        [2025, 0, 'LOW'],
        [2024, 0, 'LOW'],
        [2023, 0, 'LOW'],
      ]),
    );
    const { ev } = run(ds, league());
    const vet = ev.byId.get('VET')!;
    expect(vet.adjustments.risk).toBe(0);
    expect(vet.ddpRank).toBeGreaterThan(100);
  });
});
