import type { Category, CategoryRecord, InjuryStatus, Position } from './core';
import type { AvailabilitySeason, PlayerContext, ProjectionLine, YahooMarket } from './data';
import type { TimingLabel } from './league';

/** Joined per-player view used by the engine (primary projection + separate sources). */
export interface EnginePlayer {
  id: string;
  name: string;
  team: string | null;
  positions: Position[];
  positionsSource: 'YAHOO' | 'PROVIDER' | 'MANUAL' | 'NONE';
  proj: ProjectionLine | null;
  validation: ProjectionLine[];
  market: YahooMarket | null;
  history: AvailabilitySeason[];
  context: PlayerContext | null;
  /** Weighted playoff-week games of the player's NBA team, or null when unknown. */
  playoffGames: number | null;
}

export type SurvivalBand = 'GONE' | 'UNLIKELY' | 'TOSSUP' | 'LIKELY' | 'SAFE' | 'UNKNOWN';
/** Ordinal order used for comparisons. UNKNOWN is resolved via config before comparisons. */
export const BAND_ORDER: readonly SurvivalBand[] = ['GONE', 'UNLIKELY', 'TOSSUP', 'LIKELY', 'SAFE'];

export type CategoryState = 'ELITE' | 'STRONG' | 'COMPETITIVE' | 'WEAK' | 'CRITICAL' | 'SOFT_PUNT' | 'PUNT';
/**
 * How much a category state can be trusted given the roster size: a one- or two-player roster only shows a
 * direction (TENDENCY), 3–4 players may show a weakness (EMERGING), 5+ uses the normal state (FULL).
 */
export type StateMaturity = 'TENDENCY' | 'EMERGING' | 'FULL';
/** What the UI shows. Early rosters use direction labels instead of alarming ones. */
export type DisplayState = CategoryState | 'LEANING_STRONG' | 'EVEN' | 'LEANING_WEAK';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type DataConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface StatBlock {
  rawZ: CategoryRecord<number>;
  cappedZ: CategoryRecord<number>;
  fgImpact: number;
  ftImpact: number;
  neutral9Cat: number;
  neutralRank: number;
}

export interface ValueBlock {
  perGameRaw: number; // PG = Σ b_c ẑ
  perGameVAR: number; // PGV
  availabilityFraction: number; // a
  missedGameLoss: number; // LossPerMissedGame
  expectedSeasonVAR: number; // ESV
  basePlayerValue: number; // BPV
  scaleU: number; // U
}

export interface AvailabilityBlock {
  score: number;
  /** Calculated level (used by calibration/scenario logic). */
  risk: RiskLevel;
  /**
   * UNKNOWN instead of LOW when no season of history exists (durability not observed); otherwise the calculated
   * band. History coverage is shown independently of it (terms.historyKnown → "MODERATE · NO HIST").
   */
  displayRisk: RiskLevel | 'UNKNOWN';
  /** AVAILABILITY_PROJECTION_GAP (QA/display only; never scored). */
  projectionGap?: {
    projectedGp: number;
    historicalGpRate: number;
    seasons: number;
    difference: number;
  } | null;
  rhoHist: number;
  rhoNow: number;
  rhoFull: number;
  rhoEff: number;
  terms: {
    history: number;
    chronic: number;
    age: number;
    status: number;
    manual: number;
    seasonsUsed: number;
    historyKnown: boolean;
    /** Share of the season weights backed by real history (1 = three seasons; 0.5 = only the latest). */
    historyCoverage: number;
  };
  status: InjuryStatus;
}

export interface DisagreementReport {
  provider: string;
  delta: number;
  gpDelta: number;
  flagged: boolean;
  perCategory: CategoryRecord<number>;
}

/** Draft-independent per-player values (static context). */
export interface StaticPlayer {
  player: EnginePlayer;
  stats: StatBlock;
  value: ValueBlock;
  availability: AvailabilityBlock;
  upsideScore: number;
  upsideSources: string[];
  playoffPct: number; // in [−playoffWeight, +playoffWeight], multiplied by U in DDP
  inPopulation: boolean;
  confidence: DataConfidence;
  disagreement: DisagreementReport[];
  warnings: string[];
}

