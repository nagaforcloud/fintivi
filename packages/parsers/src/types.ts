export type ParserMarket = "global" | "india";

export type ParserCandidate = {
  parserId: string;
  market: ParserMarket;
  confidence: number;
  accountName?: string;
  detectedBank?: string;
  warnings: string[];
};

export type ParsedTransaction = {
  postedAt: string;
  description: string;
  amountMinor: number;
  currency: string;
  externalFingerprint: string;
  raw: Record<string, unknown>;
};

export type ParserResult = {
  transactions: ParsedTransaction[];
  candidates: ParserCandidate[];
  warnings: string[];
};

export type CsvParseResult = {
  postedAt: string;
  description: string;
  amountMinor: number;
  raw: Record<string, unknown>;
};
