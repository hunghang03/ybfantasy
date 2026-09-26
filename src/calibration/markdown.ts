import type { CalibrationReport } from './report';
import type { ReconciliationReport } from './reconcile';

const esc = (s: unknown) => String(s ?? '—').replace(/\|/g, '\\|');

export function reconciliationMarkdown(r: ReconciliationReport, label: string): string {
  const c = r.counts;
  const list = (
    title: string,
    rows: {
      name: string;
      team: string | null;
      otherName?: string | null;
      otherTeam?: string | null;
      note?: string;
      candidates?: string[];
    }[],
  ) =>
    rows.length
      ? [
          `### ${title} (${rows.length})`,
          '',
          '| Player | Team | Other source | Note |',
          '|---|---|---|---|',
          ...rows.map(
            (x) =>
              `| ${esc(x.name)} | ${esc(x.team)} | ${esc(x.otherName ? `${x.otherName} (${x.otherTeam ?? '—'})` : x.candidates?.join('; '))} | ${esc(x.note ?? '')} |`,
          ),
          '',
        ]
      : [`### ${title} (0)`, ''];
  return [
    `# Reconciliation report — ${label}`,
    '',
    `Season ${r.season}. Matching order: manual mapping → provider id → normalized name + team → alias → unique normalized name → review.`,
    '',
    '| Bucket | Count |',
    '|---|---|',
    `| Projection rows | ${c.projectionRows} |`,
    `| Yahoo rows | ${c.yahooRows} |`,
    `| Matched | ${c.matched} |`,
    `| Yahoo-only | ${c.yahooOnly} |`,
    `| Projection-only | ${c.projectionOnly} |`,
    `| Ambiguous (needs manual review) | ${c.ambiguous} |`,
    `| Team mismatch (matched, teams differ) | ${c.teamMismatch} |`,
    `| Rejected rows (projections / Yahoo) | ${c.projectionRejected} / ${c.yahooRejected} |`,
    `| Duplicate rows | ${c.duplicates} |`,
    '',
    `Matched via: ${
      Object.entries(r.matchedVia)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ') || '—'
    }`,
    '',
    ...(r.aliasProblems.length
      ? ['### Alias table problems', '', ...r.aliasProblems.map((p) => `- ${p}`), '']
      : []),
    ...list('Ambiguous', r.ambiguous),
    ...list('Team mismatch', r.teamMismatch),
    ...list('Yahoo-only (kept as unranked market-only players)', r.yahooOnly),
    ...list('Projection-only (projected, no Yahoo market row)', r.projectionOnly),
    ...(r.rejected.length
      ? [
          '### Rejected rows',
          '',
          ...r.rejected.map((x) => `- ${x.source} row ${x.rowNumber} ${esc(x.name)}: ${x.errors.join(' ')}`),
          '',
        ]
      : []),
  ].join('\n');
}

export function calibrationMarkdown(r: CalibrationReport, label: string): string {
  const s = r.summary;
  const major = r.rows.filter((x) => x.severity === 'MAJOR');
  const disagree = r.rows.filter((x) => x.severity === 'DISAGREE');
  const table = (rows: typeof r.rows) => [
    '| Engine | Player | Pos | XRank | Y L7 ADP | Proj rank | Proj ADP | Δ proj | Δ XRank | Δ ADP | GP | Risk | Strengths | Tentative class | Evidence |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (x) =>
        `| ${x.engineBpvRank} | ${esc(x.player)} | ${x.positions} | ${esc(x.yahooXRank)} | ${esc(x.yahooL7Adp)} | ${esc(x.providerRank)} | ${esc(x.providerAdp)} | ${esc(x.deltaEngineVsProvider)} | ${esc(x.deltaEngineVsXRank)} | ${esc(x.deltaYahooL7AdpVsProviderAdp === null ? null : Math.round(x.deltaYahooL7AdpVsProviderAdp * 10) / 10)} | ${x.gp} | ${x.risk} | ${x.strengths.join(' ')} | ${x.tentativeClasses.join(', ')} | ${esc(x.evidence.join(' / '))} |`,
    ),
  ];
  return [
    `# Calibration report — ${label}`,
    '',
    `League: ${r.generatedFor.teams} teams, ${r.generatedFor.rosterSize} rounds, primary provider \`${r.generatedFor.primaryProvider}\`, validation: ${r.generatedFor.validationProviders.join(', ') || 'none'}.`,
    `Population ${r.population.size} (converged ${r.population.converged}), replacement PG ${r.population.replacementPerGame.toFixed(2)}, missed-game L ${r.population.missedGameLoss.toFixed(2)}.`,
    '',
    ...r.notes.map((n) => `> ${n}`),
    '',
    '## Summary',
    '',
    `Rows ${s.rows} · ≥15-rank disagreements ${s.disagree} · ≥30-rank MAJOR ${s.major}`,
    '',
    `Median |Δ engine vs provider rank| ${s.medianAbsDeltaProvider ?? '—'} · median |Δ engine vs XRank| ${s.medianAbsDeltaXRank ?? '—'} · median |Yahoo L7 ADP − provider ADP| ${s.medianAbsDeltaAdp ?? '—'}`,
    '',
    'Primary tentative class of flagged rows: ' +
      (Object.entries(s.byClass)
        .map(([k, v]) => `${k} ${v}`)
        .join(', ') || '—'),
    '',
    `## MAJOR disagreements (${major.length})`,
    '',
    ...table(major),
    '',
    `## Disagreements ≥ 15 (${disagree.length})`,
    '',
    ...table(disagree),
    '',
    'Full table: calibration.csv / calibration.json',
  ].join('\n');
}
