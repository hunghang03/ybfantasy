import type { PickTiming } from '../draft/snake';
import { CATEGORIES, CATEGORY_LABEL, type Category } from '../types/core';
import type { AdvisorOutput, CategoryProfileEntry, EngineWarning, PlayerEvaluation } from '../types/evaluation';
import type { RosterContext } from '../recommendations/ddp';
import type { StaticContext } from '../recommendations/staticContext';

/**
 * Strategy Advisor (DESIGN §9). Deterministic templates over engine output — no AI calls.
 */

const L = (c: Category) => CATEGORY_LABEL[c];

const BAND_PHRASE: Record<string, string> = {
  GONE: 'the market says he should already be gone',
  UNLIKELY: `Yahoo L7 ADP says he is unlikely to last to your next pick`,
  TOSSUP: 'Yahoo L7 ADP makes waiting a toss-up',
  LIKELY: 'Yahoo L7 ADP suggests he will likely last',
  SAFE: 'Yahoo L7 ADP gives a comfortable cushion',
  UNKNOWN: 'there is no Yahoo market data for him',
};

const TERM_PHRASE: Record<string, string> = {
  need: 'fills category needs',
  punt: 'fits the punt build',
  poolScarcity: 'adds scarce categories',
  position: 'covers a needed position',
  multiPos: 'adds positional flexibility',
  playoff: 'has a strong playoff schedule',
  upside: 'offers upside',
};

export function buildAdvisor(args: {
  sc: StaticContext;
  timing: PickTiming;
  rc: RosterContext;
  profile: CategoryProfileEntry[];
  evals: PlayerEvaluation[];
  recommendedId: string | null;
  warnings: EngineWarning[];
  round: number;
}): AdvisorOutput {
  const { sc, timing, rc, profile, evals, recommendedId } = args;
  const warnings = args.warnings.filter((w) => w.severity !== 'info' || w.code === 'UNRECORDED_PICKS' || w.code === 'FINAL_PICK').map((w) => w.message);

  if (sc.status === 'INSUFFICIENT_DATA')
    return {
      header: 'NO RANKINGS',
      build: '',
      priority: [],
      priorityLine: '',
      reason: 'Import a primary projection dataset to get recommendations.',
      recommendedId: null,
      recommendedName: null,
      recommendedWhy: '',
      avoidLine: '',
      warnings,
    };

  let header: string;
  if (timing.draftComplete || timing.p0 === null) header = 'DRAFT COMPLETE';
  else {
    const onClock = timing.onTheClock ? 'ON THE CLOCK — ' : `YOUR NEXT PICK ${timing.p0} — `;
    const next = timing.p1 !== null ? ` · FOLLOWING PICK ${timing.p1} (${timing.gapType?.toLowerCase()} gap)` : ' · FINAL PICK';
    header = `${onClock}PICK ${timing.currentOverall} · ROUND ${timing.currentRound}${next}`;
  }

  const punts = profile.filter((p) => p.punt.level !== 'NONE').sort((a, b) => b.punt.pi - a.punt.pi);
  let build = 'Build: balanced — no punt yet.';
  const strongest = punts[0];
  if (strongest) {
    const lvl = strongest.punt.level === 'HARD' ? 'Punt' : strongest.punt.level === 'SOFT' ? 'Soft punt' : 'Leaning away from';
    const recov = strongest.punt.recoverability >= 0.65 ? ' (still recoverable)' : strongest.punt.recoverability <= 0.35 ? ' (hard to recover)' : '';
    const manual = strongest.punt.override !== 'AUTO' ? ' [manual]' : '';
    build = `Build: ${lvl} ${L(strongest.category)} — ${Math.round(strongest.punt.pi * 100)}% confidence${recov}${manual}.`;
  }

  const priority = [...profile]
    .filter((p) => p.weightMultiplier > 0 && p.need > 0)
    .sort((a, b) => b.need * (1 + b.poolScarcity + b.nextPickScarcity) - a.need * (1 + a.poolScarcity + a.nextPickScarcity) || CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category))
    .slice(0, 3)
    .map((p) => p.category);
  const priorityLine = priority.length ? `Priority: ${priority.map(L).join(' > ')}` : 'Priority: best player available';

  let reason: string;
  if (rc.k === 0) reason = 'First pick: take the best player value; category needs start shaping the build after your first selections.';
  else {
    const weakest = [...profile]
      .filter((p) => p.punt.level === 'NONE' || p.punt.level === 'TENDENCY')
      .sort((a, b) => a.d - b.d)[0];
    const strong = profile.filter((p) => p.baseState === 'ELITE' || p.baseState === 'STRONG').map((p) => L(p.category));
    const parts: string[] = [];
    if (weakest && weakest.d < 0.75) {
      const trend =
        weakest.poolScarcity > 0.15 || weakest.nextPickScarcity > 0.15
          ? ` and ${L(weakest.category)} supply is declining`
          : '';
      parts.push(`${L(weakest.category)} is your weakest competitive category${trend}.`);
    }
    if (strong.length) parts.push(`${strong.join(', ')} ${strong.length > 1 ? 'are' : 'is'} already strong.`);
    reason = parts.join(' ') || 'Your categories are balanced; take the best value.';
  }

  const rec = recommendedId ? evals.find((e) => e.playerId === recommendedId) : undefined;
  let recommendedWhy = '';
  if (rec) {
    const terms: [string, number][] = [
      ['need', rec.fit.need],
      ['punt', rec.fit.punt],
      ['poolScarcity', rec.fit.poolScarcity],
      ['position', rec.fit.position],
      ['multiPos', rec.fit.multiPos],
      ['playoff', rec.adjustments.playoff],
      ['upside', rec.adjustments.upside],
    ];
    const top = terms.filter(([, v]) => v > 0.05).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => TERM_PHRASE[k]);
    const cats = rec.fitTags.map(L);
    const catPart = cats.length ? `Adds ${cats.join(', ')}` : 'Best overall value';
    const hurts = CATEGORIES.filter((c) => rec.stats.cappedZ[c] <= -1 && rc.m[c] > 0.5).map(L);
    const hurtPart = hurts.length ? ` (costs ${hurts.join(', ')})` : '';
    const termPart = top.length ? `; ${top.join(' and ')}` : '';
    recommendedWhy = `${catPart}${hurtPart}${termPart}. ${capitalize(BAND_PHRASE[rec.market.band] ?? '')}.`;
  }

  const surplusCats = profile.filter((p) => p.surplus > 0).map((p) => p.category);
  const avoidLine = surplusCats.length && priority.length
    ? `Avoid this round: specialists who mainly add ${surplusCats.map(L).join('/')} unless exceptional value falls.`
    : '';

  return {
    header,
    build,
    priority,
    priorityLine,
    reason,
    recommendedId: rec?.playerId ?? null,
    recommendedName: rec?.name ?? null,
    recommendedWhy,
    avoidLine,
    warnings,
  };
}

function capitalize(s: string): string {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
