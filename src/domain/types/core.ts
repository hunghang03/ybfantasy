export const CATEGORIES = ['FG_PCT', 'FT_PCT', 'THREES', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Counting categories where more is better. Used for the missed-game loss L (§5.4). */
export const COUNTING_POSITIVE = ['THREES', 'PTS', 'REB', 'AST', 'STL', 'BLK'] as const;
export type CountingPositive = (typeof COUNTING_POSITIVE)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  FG_PCT: 'FG%',
  FT_PCT: 'FT%',
  THREES: '3PM',
  PTS: 'PTS',
  REB: 'REB',
  AST: 'AST',
  STL: 'STL',
  BLK: 'BLK',
  TO: 'TO',
};

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
export type Position = (typeof POSITIONS)[number];

export const ACTIVE_SLOTS = ['PG', 'SG', 'G', 'SF', 'PF', 'F', 'C', 'UTIL'] as const;
export type ActiveSlot = (typeof ACTIVE_SLOTS)[number];

export const SLOT_ELIGIBILITY: Record<ActiveSlot, readonly Position[]> = {
  PG: ['PG'],
  SG: ['SG'],
  G: ['PG', 'SG'],
  SF: ['SF'],
  PF: ['PF'],
  F: ['SF', 'PF'],
  C: ['C'],
  UTIL: POSITIONS,
};

export type ProviderId = string;

export const INJURY_STATUSES = [
  'HEALTHY',
  'DTD',
  /** Injured, duration not stated by the source (Yahoo "INJ"). Never read as short- or long-term. */
  'INJ',
  'OUT_SHORT',
  'OUT_LONG',
  'OUT_SEASON',
  'SUSPENDED',
] as const;
export type InjuryStatus = (typeof INJURY_STATUSES)[number];

export const RECURRENCES = ['LOW', 'MODERATE', 'HIGH', 'UNCLASSIFIED'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const ROLE_TAGS = [
  'STARTER_OPPORTUNITY',
  'INJURY_AWAY_ROLE',
  'DEPTH_CHART_RISE',
  'ROOKIE_ROLE',
] as const;
export type RoleTag = (typeof ROLE_TAGS)[number];

export type CategoryRecord<T> = Record<Category, T>;

export function mapCategories<T>(fn: (c: Category) => T): CategoryRecord<T> {
  const out = {} as CategoryRecord<T>;
  for (const c of CATEGORIES) out[c] = fn(c);
  return out;
}
