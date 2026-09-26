import { z } from 'zod';

/**
 * StrategyConfig — the single source of every tunable weight in the engine.
 * See docs/DESIGN.md §4 and STRATEGY_ENGINE.md. No engine module may hard-code these values.
 */

const num = z.number().finite();
const nonNeg = num.min(0);
const unit = num.min(0).max(1);
const roundWeights = z
  .array(z.object({ fromRound: z.number().int().min(1), w: nonNeg }))
  .min(1)
  .refine((a) => a[0]?.fromRound === 1, 'first entry must start at round 1')
  .refine((a) => a.every((x, i) => i === 0 || x.fromRound > a[i - 1]!.fromRound), 'rounds must increase');
const phaseArray = z.array(nonNeg).min(1);
const bandName = z.enum(['GONE', 'UNLIKELY', 'TOSSUP', 'LIKELY', 'SAFE', 'UNKNOWN']);

export const StrategyConfigSchema = z.object({
  version: z.number().int(),
  seasonGames: num.positive(),

  numeric: z.object({
    eps: num.positive(),
    minPopulationSize: z.number().int().min(2),
    minSdSamples: z.number().int().min(2),
  }),

  fantasyPopulationBuffer: z.number().int().min(0),
  populationMinGP: nonNeg,
  populationMaxIterations: z.number().int().min(1),
  replacementBandSize: z.number().int().min(1),

  categoryZCap: num.positive(),
  neutralTurnoverWeight: nonNeg,
  initialTurnoverWeight: nonNeg,

  perGameBlend: unit,
  replacementCoefficient: unit,

  fitPhaseWeightByRosterSize: phaseArray,

  categoryNeedWeight: nonNeg,
  needStrongThreshold: num,
  needFullDeficit: num.positive(),
  categoryStateThresholds: z.object({ elite: num, strong: num, competitive: num, weak: num }),
  // Added in config v5 (presentation only); older configs and backups get the shipped default.
  categoryStateMaturity: z
    .object({ tendencyMaxRoster: z.number().int().min(0), emergingMaxRoster: z.number().int().min(0) })
    .default({ tendencyMaxRoster: 2, emergingMaxRoster: 4 }),

  puntThresholds: z.object({ tendency: unit, soft: unit, hard: unit }),
  puntDeficitRange: z.object({ start: num, full: num }),
  puntCapByRosterSize: z.array(unit).min(1),
  puntRampPicks: num.positive(),
  puntScore: z.object({ recoverabilityFloor: unit, coherenceBase: unit }),
  recoverability: z.object({
    competitiveTarget: num,
    recoveryPicks: z.number().int().min(1),
    candidateRounds: num.positive(),
  }),
  hardPuntGate: z.object({
    minDeficit: unit,
    minCoherence: unit,
    maxRecoverability: unit,
    minRosterSize: z.number().int().min(0),
  }),
  hardGateCeiling: unit,
  puntOverrideSoftPi: unit,
  puntPriorAffinity: z.record(z.string(), nonNeg),
  puntWeightCurve: z.array(z.tuple([unit, unit])).min(1),
  multiPuntDamping: z.array(unit).min(1),
  hardPuntLimitWarnings: z.object({
    hardPuntsWarn: z.number().int().min(1),
    multiPuntRisk: z.number().int().min(1),
  }),

  priorCategoryPreference: z.record(z.string(), nonNeg),
  priorDecayRosterSize: num.positive(),

  poolScarcity: z.object({
    weight: nonNeg,
    windowRounds: num.positive(),
    needBlend: z.object({ base: nonNeg, need: nonNeg }),
  }),
  nextPickScarcity: z.object({
    weight: nonNeg,
    windowRounds: num.positive(),
    needBlend: z.object({ base: nonNeg, need: nonNeg }),
    gapFactor: z.object({ min: nonNeg, max: nonNeg }),
  }),

  positionalWeight: nonNeg,
  positionalDangerWeight: nonNeg,
  multiPositionBonus: nonNeg,
  multiPositionBonusCap: nonNeg,

  redundancyWeight: nonNeg,
  redundancySurplusRange: z.object({ start: num, full: num }),
  redundancyMaxFraction: unit,

  historySeasonWeights: z.array(nonNeg).min(1),
  recurrenceWeights: z.object({ LOW: nonNeg, MODERATE: nonNeg, HIGH: nonNeg, UNCLASSIFIED: nonNeg }),
  chronicPatternPenalty: nonNeg,
  ageRiskStart: num,
  ageRiskPerYear: nonNeg,
  statusRisk: z.object({
    HEALTHY: unit,
    DTD: unit,
    // Added in config v4; older saved configs and backups lack it, so it defaults to the shipped value.
    INJ: unit.default(0.08),
    OUT_SHORT: unit,
    OUT_LONG: unit,
    OUT_SEASON: unit,
    SUSPENDED: unit,
  }),
  unknownHistoryRisk: unit,
  riskBands: z.object({ low: num, moderate: num, high: num }),
  riskWeightsByRound: roundWeights,
  durabilityResidualWeight: unit,
  // Added in config v6 (QA/display flag only); older configs and backups get the shipped default.
  availabilityGapFlag: z
    .object({ minSeasons: z.number().int().min(1), gpDifference: z.number().min(0) })
    .default({ minSeasons: 2, gpDifference: 8 }),

  playoffWeight: nonNeg,
  playoffWeekWeights: z.record(z.string(), nonNeg),

  upsideScaleZ: nonNeg,
  upsideWeightsByRound: roundWeights,
  minutesGrowthUpside: z.object({ minutesForMax: num.positive(), maxScore: unit }),
  roleTagUpside: z.object({
    STARTER_OPPORTUNITY: unit,
    INJURY_AWAY_ROLE: unit,
    DEPTH_CHART_RISE: unit,
    ROOKIE_ROLE: unit,
  }),

  favoriteBonus: nonNeg,
  avoidPenalty: nonNeg,

  relScale: z.object({ referenceRounds: num.positive(), minSpread: num.positive() }),

  adpUncertainty: z.object({ minPicks: num.positive(), fraction: nonNeg }),
  survivalBandZ: z.object({ unlikely: num, tossup: num, likely: num }),
  xrankDowngradeEnabled: z.boolean(),
  unknownBandTreatAs: bandName,
  marketTimingThresholds: z.object({
    passBelowRel: unit,
    avoidPassBelowRel: unit,
    draftNowRel: unit,
    draftNowTossupRel: unit,
    draftNowTossupMissRel: nonNeg,
    leanDraftRel: unit,
    leanDraftLikelyMissRel: nonNeg,
  }),

  pickPair: z.object({
    candidates: z.number().int().min(1).max(50),
    nextDiscount: unit,
    tieToleranceRel: nonNeg,
    conservativeBands: z.array(bandName).min(1),
    neutralBands: z.array(bandName).min(1),
  }),

  disagreementThreshold: nonNeg,
  disagreementGpThreshold: nonNeg,
  pctConsistencyTolerance: nonNeg,
});

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;
