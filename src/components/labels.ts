import type { CategoryState, RiskLevel, SurvivalBand } from '@/domain/types/evaluation';
import type { TimingLabel } from '@/domain/types/league';

export const LABEL_TEXT: Record<TimingLabel, string> = {
  DRAFT_NOW: 'DRAFT NOW',
  LEAN_DRAFT: 'LEAN DRAFT',
  WAIT: 'WAIT',
  SAFE_WAIT: 'SAFE WAIT',
  PASS: 'PASS',
};

export const LABEL_CLASS: Record<TimingLabel, string> = {
  DRAFT_NOW: 'bg-red-600 text-white',
  LEAN_DRAFT: 'bg-amber-500 text-white',
  WAIT: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100',
  SAFE_WAIT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
  PASS: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export const STATE_TEXT: Record<CategoryState, string> = {
  ELITE: 'ELITE',
  STRONG: 'STRONG',
  COMPETITIVE: 'COMPETITIVE',
  WEAK: 'WEAK',
  CRITICAL: 'CRITICAL',
  SOFT_PUNT: 'SOFT PUNT',
  PUNT: 'PUNT',
};

export const STATE_CLASS: Record<CategoryState, string> = {
  ELITE: 'bg-emerald-600 text-white',
  STRONG: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-50',
  COMPETITIVE: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
  WEAK: 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-50',
  CRITICAL: 'bg-red-600 text-white',
  SOFT_PUNT: 'bg-violet-200 text-violet-900 dark:bg-violet-800 dark:text-violet-50',
  PUNT: 'bg-violet-600 text-white',
};

export const STATE_BAR: Record<CategoryState, string> = {
  ELITE: 'bg-emerald-600',
  STRONG: 'bg-emerald-400',
  COMPETITIVE: 'bg-slate-400',
  WEAK: 'bg-amber-500',
  CRITICAL: 'bg-red-600',
  SOFT_PUNT: 'bg-violet-400',
  PUNT: 'bg-violet-600',
};

export const RISK_CLASS: Record<RiskLevel, string> = {
  LOW: 'text-emerald-700 dark:text-emerald-400',
  MODERATE: 'text-amber-700 dark:text-amber-400',
  HIGH: 'text-orange-700 dark:text-orange-400',
  VERY_HIGH: 'text-red-700 dark:text-red-400',
};

export const RISK_TEXT: Record<RiskLevel, string> = {
  LOW: 'LOW',
  MODERATE: 'MOD',
  HIGH: 'HIGH',
  VERY_HIGH: 'V.HIGH',
};

export const BAND_TEXT: Record<SurvivalBand, string> = {
  GONE: 'Overdue',
  UNLIKELY: 'Unlikely to last',
  TOSSUP: 'Toss-up',
  LIKELY: 'Likely lasts',
  SAFE: 'Safe',
  UNKNOWN: 'No market data',
};
