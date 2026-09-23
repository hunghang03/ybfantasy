import Papa from 'papaparse';
import { INJURY_STATUSES, POSITIONS, ROLE_TAGS, type InjuryStatus, type Position, type RoleTag } from '../types/core';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
}

/** Parse CSV text (or JSON array text) into string rows. Pure; never evaluates content. */
export function parseTable(text: string, format: 'csv' | 'json' = 'csv'): ParsedTable {
  if (text.length > MAX_IMPORT_BYTES) return { headers: [], rows: [], errors: ['File exceeds 5 MB limit.'] };
  if (format === 'json') return parseJsonTable(text);
  const res = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  const errors = res.errors.slice(0, 20).map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  const headers = (res.meta.fields ?? []).filter((h) => h.length > 0);
  let rows = res.data.map((r) => {
    const o: Record<string, string> = {};
    for (const h of headers) o[h] = typeof r[h] === 'string' ? (r[h] as string).trim() : '';
    return o;
  });
  if (rows.length > MAX_IMPORT_ROWS) {
    errors.push(`Only the first ${MAX_IMPORT_ROWS} rows were read.`);
    rows = rows.slice(0, MAX_IMPORT_ROWS);
  }
  return { headers, rows, errors };
}

function parseJsonTable(text: string): ParsedTable {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { headers: [], rows: [], errors: ['Invalid JSON.'] };
  }
  if (!Array.isArray(data)) return { headers: [], rows: [], errors: ['JSON must be an array of objects.'] };
  const headers = new Set<string>();
  const rows: Record<string, string>[] = [];
  for (const item of data.slice(0, MAX_IMPORT_ROWS)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
      headers.add(k);
      o[k] = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
    rows.push(o);
  }
  return { headers: [...headers], rows, errors: data.length > MAX_IMPORT_ROWS ? ['Truncated to row limit.'] : [] };
}

/** Parse a numeric cell: "12.3", "45%", "1,234", "" → number | null. Non-numeric → NaN (caller rejects). */
export function parseNumber(cell: string | undefined): number | null {
  if (cell === undefined) return null;
  const t = cell.trim();
  if (t === '' || t === '-' || t === '—' || t.toLowerCase() === 'n/a' || t.toLowerCase() === 'na') return null;
  const pct = t.endsWith('%');
  const n = Number(t.replace(/[%,\s]/g, ''));
  if (!Number.isFinite(n)) return Number.NaN;
  return pct ? n / 100 : n;
}

/**
 * Parse a percentage cell that may carry makes/attempts, e.g. Hashtag style "0.483 (7.1/14.7)".
 * Percent values > 1 are treated as 0–100 scale.
 */
export function parsePctCell(cell: string | undefined): { pct: number | null; makes: number | null; attempts: number | null } {
  if (cell === undefined || cell.trim() === '') return { pct: null, makes: null, attempts: null };
  const m = /^\s*([\d.]+%?)\s*\(\s*([\d.]+)\s*\/\s*([\d.]+)\s*\)\s*$/.exec(cell);
  if (m) {
    const p = parseNumber(m[1]);
    return { pct: p !== null && p > 1 ? p / 100 : p, makes: Number(m[2]), attempts: Number(m[3]) };
  }
  const p = parseNumber(cell);
  return { pct: p !== null && Number.isFinite(p) && p > 1 ? p / 100 : p, makes: null, attempts: null };
}

export function parsePositions(cell: string | undefined): { positions: Position[]; invalid: string[] } {
  if (!cell) return { positions: [], invalid: [] };
  const out = new Set<Position>();
  const invalid: string[] = [];
  for (const raw of cell.split(/[,/;|\s]+/)) {
    const t = raw.trim().toUpperCase();
    if (!t) continue;
    if ((POSITIONS as readonly string[]).includes(t)) out.add(t as Position);
    else if (t === 'G') {
      out.add('PG');
      out.add('SG');
    } else if (t === 'F') {
      out.add('SF');
      out.add('PF');
    } else if (t === 'UTIL' || t === 'BN' || t === 'IL' || t === 'IL+') continue;
    else invalid.push(t);
  }
  return { positions: POSITIONS.filter((p) => out.has(p)), invalid };
}

const STATUS_ALIASES: Record<string, InjuryStatus> = {
  '': 'HEALTHY',
  HEALTHY: 'HEALTHY',
  ACTIVE: 'HEALTHY',
  DTD: 'DTD',
  GTD: 'DTD',
  Q: 'DTD',
  QUESTIONABLE: 'DTD',
  P: 'DTD',
  PROBABLE: 'DTD',
  O: 'OUT_SHORT',
  OUT: 'OUT_SHORT',
  INJ: 'OUT_SHORT',
  OUT_SHORT: 'OUT_SHORT',
  IL: 'OUT_LONG',
  'OUT-LONG': 'OUT_LONG',
  OUT_LONG: 'OUT_LONG',
  NA: 'OUT_LONG',
  OFS: 'OUT_SEASON',
  OUT_SEASON: 'OUT_SEASON',
  'OUT FOR SEASON': 'OUT_SEASON',
  SUSP: 'SUSPENDED',
  SUSPENDED: 'SUSPENDED',
};

export function parseStatus(cell: string | undefined): InjuryStatus | 'INVALID' {
  const t = (cell ?? '').trim().toUpperCase();
  if ((INJURY_STATUSES as readonly string[]).includes(t)) return t as InjuryStatus;
  return STATUS_ALIASES[t] ?? 'INVALID';
}

export function parseRoleTags(cell: string | undefined): { tags: RoleTag[]; invalid: string[] } {
  const tags: RoleTag[] = [];
  const invalid: string[] = [];
  for (const raw of (cell ?? '').split(/[;,|]+/)) {
    const t = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (!t) continue;
    if ((ROLE_TAGS as readonly string[]).includes(t)) tags.push(t as RoleTag);
    else invalid.push(t);
  }
  return { tags, invalid };
}

/** Strip control characters and cap length for free-text fields. Rendered only via React escaping. */
export function sanitizeText(s: string | undefined, max = 300): string {
  return (s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}
