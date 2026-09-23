import type { StrategyConfig } from '../config/strategyConfig';
import { computeAvailability } from '../availability/availability';
import { computeDisagreement, dataConfidence } from '../confidence/confidence';
import { cmpId, mean, pearson, safeSd } from '../numeric/safe';
import { playoffFractions } from '../playoffs/playoff';
import { buildPopulation, type PopulationResult } from '../stats/population';
import { capZ, computeRawZ, weightedSum } from '../stats/zscores';
import { mapCategories, type Category, type CategoryRecord } from '../types/core';
import type { EngineWarning, EnginePlayer, StaticPlayer } from '../types/evaluation';
import { rosterSize, type LeagueProfile } from '../types/league';
import { computeUpside } from '../upside/upside';
import {
  baseWeights,
  computeReplacement,
  computeValue,
  perGameRaw,
  type ReplacementLevel,
} from '../value/value';
import { supply } from '../scarcity/scarcity';

/**
 * Draft-independent context (DESIGN §1 stage 1). Depends only on the dataset, the league's size /
 * roster / primary provider, and config. It never reads draft events, and market data is carried
 * through untouched (it is never used in any value computed here).
 */
export interface StaticContext {
  status: 'OK' | 'INSUFFICIENT_DATA';
  league: LeagueProfile;
  config: StrategyConfig;
  teams: number;
  rounds: number;
  population: PopulationResult;
  replacement: ReplacementLevel;
  baseWeights: CategoryRecord<number>;
  /** All players with a primary projection, sorted by BPV desc (tiebreak id). */
  ranked: StaticPlayer[];
  byId: Map<string, StaticPlayer>;
  /** Players without a primary projection (shown, never ranked). */
  unranked: EnginePlayer[];
  /** cumulativeExpected[k][c] = B_c(k) (k = 0..rounds). */
  cumulativeExpected: CategoryRecord<number>[];
  /** cohortMean[j][c], j = 1..rounds (index 0 unused = zeros). */
  cohortMean: CategoryRecord<number>[];
  /** SD of ẑ_c among the top N·rosterSize by BPV (team-level spread base). */
  teamSdBase: CategoryRecord<number>;
  correlations: CategoryRecord<CategoryRecord<number>>;
  poolStartSupply: CategoryRecord<number>;
  poolWindow: number;
  warnings: EngineWarning[];
}

