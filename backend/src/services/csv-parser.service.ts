import { CSVSettlementRecord, SettlementType } from '../types/index.js';

export interface ParseResult {
  validRecords: CSVSettlementRecord[];
  duplicateRecords: { settlement_id: string; reason: string }[];
  malformedRecords: { row: number; raw: string; reason: string }[];
}

export function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

export function parseAndValidateSettlementCSV(csvContent: string): ParseResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headerLine = lines[0];
  if (!headerLine) {
    throw new Error('CSV file has no header row');
  }

  const headers = parseCSVLine(headerLine).map((h) => h.toLowerCase());

  const expectedHeaders = [
    'settlement_id',
    'lifecycle_id',
    'account_id',
    'merchant_name',
    'transaction_date',
    'settlement_date',
    'settlement_amount',
    'settlement_type',
    'currency',
  ];

  for (const expected of expectedHeaders) {
    if (!headers.includes(expected)) {
      throw new Error(`CSV is missing required header: ${expected}`);
    }
  }

  const colIdx = {
    settlement_id: headers.indexOf('settlement_id'),
    lifecycle_id: headers.indexOf('lifecycle_id'),
    account_id: headers.indexOf('account_id'),
    merchant_name: headers.indexOf('merchant_name'),
    transaction_date: headers.indexOf('transaction_date'),
    settlement_date: headers.indexOf('settlement_date'),
    settlement_amount: headers.indexOf('settlement_amount'),
    settlement_type: headers.indexOf('settlement_type'),
    currency: headers.indexOf('currency'),
  };

  const validRecords: CSVSettlementRecord[] = [];
  const duplicateRecords: { settlement_id: string; reason: string }[] = [];
  const malformedRecords: { row: number; raw: string; reason: string }[] = [];
  const seenSettlementIds = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const cols = parseCSVLine(rawLine);

    if (cols.length < headers.length) {
      malformedRecords.push({
        row: i + 1,
        raw: rawLine,
        reason: `Insufficient column count: expected ${headers.length}, found ${cols.length}`,
      });
      continue;
    }

    const settlement_id = cols[colIdx.settlement_id]?.trim();
    if (!settlement_id) {
      malformedRecords.push({
        row: i + 1,
        raw: rawLine,
        reason: 'Missing settlement_id',
      });
      continue;
    }

    // Check duplicate settlement_id in this batch
    if (seenSettlementIds.has(settlement_id)) {
      duplicateRecords.push({
        settlement_id,
        reason: `Duplicate settlement_id '${settlement_id}' found in upload batch`,
      });
      continue;
    }

    const rawAmount = cols[colIdx.settlement_amount];
    const amount = Number(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      malformedRecords.push({
        row: i + 1,
        raw: rawLine,
        reason: `Invalid settlement_amount '${rawAmount}': must be a strictly positive number`,
      });
      continue;
    }

    const rawType = cols[colIdx.settlement_type]?.toUpperCase();
    if (rawType !== 'DEBIT' && rawType !== 'CREDIT') {
      malformedRecords.push({
        row: i + 1,
        raw: rawLine,
        reason: `Invalid settlement_type '${rawType}': must be 'DEBIT' or 'CREDIT'`,
      });
      continue;
    }

    const rawLifecycleId = cols[colIdx.lifecycle_id]?.trim();
    const lifecycle_id = rawLifecycleId ? rawLifecycleId : null;
    const account_id = cols[colIdx.account_id]?.trim() || '';
    const merchant_name = cols[colIdx.merchant_name]?.trim() || '';
    const transaction_date = cols[colIdx.transaction_date]?.trim() || '';
    const settlement_date = cols[colIdx.settlement_date]?.trim() || '';
    const currency = cols[colIdx.currency]?.trim().toUpperCase() || 'USD';

    if (!account_id || !merchant_name || !transaction_date || !settlement_date) {
      malformedRecords.push({
        row: i + 1,
        raw: rawLine,
        reason: 'Missing mandatory fields (account_id, merchant_name, transaction_date, or settlement_date)',
      });
      continue;
    }

    seenSettlementIds.add(settlement_id);

    validRecords.push({
      settlement_id,
      lifecycle_id,
      account_id,
      merchant_name,
      transaction_date,
      settlement_date,
      settlement_amount: Math.round(amount * 100) / 100,
      settlement_type: rawType as SettlementType,
      currency,
    });
  }

  return {
    validRecords,
    duplicateRecords,
    malformedRecords,
  };
}
