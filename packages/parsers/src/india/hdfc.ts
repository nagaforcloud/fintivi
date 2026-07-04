import { parse } from 'csv-parse/sync';
import type { ParsedTransaction, ParserCandidate, CsvParseResult } from '../types';

const HDFC_HEADERS = ['transaction date', 'narration', 'debit amount', 'credit amount'];

function findKey(header: string[], candidates: string[]): string | null {
  for (const c of candidates) {
    const found = header.find((h) => h.toLowerCase().trim() === c);
    if (found) return found;
  }
  return null;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[,\s₹$€£]/g, '').replace(/\((.*)\)/, '-$1');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function toMinor(amount: number): number {
  return Math.round(amount * 100);
}

function hashFingerprint(date: string, description: string, amountMinor: number): string {
  const str = `${date}|${description.toLowerCase().trim()}|${amountMinor}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(16);
}

export function parseHdfcCsv(buffer: Buffer, filename: string): {
  rows: CsvParseResult[];
  candidates: ParserCandidate[];
  warnings: string[];
} {
  const text = buffer.toString('utf-8');
  const records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
  const warnings: string[] = [];

  if (!records.length) {
    return { rows: [], candidates: [], warnings: ['empty CSV'] };
  }

  const header = Object.keys(records[0]!);
  const dateKey = findKey(header, HDFC_HEADERS);
  const descKey = findKey(header, ['narration', 'description', 'particulars']);
  const debitKey = findKey(header, ['debit amount', 'debit', 'withdrawal']);
  const creditKey = findKey(header, ['credit amount', 'credit', 'deposit']);

  let confidence = 0;

  if (dateKey && dateKey.toLowerCase().trim() === 'transaction date') confidence += 0.3;
  if (descKey && descKey.toLowerCase().trim() === 'narration') confidence += 0.3;
  if (debitKey && debitKey.toLowerCase().trim() === 'debit amount') confidence += 0.2;
  if (creditKey && creditKey.toLowerCase().trim() === 'credit amount') confidence += 0.2;

  if (confidence < 0.5 && !warnings.length) {
    warnings.push('HDFC-specific columns not fully matched');
  }

  if (!dateKey) {
    warnings.push('no date column found');
    return { rows: [], candidates: [makeCandidate('hdfc-csv', confidence, warnings)], warnings };
  }
  if (!descKey) {
    warnings.push('no narration column found');
    return { rows: [], candidates: [makeCandidate('hdfc-csv', confidence, warnings)], warnings };
  }
  if (!debitKey && !creditKey) {
    warnings.push('no debit or credit column found');
    return { rows: [], candidates: [makeCandidate('hdfc-csv', confidence, warnings)], warnings };
  }

  const rows: CsvParseResult[] = [];

  for (const r of records) {
    const postedAt = normalizeDate(r[dateKey!] ?? '');
    const description = r[descKey!] ?? '';
    const debit = debitKey ? parseAmount(r[debitKey!] ?? '0') : 0;
    const credit = creditKey ? parseAmount(r[creditKey!] ?? '0') : 0;
    const amount = (Number.isFinite(credit) ? credit : 0) - (Number.isFinite(debit) ? debit : 0);

    if (!Number.isFinite(amount)) continue;
    if (!postedAt) continue;

    rows.push({
      postedAt,
      description,
      amountMinor: toMinor(amount),
      raw: r as Record<string, unknown>,
    });
  }

  return {
    rows,
    candidates: [makeCandidate('hdfc-csv', confidence, warnings)],
    warnings,
  };
}

function makeCandidate(parserId: string, confidence: number, warnings: string[]): ParserCandidate {
  return { parserId, market: 'india', confidence, detectedBank: 'HDFC', warnings };
}

function normalizeDate(dateStr: string): string {
  const trimmed = dateStr.trim();
  const parts = trimmed.split(/[/\-.]/);
  if (parts.length === 3) {
    if (parts[2]!.length === 4) {
      if (parts[0]!.length === 4) return `${parts[0]}-${parts[1]!.padStart(2, '0')}-${parts[2]!.padStart(2, '0')}`;
      if (parts[2]!.length === 4) return `${parts[2]}-${parts[0]!.padStart(2, '0')}-${parts[1]!.padStart(2, '0')}`;
    }
  }
  return trimmed;
}

export function toHdfcTransaction(row: CsvParseResult): ParsedTransaction {
  return {
    postedAt: row.postedAt,
    description: row.description,
    amountMinor: row.amountMinor,
    currency: 'INR',
    externalFingerprint: hashFingerprint(row.postedAt, row.description, row.amountMinor),
    raw: row.raw,
  };
}

export function sniff(text: string): boolean {
  const lower = text.toLowerCase();
  return HDFC_HEADERS.some((h) => lower.includes(h));
}