export function buildStaticContext(
  players: readonly EnginePlayer[],
  league: LeagueProfile,
  config: StrategyConfig,
): StaticContext {
  const eps = config.numeric.eps;
  const teams = league.teamCount;
  const rounds = rosterSize(league.roster);
  const target = teams * rounds + config.fantasyPopulationBuffer;
  const warnings: EngineWarning[] = [];
  const population = buildPopulation(players, target, config);
  const stats = population.stats;
  if (!population.converged)
    warnings.push({
      code: 'POP_NOT_CONVERGED',
      message: 'Population selection did not reach a fixed point; last iteration used.',
      severity: 'info',
    });
  for (const c of stats.degenerate)
    warnings.push({
      code: 'DEGENERATE_CATEGORY',
      message: `Category ${c} has no spread in the population; its z-scores are 0.`,
      severity: 'warn',
    });

  const b = baseWeights(config);
  const withProj = players.filter((p) => p.proj !== null);
  const unranked = players.filter((p) => p.proj === null);
  const memberSet = new Set(population.memberIds);

  // Stage A: z-scores and PG for every projected player.
  const pre = withProj.map((p) => {
    const { rawZ, fgImpact, ftImpact } = computeRawZ(p.proj!, stats, eps);
    const cappedZ = capZ(rawZ, config.categoryZCap);
    return {
      p,
      rawZ,
      cappedZ,
      fgImpact,
      ftImpact,
      pg: perGameRaw(cappedZ, b),
      n9: weightedSum(rawZ, config.neutralTurnoverWeight),
    };
  });

  // Replacement band: eligible players ranked by PG, positions P+1 … P+band.
  const eligibleRanked = pre
    .filter((x) => x.p.proj!.gp >= config.populationMinGP)
    .sort((x, y) => y.pg - x.pg || cmpId(x.p.id, y.p.id))
    .map((x) => ({ id: x.p.id, pg: x.pg, cappedZ: x.cappedZ, proj: x.p.proj! }));
  const replacement = computeReplacement(eligibleRanked, population.size, stats, config);
  if (replacement.usedFallback)
    warnings.push({
      code: 'REPLACEMENT_FALLBACK',
      message: 'Player pool is not larger than the fantasy population; conservative replacement level used.',
      severity: 'warn',
    });

  const neutralSd = safeSd(
    pre.filter((x) => memberSet.has(x.p.id)).map((x) => x.n9),
    config.numeric.minSdSamples,
  );
  const neutralOrder = [...pre].sort((x, y) => y.n9 - x.n9 || cmpId(x.p.id, y.p.id));
  const neutralRank = new Map(neutralOrder.map((x, i) => [x.p.id, i + 1]));

  const teamPlayoff = new Map<string, number>();
  for (const p of players) if (p.team && p.playoffGames !== null) teamPlayoff.set(p.team, p.playoffGames);
  const playoff = playoffFractions(teamPlayoff, config);
  if (teamPlayoff.size === 0)
    warnings.push({
      code: 'NO_PLAYOFF_SCHEDULE',
      message: 'No playoff schedule imported; playoff adjustment is 0.',
      severity: 'info',
    });

  const ranked: StaticPlayer[] = pre.map((x) => {
    const value = computeValue(x.pg, x.p.proj!.gp, replacement, config);
    const availability = computeAvailability(x.p.history, x.p.context, x.p.market?.status ?? null, config);
    const up = computeUpside(x.p.proj, x.p.context, config);
    const disagreement = computeDisagreement(x.p, stats, neutralSd, config);
    const conf = dataConfidence(x.p, disagreement);
    return {
      player: x.p,
      stats: {
        rawZ: x.rawZ,
        cappedZ: x.cappedZ,
        fgImpact: x.fgImpact,
        ftImpact: x.ftImpact,
        neutral9Cat: x.n9,
        neutralRank: neutralRank.get(x.p.id)!,
      },
      value,
      availability,
      upsideScore: up.score,
      upsideSources: up.sources,
      playoffPct: playoff.fractionFor(x.p.playoffGames),
      inPopulation: memberSet.has(x.p.id),
      confidence: conf.confidence,
      disagreement,
      warnings: conf.warnings,
    };
  });
  ranked.sort((x, y) => y.value.basePlayerValue - x.value.basePlayerValue || cmpId(x.player.id, y.player.id));
  const byId = new Map(ranked.map((r) => [r.player.id, r]));

  // Cohorts from the population by BPV (expected competition, §6.1).
  const popByBpv = ranked.filter((r) => r.inPopulation);
  const cohortMean: CategoryRecord<number>[] = [mapCategories(() => 0)];
  let lastNonEmpty: CategoryRecord<number> = mapCategories(() => 0);
  for (let j = 1; j <= rounds; j++) {
    const slice = popByBpv.slice((j - 1) * teams, j * teams);
    if (slice.length > 0) lastNonEmpty = mapCategories((c) => mean(slice.map((s) => s.stats.cappedZ[c])));
    cohortMean.push(lastNonEmpty);
  }
  const cumulativeExpected: CategoryRecord<number>[] = [mapCategories(() => 0)];
  for (let k = 1; k <= rounds; k++) {
    const prev = cumulativeExpected[k - 1]!;
    const cm = cohortMean[k]!;
    cumulativeExpected.push(mapCategories((c) => prev[c] + cm[c]));
  }
  const top = popByBpv.slice(0, teams * rounds);
  const teamSdBase = mapCategories((c) =>
    safeSd(
      top.map((s) => s.stats.cappedZ[c]),
      config.numeric.minSdSamples,
    ),
  );

  const popZ = mapCategories((c) => popByBpv.map((s) => s.stats.cappedZ[c]));
  const correlations = mapCategories((c) =>
    mapCategories((c2: Category) => (c === c2 ? 1 : pearson(popZ[c], popZ[c2], eps))),
  );

  const poolWindow = Math.max(1, Math.round(config.poolScarcity.windowRounds * teams));
  const poolStartSupply = supply(ranked.slice(0, poolWindow), replacement.zRepl);

  const status = population.eligibleCount < config.numeric.minPopulationSize ? 'INSUFFICIENT_DATA' : 'OK';
  if (status === 'INSUFFICIENT_DATA')
    warnings.push({
      code: 'INSUFFICIENT_DATA',
      message: `Only ${population.eligibleCount} players have a usable primary projection (minimum ${config.numeric.minPopulationSize}). Import projections to get rankings.`,
      severity: 'critical',
    });

  return {
    status,
    league,
    config,
    teams,
    rounds,
    population,
    replacement,
    baseWeights: b,
    ranked,
    byId,
    unranked,
    cumulativeExpected,
    cohortMean,
    teamSdBase,
    correlations,
    poolStartSupply,
    poolWindow,
    warnings,
  };
}
