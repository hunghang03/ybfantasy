import type { StrategyConfig } from '@/domain/config/strategyConfig';
import { buildContext } from '@/domain';
import { cmpId } from '@/domain/numeric/safe';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/domain/types/core';
import type { Dataset } from '@/domain/types/data';
import type { StaticPlayer } from '@/domain/types/evaluation';
import type { LeagueProfile } from '@/domain/types/league';

/**
 * Cross-source calibration report (docs/CALIBRATION.md). Compares the engine's NEUTRAL rankings (no
 * roster, no market) with Yahoo XRank / Rank / L7 ADP and the primary provider's rank / ADP.
 * It never changes any weight — it only measures and classifies disagreement.
 *
 * Delta convention: delta = otherRank − engineRank. Positive → the engine values the player MORE
 * than the other source (ranks him earlier).
 */

export const DISAGREE = 15;
export const MAJOR = 30;

export type OutlierClass =
  | 'SOURCE_DATA_MISMATCH'
  | 'GP_DURABILITY_ADJUSTMENT'
  | 'PERCENTAGE_VOLUME_DIFFERENCE'
  | 'INTENTIONAL_ENGINE_BEHAVIOR'
  | 'PUNT_TEAM_FIT_ADJUSTMENT'
  | 'POSITIONAL_SCARCITY_ADJUSTMENT'
  | 'LIKELY_ENGINE_DEFECT';

export interface CalibrationRow {
  playerId: string;
  player: string;
  team: string | null;
  positions: string;
  yahooXRank: number | null;
  yahooRank: number | null;
  yahooL7Adp: number | null;
  yahooReviewFields: string[];
  providerRank: number | null;
  providerAdp: number | null;
  engineBpvRank: number;
  engineSeasonRank: number;
  enginePerGameRank: number;
  engineNeutral9CatRank: number;
  bpv: number;
  gp: number;
  strengths: string[];
  weaknesses: string[];
  risk: string;
  availabilityScore: number;
  disagreementFlags: string[];
  deltaEngineVsProvider: number | null;
  deltaEngineVsXRank: number | null;
  deltaYahooL7AdpVsProviderAdp: number | null;
  severity: 'NONE' | 'DISAGREE' | 'MAJOR';
  tentativeClasses: OutlierClass[];
  evidence: string[];
}

export interface CalibrationReport {
  generatedFor: { teams: number; rosterSize: number; primaryProvider: string; validationProviders: string[] };
  population: { size: number; converged: boolean; replacementPerGame: number; missedGameLoss: number };
  rows: CalibrationRow[];
  summary: {
    rows: number;
    disagree: number;
    major: number;
    byClass: Record<string, number>;
    medianAbsDeltaProvider: number | null;
    medianAbsDeltaXRank: number | null;
    medianAbsDeltaAdp: number | null;
  };
  notes: string[];
}

