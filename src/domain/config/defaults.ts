import { StrategyConfigSchema, type StrategyConfig } from './strategyConfig';

/** Default strategy configuration. Mirrors docs/DESIGN.md §4 (revision 3). */
export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  version: 5,
  seasonGames: 82,

  numeric: { eps: 1e-9, minPopulationSize: 30, minSdSamples: 2 },

  fantasyPopulationBuffer: 20,
  populationMinGP: 20,
  populationMaxIterations: 8,
  replacementBandSize: 10,

  categoryZCap: 3.0,
  neutralTurnoverWeight: 1.0,
  initialTurnoverWeight: 0.75,

  perGameBlend: 0.5,
  replacementCoefficient: 0.35,

  fitPhaseWeightByRosterSize: [0.0, 0.25, 0.45, 0.65, 0.85, 1.0],

  categoryNeedWeight: 0.5,
  needStrongThreshold: 0.75,
  needFullDeficit: 2.0,
  categoryStateThresholds: { elite: 1.5, strong: 0.75, competitive: -0.5, weak: -1.25 },
  // Presentation only: rosters of ≤ 2 show tendencies, ≤ 4 never show CRITICAL, 5+ show the calculated state.
  categoryStateMaturity: { tendencyMaxRoster: 2, emergingMaxRoster: 4 },

  puntThresholds: { tendency: 0.3, soft: 0.5, hard: 0.9 },
  puntDeficitRange: { start: -0.5, full: -2.0 },
  puntCapByRosterSize: [0.0, 0.3, 0.3, 0.7, 0.7, 1.0],
  puntRampPicks: 5,
  puntScore: { recoverabilityFloor: 0.3, coherenceBase: 0.7 },
  recoverability: { competitiveTarget: -0.5, recoveryPicks: 3, candidateRounds: 3 },
  hardPuntGate: { minDeficit: 0.8, minCoherence: 0.5, maxRecoverability: 0.35, minRosterSize: 6 },
  hardGateCeiling: 0.85,
  puntOverrideSoftPi: 0.6,
  puntPriorAffinity: { TO: 0.1 },
  puntWeightCurve: [
    [0.4, 1.0],
    [0.6, 0.667],
    [0.75, 0.333],
    [0.9, 0.0],
  ],
  multiPuntDamping: [1.0, 0.6, 0.4],
  hardPuntLimitWarnings: { hardPuntsWarn: 2, multiPuntRisk: 3 },

  priorCategoryPreference: { PTS: 0.05, AST: 0.05, THREES: 0.05, STL: 0.05, FT_PCT: 0.05 },
  priorDecayRosterSize: 5,

  poolScarcity: { weight: 0.4, windowRounds: 3, needBlend: { base: 0.25, need: 0.75 } },
  nextPickScarcity: {
    weight: 0.25,
    windowRounds: 2,
    needBlend: { base: 0.25, need: 0.75 },
    gapFactor: { min: 0.5, max: 1.5 },
  },

  positionalWeight: 0.05,
  positionalDangerWeight: 0.2,
  multiPositionBonus: 0.01,
  multiPositionBonusCap: 0.02,

  redundancyWeight: 0.25,
  redundancySurplusRange: { start: 1.0, full: 2.0 },
  redundancyMaxFraction: 0.15,

  historySeasonWeights: [0.5, 0.3, 0.2],
  recurrenceWeights: { LOW: 0.25, MODERATE: 0.6, HIGH: 1.0, UNCLASSIFIED: 0.75 },
  chronicPatternPenalty: 0.05,
  ageRiskStart: 30,
  ageRiskPerYear: 0.01,
  // INJ (duration unknown) carries the value INJ rows received before v4, when they were read as OUT_SHORT.
  statusRisk: {
    HEALTHY: 0,
    DTD: 0.03,
    INJ: 0.08,
    OUT_SHORT: 0.08,
    OUT_LONG: 0.2,
    SUSPENDED: 0.02,
    OUT_SEASON: 1.0,
  },
  unknownHistoryRisk: 0.1,
  riskBands: { low: 85, moderate: 70, high: 50 },
  riskWeightsByRound: [
    { fromRound: 1, w: 0.6 },
    { fromRound: 4, w: 0.35 },
    { fromRound: 7, w: 0.15 },
    { fromRound: 11, w: 0.05 },
  ],
  durabilityResidualWeight: 0.5,

  playoffWeight: 0.03,
  playoffWeekWeights: { '18': 1, '19': 1, '20': 1, '21': 1 },

  upsideScaleZ: 2.0,
  upsideWeightsByRound: [
    { fromRound: 1, w: 0.05 },
    { fromRound: 4, w: 0.15 },
    { fromRound: 7, w: 0.4 },
    { fromRound: 11, w: 1.0 },
  ],
  minutesGrowthUpside: { minutesForMax: 10, maxScore: 0.5 },
  roleTagUpside: { STARTER_OPPORTUNITY: 0.5, INJURY_AWAY_ROLE: 0.4, DEPTH_CHART_RISE: 0.3, ROOKIE_ROLE: 0.3 },

  favoriteBonus: 0.01,
  avoidPenalty: 0.15,

  relScale: { referenceRounds: 2, minSpread: 0.5 },

  adpUncertainty: { minPicks: 3, fraction: 0.12 },
  survivalBandZ: { unlikely: -0.5, tossup: 0.5, likely: 1.5 },
  xrankDowngradeEnabled: true,
  unknownBandTreatAs: 'TOSSUP',
  marketTimingThresholds: {
    passBelowRel: 0.5,
    avoidPassBelowRel: 0.75,
    draftNowRel: 0.85,
    draftNowTossupRel: 0.95,
    draftNowTossupMissRel: 0.25,
    leanDraftRel: 0.75,
    leanDraftLikelyMissRel: 0.35,
  },

  pickPair: {
    candidates: 10,
    // Future next-pick value gets substantial but not equal weight: survival bands are ordinal
    // heuristics, not probabilities (Codex QA). Ordering also uses the LEAN-quality contender gate
    // and an ordinal "most at-risk first" tiebreak (STRATEGY_ENGINE.md §9.4).
    nextDiscount: 0.9,
    tieToleranceRel: 0.06,
    conservativeBands: ['SAFE', 'LIKELY'],
    neutralBands: ['SAFE', 'LIKELY', 'TOSSUP'],
  },

  disagreementThreshold: 0.75,
  disagreementGpThreshold: 15,
  pctConsistencyTolerance: 0.005,
};

