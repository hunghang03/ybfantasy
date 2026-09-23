import type { StrategyConfig } from '../config/strategyConfig';
import { cmpId } from '../numeric/safe';
import type { YahooMarket } from '../types/data';
import { BAND_ORDER, type StaticPlayer, type SurvivalBand } from '../types/evaluation';
import type { TimingLabel } from '../types/league';

/**
 * Market layer (DESIGN §8.2–8.5). Survival bands are ORDINAL heuristics: this module never maps a
 * band to a number, weight or probability. It only orders and tests membership.
 */

export interface MarketRef {
  value: number | null;
  source: 'ADP' | 'XRANK' | 'RANK' | 'NONE';
}

export function marketRef(m: YahooMarket | null): MarketRef {
  if (!m) return { value: null, source: 'NONE' };
  if (m.yahooAdp7d !== null && m.yahooAdp7d > 0) return { value: m.yahooAdp7d, source: 'ADP' };
  if (m.yahooXRank !== null && m.yahooXRank > 0) return { value: m.yahooXRank, source: 'XRANK' };
  if (m.yahooRank !== null && m.yahooRank > 0) return { value: m.yahooRank, source: 'RANK' };
  return { value: null, source: 'NONE' };
}

export function bandWidth(ref: number, config: StrategyConfig): number {
  return Math.max(config.adpUncertainty.minPicks, config.adpUncertainty.fraction * ref);
}

export function lowerBand(b: SurvivalBand): SurvivalBand {
  const i = BAND_ORDER.indexOf(b);
  return i <= 0 ? b : BAND_ORDER[i - 1]!;
}

export interface BandResult {
  band: SurvivalBand;
  bandBeforeXrank: SurvivalBand;
  zS: number | null;
}

/**
 * Band of a player's chance to last until my following pick P1.
 * P1 = null (my final pick, or draft over) → every known-market player is UNLIKELY: waiting is impossible.
 */
export function survivalBand(
  market: YahooMarket | null,
  current: number,
  p1: number | null,
  config: StrategyConfig,
): BandResult {
  const ref = marketRef(market);
  if (ref.value === null) return { band: 'UNKNOWN', bandBeforeXrank: 'UNKNOWN', zS: null };
  const w = bandWidth(ref.value, config);
  if (ref.value < current - w) return { band: 'GONE', bandBeforeXrank: 'GONE', zS: null };
  if (p1 === null) return { band: 'UNLIKELY', bandBeforeXrank: 'UNLIKELY', zS: null };
  const zS = (ref.value - p1) / w;
  const t = config.survivalBandZ;
  let band: SurvivalBand;
  if (zS <= t.unlikely) band = 'UNLIKELY';
  else if (zS <= t.tossup) band = 'TOSSUP';
  else if (zS <= t.likely) band = 'LIKELY';
  else band = 'SAFE';
  const before = band;
  if (
    config.xrankDowngradeEnabled &&
    ref.source === 'ADP' &&
    (band === 'LIKELY' || band === 'SAFE') &&
    market!.yahooXRank !== null &&
    market!.yahooXRank < p1
  )
    band = lowerBand(band);
  return { band, bandBeforeXrank: before, zS };
}

/** Resolve UNKNOWN for tier membership only. */
export function tierBand(band: SurvivalBand, config: StrategyConfig): SurvivalBand {
  return band === 'UNKNOWN' ? config.unknownBandTreatAs : band;
}

/** Available players ordered by market reference (ADP → XRank → Rank); no-market players last by BPV. */
export function marketOrder(available: readonly StaticPlayer[]): StaticPlayer[] {
  return [...available].sort((a, b) => {
    const ra = marketRef(a.player.market).value;
    const rb = marketRef(b.player.market).value;
    if (ra !== null && rb !== null) return ra - rb || b.value.basePlayerValue - a.value.basePlayerValue || cmpId(a.player.id, b.player.id);
    if (ra !== null) return -1;
    if (rb !== null) return 1;
    return b.value.basePlayerValue - a.value.basePlayerValue || cmpId(a.player.id, b.player.id);
  });
}

export interface LabelInput {
  ddpRel: number;
  band: SurvivalBand;
  missRel: number;
  avoid: boolean;
}

/** Timing label rules (DESIGN §8.4). First matching rule wins; the rule id is returned for QA. */
export function timingLabel(i: LabelInput, config: StrategyConfig): { label: TimingLabel; rule: string } {
  const t = config.marketTimingThresholds;
  const { ddpRel, band, missRel } = i;
  if (ddpRel < t.passBelowRel) return { label: 'PASS', rule: 'P1: ddpRel below pass threshold' };
  if (i.avoid && ddpRel < t.avoidPassBelowRel) return { label: 'PASS', rule: 'P1: avoided and ddpRel below avoid threshold' };
  if (ddpRel >= t.draftNowRel && (band === 'GONE' || band === 'UNLIKELY'))
    return { label: 'DRAFT_NOW', rule: 'D1: strong value and unlikely to last' };
  if (ddpRel >= t.draftNowTossupRel && band === 'TOSSUP') return { label: 'DRAFT_NOW', rule: 'D2: top value and toss-up' };
  if (ddpRel >= t.draftNowRel && band === 'TOSSUP' && missRel >= t.draftNowTossupMissRel)
    return { label: 'DRAFT_NOW', rule: 'D3: toss-up with high miss cost' };
  if (ddpRel >= t.leanDraftRel && (band === 'GONE' || band === 'UNLIKELY' || band === 'TOSSUP' || band === 'UNKNOWN'))
    return { label: 'LEAN_DRAFT', rule: 'L1: good value, at risk (or unknown market)' };
  if (band === 'LIKELY' && missRel >= t.leanDraftLikelyMissRel)
    return { label: 'LEAN_DRAFT', rule: 'L2: likely to last but costly to miss' };
  if (band === 'SAFE') return { label: 'SAFE_WAIT', rule: 'S1: substantial ADP cushion' };
  return { label: 'WAIT', rule: 'W1: otherwise' };
}

/** Value over market (display only): marketRef − ourOverallRank. */
export function valueOverMarket(ref: number | null, current: number, ddpRank: number): number | null {
  if (ref === null) return null;
  return ref - (current - 1 + ddpRank);
}
