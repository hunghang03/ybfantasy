'use client';

import type { StaticContext } from '@/domain/recommendations/staticContext';
import { CATEGORIES, CATEGORY_LABEL } from '@/domain/types/core';
import type { PlayerEvaluation } from '@/domain/types/evaluation';
import { Badge, fmt, signed } from '../ui/primitives';
import { BAND_TEXT, LABEL_CLASS, LABEL_TEXT, RISK_CLASS } from '../labels';

function Row({ k, v, strong, title }: { k: string; v: string; strong?: boolean; title?: string }) {
  return (
    <tr className={strong ? 'border-t border-slate-300 font-bold dark:border-slate-600' : ''} title={title}>
      <td className="pr-3 text-slate-600 dark:text-slate-400">{k}</td>
      <td className="num text-right">{v}</td>
    </tr>
  );
}

/** Complete numeric breakdown of one player's evaluation (DESIGN §7). No black boxes. */
export function PlayerDetail({ p, ctx }: { p: PlayerEvaluation; ctx: StaticContext | null }) {
  const sp = ctx?.byId.get(p.playerId);
  const proj = sp?.player.proj;
  return (
    <div className="space-y-3 text-xs" data-testid="player-detail">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold">{p.name}</h3>
        <span className="text-slate-500">
          {p.team} · {p.positions.join('/')} · {sp?.player.positionsSource === 'YAHOO' ? 'Yahoo eligibility' : `positions: ${sp?.player.positionsSource}`}
        </span>
        <Badge className={LABEL_CLASS[p.label]}>{LABEL_TEXT[p.label]}</Badge>
        <span className="text-slate-500" title="Rule that produced the label">
          {p.labelRule}
        </span>
        <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100">confidence {p.confidence}</Badge>
      </div>
      {p.warnings.length > 0 && <p className="text-amber-700">⚠ {p.warnings.join(' · ')}</p>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div>
          <h4 className="mb-1 font-semibold uppercase text-slate-500">Raw projection (per game, primary)</h4>
          {proj ? (
            <table>
              <tbody>
                <Row k="Provider" v={proj.provider} />
                <Row k="GP / MPG" v={`${fmt(proj.gp, 0)} / ${fmt(proj.mpg, 1)}`} />
                <Row k="FGM / FGA (FG%)" v={`${fmt(proj.fgm, 1)} / ${fmt(proj.fga, 1)} (${proj.fga > 0 ? (proj.fgm / proj.fga).toFixed(3) : '—'})`} />
                <Row k="FTM / FTA (FT%)" v={`${fmt(proj.ftm, 1)} / ${fmt(proj.fta, 1)} (${proj.fta > 0 ? (proj.ftm / proj.fta).toFixed(3) : '—'})`} />
                <Row k="3PM PTS REB" v={`${fmt(proj.threes, 1)} ${fmt(proj.pts, 1)} ${fmt(proj.reb, 1)}`} />
                <Row k="AST STL BLK TO" v={`${fmt(proj.ast, 1)} ${fmt(proj.stl, 1)} ${fmt(proj.blk, 1)} ${fmt(proj.to, 1)}`} />
                <Row k="FG impact / FT impact" v={`${fmt(p.stats.fgImpact)} / ${fmt(p.stats.ftImpact)}`} title="makes − p·attempts" />
              </tbody>
            </table>
          ) : (
            <p>No projection.</p>
          )}
          {p.disagreement.length > 0 && (
            <>
              <h4 className="mt-2 mb-1 font-semibold uppercase text-slate-500">Validation sources</h4>
              {p.disagreement.map((d) => (
                <p key={d.provider} className={d.flagged ? 'font-semibold text-amber-700' : ''}>
                  {d.provider}: Δ {fmt(d.delta)} SD, ΔGP {fmt(d.gpDelta, 0)} {d.flagged ? '— PROJECTION DISAGREEMENT' : ''}
                </p>
              ))}
            </>
          )}
        </div>

        <div>
          <h4 className="mb-1 font-semibold uppercase text-slate-500">Z-scores and fit per category</h4>
          <table className="w-full">
            <thead className="text-[10px] text-slate-500">
              <tr>
                <th className="text-left">Cat</th>
                <th className="text-right">raw z</th>
                <th className="text-right">capped</th>
                <th className="text-right">need</th>
                <th className="text-right">punt</th>
                <th className="text-right">pool</th>
                <th className="text-right">next</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => (
                <tr key={c}>
                  <td>{CATEGORY_LABEL[c]}</td>
                  <td className="num text-right">{fmt(p.stats.rawZ[c])}</td>
                  <td className="num text-right">{fmt(p.stats.cappedZ[c])}</td>
                  <td className="num text-right">{signed(p.fit.perCategory[c].need)}</td>
                  <td className="num text-right">{signed(p.fit.perCategory[c].punt)}</td>
                  <td className="num text-right">{signed(p.fit.perCategory[c].poolScarcity)}</td>
                  <td className="num text-right">{signed(p.market.perCategoryNextPick[c])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-slate-500">
            Neutral 9-cat (raw z, TO 1.0): <b>{fmt(p.stats.neutral9Cat)}</b> · neutral rank #{p.stats.neutralRank}
          </p>
        </div>

        <div>
          <h4 className="mb-1 font-semibold uppercase text-slate-500">DDP decomposition (z-units / game)</h4>
          <table className="w-full" data-testid="ddp-breakdown">
            <tbody>
              <Row k="Per-game VAR (PGV)" v={fmt(p.value.perGameVAR)} />
              <Row k={`Availability a = GP/${ctx?.config.seasonGames ?? 82}`} v={fmt(p.value.availabilityFraction, 3)} />
              <Row k="Loss per missed game" v={fmt(p.value.missedGameLoss)} />
              <Row k="Expected-season VAR (ESV)" v={fmt(p.value.expectedSeasonVAR)} />
              <Row k="Base player value (BPV)" v={fmt(p.value.basePlayerValue)} strong />
              <Row k="+ Category need" v={signed(p.fit.need)} />
              <Row k="+ Punt synergy" v={signed(p.fit.punt)} />
              <Row k="+ Pool scarcity" v={signed(p.fit.poolScarcity)} />
              <Row k="+ Position need" v={signed(p.fit.position)} />
              <Row k="+ Multi-position" v={signed(p.fit.multiPos)} />
              <Row k="− Redundancy" v={signed(p.fit.redundancy)} />
              <Row k="= Team fit" v={signed(p.fit.teamFit)} strong />
              <Row k="+ Playoff schedule" v={signed(p.adjustments.playoff)} />
              <Row k="+ Upside" v={signed(p.adjustments.upside)} title={sp?.upsideSources.join(', ') || 'no upside evidence'} />
              <Row k="− Availability risk (round-weighted)" v={signed(p.adjustments.risk)} />
              <Row k="± User preference" v={signed(p.adjustments.userPref)} />
              <Row k="= DDP raw" v={fmt(p.ddpRaw)} strong />
              <Row k="DDP score (0–100) · rank" v={`${p.ddpScore} · #${p.ddpRank || '—'}`} />
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="mb-1 font-semibold uppercase text-slate-500">Availability / durability</h4>
          <table>
            <tbody>
              <Row k="Availability score" v={`${p.availability.score} (${p.availability.risk})`} />
              <Row k="History H (weighted)" v={fmt(p.availability.terms.history, 3)} title={p.availability.terms.historyKnown ? `${p.availability.terms.seasonsUsed} seasons` : 'no history: default risk'} />
              <Row k="Chronic / age" v={`${fmt(p.availability.terms.chronic, 3)} / ${fmt(p.availability.terms.age, 3)}`} />
              <Row k="Status / manual" v={`${p.availability.status} ${fmt(p.availability.terms.status, 2)} / ${fmt(p.availability.terms.manual, 2)}`} />
              <Row k="ρ_hist / ρ_now / ρ_eff" v={`${fmt(p.availability.rhoHist, 3)} / ${fmt(p.availability.rhoNow, 3)} / ${fmt(p.availability.rhoEff, 3)}`} />
            </tbody>
          </table>
          <p className={RISK_CLASS[p.availability.risk]}>Risk is not an injury prediction; it is an explainable history/status index.</p>
        </div>

        <div>
          <h4 className="mb-1 font-semibold uppercase text-slate-500">Yahoo market (timing only)</h4>
          <table>
            <tbody>
              <Row k="L7 ADP" v={fmt(p.market.adp, 1)} />
              <Row k="XRank / Rank" v={`${p.market.xrank ?? '—'} / ${p.market.rank ?? '—'}`} />
              <Row k="Market reference" v={`${fmt(p.market.marketRef, 1)} (${p.market.marketRefSource})`} />
              <Row k="Survival band (to your following pick)" v={`${BAND_TEXT[p.market.band]}${p.market.bandBeforeXrank !== p.market.band ? ` (XRank downgrade from ${p.market.bandBeforeXrank})` : ''}`} />
              <Row k="zS (ordinal band input)" v={fmt(p.market.zS)} />
              <Row k="Value over market" v={p.market.valueOverMarket === null ? '—' : signed(p.market.valueOverMarket, 1)} />
              <Row k="Next-pick scarcity adj." v={signed(p.market.nextPickScarcity)} />
            </tbody>
          </table>
        </div>

        <div>
          <h4 className="mb-1 font-semibold uppercase text-slate-500">Pick-pair planning</h4>
          {p.planning ? (
            <table>
              <tbody>
                <Row k="Pair score" v={fmt(p.planning.pairScore)} />
                <Row
                  k={`Best next pick (${p.planning.nextBestConservative.tier.toLowerCase()} tier)`}
                  v={`${p.planning.nextBestConservative.playerId ? (ctx?.byId.get(p.planning.nextBestConservative.playerId)?.player.name ?? '?') : '—'} ${fmt(p.planning.nextBestConservative.ddpRaw)}`}
                />
                <Row k="Miss cost / rel" v={`${fmt(p.planning.missCost)} / ${fmt(p.planning.missRel)}`} />
              </tbody>
            </table>
          ) : (
            <p className="text-slate-500">Not among the top candidates evaluated this pick.</p>
          )}
          <p className="mt-1 text-slate-500">Priority #{p.priorityRank}</p>
        </div>
      </div>
    </div>
  );
}
