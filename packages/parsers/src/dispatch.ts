import type { ParserMarket, ParserCandidate, ParsedTransaction, ParserResult } from './types';
import { parseCsv, toTransaction } from './generic/csv';
import { parseHdfcCsv, toHdfcTransaction, sniff } from './india/hdfc';

type ParserHandler = {
  id: string;
  market: ParserMarket;
  detect: (buffer: Buffer, filename: string) => boolean;
  parse: (buffer: Buffer, filename: string) => {
    rows: Array<{ postedAt: string; description: string; amountMinor: number; raw: Record<string, unknown> }>;
    candidates: ParserCandidate[];
    warnings: string[];
  };
  toTransaction: (row: any) => ParsedTransaction;
  currency: string;
};

const parsers: ParserHandler[] = [
  {
    id: 'generic-csv',
    market: 'global',
    detect: (_buf, filename) => filename.toLowerCase().endsWith('.csv'),
    parse: parseCsv,
    toTransaction: (row) => toTransaction(row, 'USD'),
    currency: 'USD',
  },
  {
    id: 'hdfc-csv',
    market: 'india',
    detect: (buf, filename) => {
      if (!filename.toLowerCase().endsWith('.csv')) return false;
      return sniff(buf.toString('utf-8'));
    },
    parse: parseHdfcCsv,
    toTransaction: (row) => toHdfcTransaction(row),
    currency: 'INR',
  },
];

function detectParser(buffer: Buffer, filename: string): ParserHandler[] {
  return parsers.filter((p) => p.detect(buffer, filename));
}

export async function dispatchParser(
  buffer: Buffer,
  filename: string,
  market?: ParserMarket,
): Promise<ParserResult> {
  const matching = detectParser(buffer, filename);
  const allCandidates: ParserCandidate[] = [];
  let bestResult: ParserResult | null = null;
  let bestConfidence = 0;

  for (const parser of matching) {
    if (market && parser.market !== market) continue;

    const result = parser.parse(buffer, filename);
    const candidate = result.candidates[0];

    if (!candidate) continue;

    if (candidate.confidence >= 0.3) {
      allCandidates.push(...result.candidates);

      if (candidate.confidence > bestConfidence) {
        bestConfidence = candidate.confidence;
        const transactions = result.rows.map((row) => parser.toTransaction(row));
        const warnings = [...result.warnings];
        if (candidate.confidence < 0.7) {
          warnings.push('Low-confidence parse — please verify the transactions');
        }
        bestResult = { transactions, candidates: [candidate], warnings };
      }
    }
  }

  if (!bestResult) {
    return {
      transactions: [],
      candidates: allCandidates,
      warnings: ['No suitable parser found for the provided file'],
    };
  }

  return bestResult;
}
