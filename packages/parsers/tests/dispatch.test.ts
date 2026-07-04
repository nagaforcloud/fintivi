import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { dispatchParser } from '../src/dispatch';
import { parseCsv, toTransaction } from '../src/generic/csv';
import { parseHdfcCsv, sniff } from '../src/india/hdfc';

function fixture(path: string): Buffer {
  return readFileSync(resolve(__dirname, '..', path));
}

describe('dispatchParser', () => {
  it('global sample chooses generic parser with confidence >= 0.8', async () => {
    const buf = fixture('fixtures/global/sample.csv');
    const result = await dispatchParser(buf, 'sample.csv');

    expect(result.candidates.length).toBeGreaterThan(0);
    const best = result.candidates[0]!;
    expect(best.parserId).toBe('generic-csv');
    expect(best.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.transactions.length).toBe(5);
  });

  it('india sample chooses india parser with confidence >= 0.8', async () => {
    const buf = fixture('fixtures/india/sample.csv');
    const result = await dispatchParser(buf, 'sample.csv');

    expect(result.candidates.length).toBeGreaterThan(0);
    const best = result.candidates[0]!;
    expect(best.parserId).toBe('hdfc-csv');
    expect(best.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.transactions.length).toBe(5);
  });

  it('malformed file returns no high-confidence parser', async () => {
    const buf = Buffer.from('This is not a CSV file at all\njust some garbage text');
    const result = await dispatchParser(buf, 'notes.txt');

    expect(result.transactions.length).toBe(0);
    expect(result.candidates.length).toBe(0);
    expect(result.warnings).toContain('No suitable parser found for the provided file');
  });

  it('parser output includes externalFingerprint for dedupe', async () => {
    const buf = fixture('fixtures/global/sample.csv');
    const result = await dispatchParser(buf, 'sample.csv');

    for (const txn of result.transactions) {
      expect(txn.externalFingerprint).toBeTruthy();
      expect(typeof txn.externalFingerprint).toBe('string');
    }

    const fingerprints = result.transactions.map((t) => t.externalFingerprint);
    const unique = new Set(fingerprints);
    expect(unique.size).toBe(result.transactions.length);
  });

  it('CSV parser handles debit/credit columns correctly', async () => {
    const csv = 'Transaction Date,Narration,Debit Amount,Credit Amount\n' +
      '01-01-2026,UPI PAYMENT,500.00,\n' +
      '02-01-2026,SALARY CREDIT,,75000.00\n';

    const buf = Buffer.from(csv);
    const result = await dispatchParser(buf, 'statement.csv');

    expect(result.transactions.length).toBe(2);

    const debitTxn = result.transactions[0]!;
    expect(debitTxn.amountMinor).toBe(-50000);
    expect(debitTxn.description).toBe('UPI PAYMENT');

    const creditTxn = result.transactions[1]!;
    expect(creditTxn.amountMinor).toBe(7500000);
    expect(creditTxn.description).toBe('SALARY CREDIT');
  });

  it('dispatcher returns warnings for low confidence', async () => {
    const csv = 'Foo,Bar,Baz\n1,2,3\n4,5,6\n';
    const buf = Buffer.from(csv);
    const result = await dispatchParser(buf, 'unknown.csv');

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.transactions.length).toBe(0);
  });
});

describe('sniff', () => {
  it('detects HDFC format', () => {
    expect(sniff('Transaction Date,Narration,Debit Amount,Credit Amount')).toBe(true);
  });

  it('rejects non-HDFC format', () => {
    expect(sniff('Date,Description,Amount')).toBe(false);
  });
});