function rankMap(items: StaticPlayer[], key: (p: StaticPlayer) => number): Map<string, number> {
  const sorted = [...items].sort((a, b) => key(b) - key(a) || cmpId(a.player.id, b.player.id));
  return new Map(sorted.map((p, i) => [p.player.id, i + 1]));
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function buildCalibrationReport(args: {
  dataset: Dataset;
  league: LeagueProfile;
  config: StrategyConfig;
  teamMismatchIds?: ReadonlySet<string>;
  topN?: number;
}): CalibrationReport {
  const { dataset, league, config } = args;
  const topN = args.topN ?? 200;
  const ctx = buildContext(dataset, league, config);
  const all = ctx.ranked;
  const bpvRank = rankMap(all, (p) => p.value.basePlayerValue);
  const seasonRank = rankMap(all, (p) => p.value.expectedSeasonVAR);
  const pgRank = rankMap(all, (p) => p.value.perGameVAR);
  const n9Rank = rankMap(all, (p) => p.stats.neutral9Cat);

  // "Fantasy-relevant": union of engine top-N, Yahoo XRank ≤ N and provider rank ≤ N.
  const relevant = all.filter(
    (p) =>
      bpvRank.get(p.player.id)! <= topN ||
      (p.player.market?.yahooXRank ?? Infinity) <= topN ||
      (p.player.proj?.providerRank ?? Infinity) <= topN,
  );

  const rows: CalibrationRow[] = relevant.map((p) => {
    const id = p.player.id;
    const m = p.player.market;
    const proj = p.player.proj!;
    const eng = bpvRank.get(id)!;
    const dH = proj.providerRank != null ? proj.providerRank - eng : null;
    const dX = m?.yahooXRank != null ? m.yahooXRank - eng : null;
    const dA = m?.yahooAdp7d != null && proj.providerAdp != null ? m.yahooAdp7d - proj.providerAdp : null;
    const worst = Math.max(Math.abs(dH ?? 0), Math.abs(dX ?? 0));
    const severity = worst >= MAJOR ? 'MAJOR' : worst >= DISAGREE ? 'DISAGREE' : 'NONE';
    const strengths = CATEGORIES.filter((c) => p.stats.cappedZ[c] >= 1).map((c) => CATEGORY_LABEL[c]);
    const weaknesses = CATEGORIES.filter((c) => p.stats.cappedZ[c] <= -1).map((c) => CATEGORY_LABEL[c]);
    const disagreementFlags = [
      ...p.disagreement.filter((d) => d.flagged).map((d) => `projection Δ vs ${d.provider}`),
      ...(args.teamMismatchIds?.has(id) ? ['team mismatch'] : []),
      ...(m?.meta?.reviewFields.length ? [`Yahoo review: ${m.meta.reviewFields.join('/')}`] : []),
      ...(!m ? ['no Yahoo market row'] : []),
    ];
    const { classes, evidence } =
      severity === 'NONE'
        ? { classes: [], evidence: [] }
        : classify(p, {
            eng,
            pg: pgRank.get(id)!,
            n9: n9Rank.get(id)!,
            flags: disagreementFlags,
            proj: proj.providerRank ?? null,
          });
    return {
      playerId: id,
      player: p.player.name,
      team: p.player.team,
      positions: p.player.positions.join('/'),
      yahooXRank: m?.yahooXRank ?? null,
      yahooRank: m?.yahooRank ?? null,
      yahooL7Adp: m?.yahooAdp7d ?? null,
      yahooReviewFields: m?.meta?.reviewFields ?? [],
      providerRank: proj.providerRank ?? null,
      providerAdp: proj.providerAdp ?? null,
      engineBpvRank: eng,
      engineSeasonRank: seasonRank.get(id)!,
      enginePerGameRank: pgRank.get(id)!,
      engineNeutral9CatRank: n9Rank.get(id)!,
      bpv: p.value.basePlayerValue,
      gp: proj.gp,
      strengths,
      weaknesses,
      risk: p.availability.risk,
      availabilityScore: p.availability.score,
      disagreementFlags,
      deltaEngineVsProvider: dH,
      deltaEngineVsXRank: dX,
      deltaYahooL7AdpVsProviderAdp: dA,
      severity,
      tentativeClasses: classes,
      evidence,
    };
  });
  rows.sort((a, b) => a.engineBpvRank - b.engineBpvRank);

  const byClass: Record<string, number> = {};
  for (const r of rows) for (const c of r.tentativeClasses.slice(0, 1)) byClass[c] = (byClass[c] ?? 0) + 1;
  return {
    generatedFor: {
      teams: league.teamCount,
      rosterSize: ctx.rounds,
      primaryProvider: league.primaryProjectionProvider,
      validationProviders: league.validationProviders,
    },
    population: {
      size: ctx.population.size,
      converged: ctx.population.converged,
      replacementPerGame: ctx.replacement.perGame,
      missedGameLoss: ctx.replacement.missedGameLoss,
    },
    rows,
    summary: {
      rows: rows.length,
      disagree: rows.filter((r) => r.severity === 'DISAGREE').length,
      major: rows.filter((r) => r.severity === 'MAJOR').length,
      byClass,
      medianAbsDeltaProvider: median(
        rows.filter((r) => r.deltaEngineVsProvider !== null).map((r) => Math.abs(r.deltaEngineVsProvider!)),
      ),
      medianAbsDeltaXRank: median(
        rows.filter((r) => r.deltaEngineVsXRank !== null).map((r) => Math.abs(r.deltaEngineVsXRank!)),
      ),
      medianAbsDeltaAdp: median(
        rows
          .filter((r) => r.deltaYahooL7AdpVsProviderAdp !== null)
          .map((r) => Math.abs(r.deltaYahooL7AdpVsProviderAdp!)),
      ),
    },
    notes: [
      'Engine ranks are NEUTRAL (no roster, no market). Punt/team-fit and positional/scarcity classes only apply in draft scenarios.',
      'Delta = otherRank − engineRank; positive means the engine ranks the player earlier than the other source.',
      'Classifications are TENTATIVE and automated. Every MAJOR row must be confirmed by a human in docs/CALIBRATION.md.',
      'Weights are never changed from this report alone (calibration principle).',
    ],
  };
}

/** Tentative, evidence-based classification. Ordered: data problems first, defects last. */
function classify(
  p: StaticPlayer,
  r: { eng: number; pg: number; n9: number; flags: string[]; proj: number | null },
): { classes: OutlierClass[]; evidence: string[] } {
  const classes: OutlierClass[] = [];
  const evidence: string[] = [];
  if (r.flags.length) {
    classes.push('SOURCE_DATA_MISMATCH');
    evidence.push(r.flags.join('; '));
  }
  const gp = p.player.proj!.gp;
  if (
    Math.abs(r.pg - r.eng) >= 10 ||
    gp < 60 ||
    p.availability.risk === 'HIGH' ||
    p.availability.risk === 'VERY_HIGH'
  ) {
    classes.push('GP_DURABILITY_ADJUSTMENT');
    evidence.push(
      `GP ${gp}, per-game rank ${r.pg} vs season-blended rank ${r.eng}, risk ${p.availability.risk}`,
    );
  }
  const zfg = p.stats.rawZ.FG_PCT;
  const zft = p.stats.rawZ.FT_PCT;
  if (Math.abs(zfg) >= 1.5 || Math.abs(zft) >= 1.5) {
    classes.push('PERCENTAGE_VOLUME_DIFFERENCE');
    evidence.push(`volume-weighted z FG ${zfg.toFixed(2)}, FT ${zft.toFixed(2)}`);
  }
  if (Math.abs(r.n9 - r.eng) >= 10) {
    classes.push('INTENTIONAL_ENGINE_BEHAVIOR');
    const capped = CATEGORIES.filter((c: Category) => p.stats.rawZ[c] !== p.stats.cappedZ[c]).map(
      (c) => CATEGORY_LABEL[c],
    );
    evidence.push(
      `neutral 9-cat rank ${r.n9} vs BPV rank ${r.eng} (TO weight 0.75${capped.length ? `, z-cap on ${capped.join('/')}` : ''})`,
    );
  }
  if (!classes.length) {
    classes.push('LIKELY_ENGINE_DEFECT');
    evidence.push(
      'No data, durability, percentage or intentional-weighting explanation found — investigate manually.',
    );
  }
  return { classes, evidence };
}

export function calibrationCsv(report: CalibrationReport): string {
  const cols: (keyof CalibrationRow)[] = [
    'player',
    'team',
    'positions',
    'yahooXRank',
    'yahooRank',
    'yahooL7Adp',
    'providerRank',
    'providerAdp',
    'engineBpvRank',
    'engineSeasonRank',
    'enginePerGameRank',
    'engineNeutral9CatRank',
    'gp',
    'strengths',
    'weaknesses',
    'risk',
    'availabilityScore',
    'disagreementFlags',
    'deltaEngineVsProvider',
    'deltaEngineVsXRank',
    'deltaYahooL7AdpVsProviderAdp',
    'severity',
    'tentativeClasses',
    'evidence',
  ];
  const cell = (v: unknown) => {
    const s = Array.isArray(v)
      ? v.join('; ')
      : v === null || v === undefined
        ? ''
        : typeof v === 'number'
          ? String(Math.round(v * 100) / 100)
          : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...report.rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}
