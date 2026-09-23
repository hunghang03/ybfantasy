/**
 * Deterministic FICTIONAL sample dataset generator (seeded). No real players, no proprietary data.
 * Produces CSV text in the same formats a user would import (Yahoo-market style, Hashtag-style
 * projections with "pct (makes/attempts)" cells, a BBM-style validation file, availability history,
 * player context and a playoff schedule).
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Avery', 'Blake', 'Cam', 'Dante', 'Eli', 'Finn', 'Gage', 'Hollis', 'Idris', 'Jalen', 'Kade', 'Lior', 'Marek', 'Nico', 'Orin', 'Pax', 'Quincy', 'Rowan', 'Soren', 'Tate', 'Ulises', 'Vance', 'Wes', 'Xander', 'Yuri', 'Zane', 'Ansel', 'Bram', 'Cyrus', 'Dorian', 'Emeka', 'Florian', 'Galen', 'Hugo', 'Ivo', 'Jonah', 'Kellan', 'Linus', 'Milo', 'Niall'];
const LAST = ['Ashgrove', 'Birchwell', 'Calloway', 'Draven', 'Eastlake', 'Fairbourne', 'Garrow', 'Hartwell', 'Ingram', 'Jessop', 'Kestrel', 'Lockhart', 'Marlow', 'Northcott', 'Oakridge', 'Pembrook', 'Quill', 'Ravensworth', 'Stroud', 'Thorne', 'Underhill', 'Vexley', 'Wolcott', 'Yarrow', 'Zeller', 'Abernet', 'Blackwood', 'Corvell', 'Dunmore', 'Everly'];
export const SAMPLE_TEAMS = ['ALB', 'BRV', 'CDR', 'DLT', 'EMB', 'FRG', 'GLN', 'HVN', 'IRN', 'JAD', 'KNG', 'LYX', 'MTR', 'NOV', 'ORC', 'PHN', 'QST', 'RVR', 'SUM', 'TID', 'UMB', 'VIP', 'WLD', 'XEN', 'YTI', 'ZEP', 'ARC', 'BOL', 'CRS', 'DUN'];

type Archetype = 'PG' | 'WING_G' | 'WING_F' | 'STRETCH' | 'BIG';

interface GenPlayer {
  id: string;
  name: string;
  team: string;
  positions: string;
  arche: Archetype;
  gp: number;
  mpg: number;
  fgm: number;
  fga: number;
  ftm: number;
  fta: number;
  threes: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  value: number;
  age: number;
  prone: number; // 0..1 injury proneness
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

export interface SampleFiles {
  'yahoo-market.sample.csv': string;
  'projections-hashtag.sample.csv': string;
  'projections-bbm.sample.csv': string;
  'availability.sample.csv': string;
  'context.sample.csv': string;
  'playoff-schedule.sample.csv': string;
}

export function generateSample(seed = 20260923, count = 300): SampleFiles {
  const rnd = mulberry32(seed);
  const gauss = () => {
    const u = Math.max(rnd(), 1e-9);
    const v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const used = new Set<string>();
  const players: GenPlayer[] = [];
  const arches: Archetype[] = ['PG', 'WING_G', 'WING_F', 'STRETCH', 'BIG'];
  for (let i = 0; i < count; i++) {
    let name = '';
    do name = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]}`;
    while (used.has(name));
    used.add(name);
    const arche = arches[Math.floor(rnd() * arches.length)]!;
    // quality declines with index; noise keeps it realistic
    const q = Math.max(0.15, 1.6 * Math.exp(-i / 90) + 0.25 + 0.12 * gauss());
    const mpg = Math.min(37, Math.max(12, 16 + 14 * q + 2 * gauss()));
    const usage = 0.6 + 0.6 * q + 0.1 * gauss();
    const base = mpg / 30;
    let pts = 0, reb = 0, ast = 0, stl = 0, blk = 0, threes = 0, fgPct = 0.46, ftPct = 0.78, to = 0, positions = '';
    switch (arche) {
      case 'PG':
        pts = 14 * base * usage; reb = 3.6 * base; ast = 6.8 * base * usage; stl = 1.1 * base; blk = 0.3 * base;
        threes = 2.1 * base * usage; fgPct = 0.455; ftPct = 0.84; to = 2.6 * base * usage; positions = rnd() < 0.4 ? 'PG,SG' : 'PG';
        break;
      case 'WING_G':
        pts = 15 * base * usage; reb = 4.2 * base; ast = 3.6 * base; stl = 1.0 * base; blk = 0.4 * base;
        threes = 2.4 * base * usage; fgPct = 0.455; ftPct = 0.82; to = 1.8 * base * usage; positions = rnd() < 0.5 ? 'SG,SF' : 'SG';
        break;
      case 'WING_F':
        pts = 14 * base * usage; reb = 5.8 * base; ast = 2.8 * base; stl = 1.0 * base; blk = 0.6 * base;
        threes = 1.7 * base * usage; fgPct = 0.47; ftPct = 0.78; to = 1.6 * base * usage; positions = rnd() < 0.5 ? 'SF,PF' : 'SF';
        break;
      case 'STRETCH':
        pts = 13 * base * usage; reb = 7.0 * base; ast = 2.2 * base; stl = 0.7 * base; blk = 1.0 * base;
        threes = 1.6 * base * usage; fgPct = 0.48; ftPct = 0.8; to = 1.5 * base * usage; positions = rnd() < 0.5 ? 'PF,C' : 'PF';
        break;
      case 'BIG':
        pts = 12.5 * base * usage; reb = 10.5 * base; ast = 2.2 * base; stl = 0.7 * base; blk = 1.6 * base;
        threes = 0.3 * base; fgPct = 0.58; ftPct = 0.66; to = 1.7 * base * usage; positions = 'C';
        break;
    }
    const jit = (x: number, s = 0.12) => Math.max(0, x * (1 + s * gauss()));
    pts = jit(pts); reb = jit(reb); ast = jit(ast); stl = jit(stl, 0.2); blk = jit(blk, 0.25); threes = jit(threes, 0.2); to = jit(to, 0.15);
    fgPct = Math.min(0.68, Math.max(0.38, fgPct + 0.03 * gauss()));
    ftPct = Math.min(0.94, Math.max(0.5, ftPct + 0.05 * gauss()));
    const fta = Math.max(0.4, pts * (arche === 'BIG' ? 0.3 : 0.22) * (1 + 0.2 * gauss()));
    const fga = Math.max(2, (pts - fta * ftPct - threes) / (2 * fgPct) + threes * 0.4);
    const prone = rnd() < 0.18 ? 0.6 + 0.4 * rnd() : 0.15 * rnd();
    const gp = Math.round(Math.min(80, Math.max(25, 76 - prone * 30 + 3 * gauss())));
    const age = Math.round(Math.min(37, Math.max(19, 26 + 4 * gauss())));
    players.push({
      id: `SMP${String(i + 1).padStart(4, '0')}`,
      name, team: SAMPLE_TEAMS[i % SAMPLE_TEAMS.length]!, positions, arche, gp, mpg,
      fgm: fga * fgPct, fga, ftm: fta * ftPct, fta, threes, pts, reb, ast, stl, blk, to,
      value: q, age, prone,
    });
  }

  // Market: ADP follows value with noise; XRank and Rank are separate noisy views.
  const byValue = [...players].sort((a, b) => b.value - a.value);
  const adpRank = byValue.map((p) => ({ p, s: byValue.indexOf(p) + 1 + 6 * gauss() })).sort((a, b) => a.s - b.s);
  const adp = new Map<string, number>();
  adpRank.forEach((x, i) => adp.set(x.p.id, i < 190 ? r1(i + 1 + Math.abs(1.5 * gauss())) : NaN));
  const xr = byValue.map((p, i) => ({ p, s: i + 1 + 8 * gauss() })).sort((a, b) => a.s - b.s);
  const xrank = new Map(xr.map((x, i) => [x.p.id, i + 1]));
  const rk = byValue.map((p, i) => ({ p, s: i + 1 + 12 * gauss() })).sort((a, b) => a.s - b.s);
  const rank = new Map(rk.map((x, i) => [x.p.id, i + 1]));

  const csv = (rows: (string | number)[][]) =>
    rows.map((r) => r.map((c) => (typeof c === 'string' && /[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : String(c))).join(',')).join('\n') + '\n';

  const statuses = (p: GenPlayer) => (p.prone > 0.85 ? 'INJ' : p.prone > 0.75 ? 'GTD' : '');
  const market: (string | number)[][] = [['Player', 'Team', 'Pos', 'Yahoo ID', 'XRank', 'Rank', 'Last 7 Days ADP', 'Status']];
  for (const p of players) {
    const a = adp.get(p.id)!;
    market.push([p.name, p.team, p.positions, `y${p.id}`, xrank.get(p.id)!, rank.get(p.id)!, Number.isNaN(a) ? '' : a, statuses(p)]);
  }

  const hashtag: (string | number)[][] = [['PLAYER', 'TEAM', 'POS', 'GP', 'MPG', 'FG%', 'FT%', '3PM', 'PTS', 'TREB', 'AST', 'STL', 'BLK', 'TO']];
  for (const p of players)
    hashtag.push([
      p.name, p.team, p.positions, p.gp, r1(p.mpg),
      `${r3(p.fgm / p.fga)} (${r1(p.fgm)}/${r1(p.fga)})`, `${r3(p.ftm / p.fta)} (${r1(p.ftm)}/${r1(p.fta)})`,
      r1(p.threes), r1(p.pts), r1(p.reb), r1(p.ast), r1(p.stl), r1(p.blk), r1(p.to),
    ]);
  // Hashtag "TREB" isn't a synonym by default → keep standard "REB" header for auto-mapping.
  hashtag[0]![9] = 'REB';

  const bbm: (string | number)[][] = [['Name', 'Team', 'g', 'm/g', 'fgm', 'fga', 'ftm', 'fta', '3pm', 'pts', 'reb', 'ast', 'stl', 'blk', 'to']];
  for (const p of players) {
    const d = p.prone > 0.7 && rnd() < 0.5 ? 0.25 : 0.05; // some strong disagreements
    const f = (x: number) => r1(Math.max(0, x * (1 + d * gauss())));
    bbm.push([p.name, p.team, Math.round(Math.min(82, Math.max(10, p.gp + (d > 0.1 ? -18 : 2) * rnd()))), r1(p.mpg), f(p.fgm), f(p.fga) || 1, f(p.ftm), Math.max(f(p.fta), f(p.ftm)), f(p.threes), f(p.pts), f(p.reb), f(p.ast), f(p.stl), f(p.blk), f(p.to)]);
  }
  // Ensure makes ≤ attempts after independent jitter.
  for (let i = 1; i < bbm.length; i++) {
    const row = bbm[i]!;
    if (Number(row[4]) > Number(row[5])) row[4] = row[5]!;
    if (Number(row[6]) > Number(row[7])) row[6] = row[7]!;
  }

  const avail: (string | number)[][] = [['Player', 'Team', 'Season', 'GP', 'Team Games', 'Missed Low', 'Missed Moderate', 'Missed High', 'Missed Unclassified', 'Note']];
  for (const p of players.slice(0, 240)) {
    for (const [si, season] of ['2025-26', '2024-25', '2023-24'].entries()) {
      if (p.age - si < 20) continue;
      const missed = Math.round(Math.min(70, Math.max(0, 82 * p.prone * (0.5 + rnd()) * 0.45 + 2 * rnd())));
      const gp = 82 - missed;
      const high = p.prone > 0.6 ? Math.round(missed * 0.7) : 0;
      const low = Math.round((missed - high) * 0.5);
      const mod = missed - high - low;
      avail.push([p.name, p.team, season, gp, 82, low, mod, high, 0, high > 0 ? 'recurring lower-body issue (fictional)' : '']);
    }
  }

  const ctx: (string | number)[][] = [['Player', 'Team', 'Age', 'Status', 'Risk Delta', 'Manual Upside', 'Role Tags', 'Prev MPG', 'Note']];
  for (const [i, p] of players.entries()) {
    const tags = i % 23 === 7 ? 'STARTER_OPPORTUNITY' : i % 31 === 5 ? 'INJURY_AWAY_ROLE' : '';
    const status = p.prone > 0.85 ? 'OUT_SHORT' : p.prone > 0.75 ? 'DTD' : 'HEALTHY';
    const prev = i % 17 === 3 ? r1(Math.max(8, p.mpg - 7)) : '';
    ctx.push([p.name, p.team, p.age, status, '', '', tags, prev, '']);
  }

  const po: (string | number)[][] = [['Team', 'W18', 'W19', 'W20', 'W21']];
  for (const t of SAMPLE_TEAMS) po.push([t, 3 + Math.floor(rnd() * 2), 3 + Math.floor(rnd() * 2), 3 + Math.floor(rnd() * 2), 3 + Math.floor(rnd() * 2)]);

  return {
    'yahoo-market.sample.csv': csv(market),
    'projections-hashtag.sample.csv': csv(hashtag),
    'projections-bbm.sample.csv': csv(bbm),
    'availability.sample.csv': csv(avail),
    'context.sample.csv': csv(ctx),
    'playoff-schedule.sample.csv': csv(po),
  };
}