export interface FitBlock {
  need: number;
  punt: number;
  poolScarcity: number;
  position: number;
  multiPos: number;
  redundancy: number;
  teamFit: number;
  perCategory: CategoryRecord<{ need: number; punt: number; poolScarcity: number }>;
}

export interface AdjustmentBlock {
  playoff: number;
  upside: number;
  risk: number;
  userPref: number;
}

export interface MarketBlock {
  adp: number | null;
  xrank: number | null;
  rank: number | null;
  marketRef: number | null;
  marketRefSource: 'ADP' | 'XRANK' | 'RANK' | 'NONE';
  /** UNAVAILABLE when there is no Yahoo market record: no timing/urgency is derived (statistical rank = ddpRank). */
  urgency: 'AVAILABLE' | 'UNAVAILABLE';
  band: SurvivalBand;
  bandBeforeXrank: SurvivalBand;
  zS: number | null;
  valueOverMarket: number | null;
  nextPickScarcity: number;
  perCategoryNextPick: CategoryRecord<number>;
}

export interface PlanningBlock {
  pairScore: number;
  nextBestConservative: {
    playerId: string | null;
    ddpRaw: number;
    tier: 'CONSERVATIVE' | 'NEUTRAL' | 'FALLBACK' | 'NONE';
  };
  missCost: number;
  missRel: number;
}

export interface PlayerEvaluation {
  playerId: string;
  name: string;
  team: string | null;
  positions: Position[];
  stats: StatBlock;
  value: ValueBlock;
  availability: AvailabilityBlock;
  fit: FitBlock;
  adjustments: AdjustmentBlock;
  ddpRaw: number;
  ddpRel: number;
  ddpScore: number;
  ddpRank: number;
  market: MarketBlock;
  planning: PlanningBlock | null;
  label: TimingLabel;
  labelRule: string;
  priority: number;
  priorityRank: number;
  fitTags: Category[];
  confidence: DataConfidence;
  warnings: string[];
  disagreement: DisagreementReport[];
  flags: { favorite: boolean; avoid: boolean; doNotDraft: boolean; lockTarget: boolean };
}

export interface CategoryProfileEntry {
  category: Category;
  rosterSum: number; // s_c
  expected: number; // B_c(k)
  teamSd: number; // σT_c(k)
  d: number;
  /** Calculated state (unchanged by roster size; never used in DDP math). */
  state: CategoryState;
  baseState: Exclude<CategoryState, 'SOFT_PUNT' | 'PUNT'>;
  /** Sample-size-aware presentation of `state` (see StateMaturity). */
  displayState: DisplayState;
  maturity: StateMaturity;
  need: number;
  surplus: number;
  poolScarcity: number; // qP
  nextPickScarcity: number; // qN
  punt: PuntEntry;
  weightMultiplier: number; // m_c
  effectiveWeight: number; // b_c · m_c
}

export interface PuntEntry {
  deficit: number; // D
  coherence: number; // Coh
  recoverability: number; // Rec
  required: number;
  gain: number;
  score: number;
  piAuto: number; // after cap/gate, before damping
  piAutoUngated: number;
  hardGatePassed: boolean;
  damping: number;
  pi: number; // final, after damping and override
  override: 'AUTO' | 'NONE' | 'SOFT' | 'HARD';
  level: 'NONE' | 'TENDENCY' | 'SOFT' | 'HARD';
}

export interface RosterTotals {
  perGame: { pts: number; reb: number; ast: number; stl: number; blk: number; threes: number; to: number };
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  fgPct: number | null;
  ftPct: number | null;
}

export interface PositionReport {
  feasible: boolean;
  remainingPicks: number;
  required: Record<Position, number>;
  urgency: Record<Position, number>;
  filledSlots: number;
  activeSlots: number;
}

export interface AdvisorOutput {
  header: string;
  build: string;
  priority: Category[];
  priorityLine: string;
  reason: string;
  recommendedId: string | null;
  recommendedName: string | null;
  recommendedWhy: string;
  avoidLine: string;
  warnings: string[];
}

export interface EngineWarning {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'critical';
}