export function defaultConfig(): StrategyConfig {
  return structuredClone(DEFAULT_STRATEGY_CONFIG);
}

/**
 * Bring a config saved by an older version up to the current shape without touching values the user set.
 * v3 → v4: adds statusRisk.INJ (default value). v4 → v5: adds categoryStateMaturity (presentation only).
 * Missing top-level keys take their default; every value the user set is kept.
 */
export function upgradeStoredConfig(stored: StrategyConfig): StrategyConfig {
  const statusRisk = { ...DEFAULT_STRATEGY_CONFIG.statusRisk, ...stored.statusRisk };
  return {
    ...structuredClone(DEFAULT_STRATEGY_CONFIG),
    ...stored,
    statusRisk,
    version: Math.max(stored.version, DEFAULT_STRATEGY_CONFIG.version),
  };
}

export type ConfigParseResult = { ok: true; config: StrategyConfig } | { ok: false; errors: string[] };

/** Validate an imported config. Unknown keys are stripped; missing keys fail validation. */
export function parseStrategyConfig(input: unknown): ConfigParseResult {
  const r = StrategyConfigSchema.safeParse(input);
  if (r.success) return { ok: true, config: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
}

/** Round-indexed weight lookup for `[{fromRound, w}]` tables. */
export function weightForRound(table: { fromRound: number; w: number }[], round: number): number {
  let w = table[0]?.w ?? 0;
  for (const e of table) if (round >= e.fromRound) w = e.w;
  return w;
}

/** Roster-size-indexed lookup; indexes past the end use the last value. */
export function byRosterSize(arr: readonly number[], k: number): number {
  if (arr.length === 0) return 0;
  const idx = Math.max(0, Math.min(arr.length - 1, Math.floor(k)));
  return arr[idx]!;
}
