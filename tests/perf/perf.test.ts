import { describe, expect, it } from 'vitest';
import { buildContext } from '@/domain';
import { defaultConfig } from '@/domain/config/defaults';
import { appendPick } from '@/domain/draft/replay';
import { evaluateDraft } from '@/domain/recommendations/engine';
import type { DraftEvent } from '@/domain/types/league';
import { league, synthDataset, synthPool } from '../helpers/fixtures';

describe('performance (§46)', () => {
  it('full recalculation (incl. pick-pair planning) for 500 players < 100 ms median', () => {
    const ds = synthDataset(synthPool(500));
    const ctx = buildContext(ds, league(), defaultConfig());
    let e: DraftEvent[] = [];
    for (let i = 0; i < 40; i++) {
      const r = appendPick(
        e,
        { playerId: `S${String(i * 3).padStart(4, '0')}`, by: i % 14 === 10 ? 'ME' : 'OTHER', at: 't' },
        14,
        13,
      );
      if (r.ok) e = r.events;
    }
    const input = { events: e, flags: {}, puntOverrides: {} };
    for (let i = 0; i < 3; i++) evaluateDraft(ctx, input); // warm-up
    const times: number[] = [];
    for (let i = 0; i < 7; i++) {
      const t = performance.now();
      evaluateDraft(ctx, input);
      times.push(performance.now() - t);
    }
    times.sort((a, b) => a - b);
    const median = times[3]!;
    console.log(`evaluateDraft median ${median.toFixed(1)} ms (500 players)`);
    expect(median).toBeLessThan(100);
  });
});
