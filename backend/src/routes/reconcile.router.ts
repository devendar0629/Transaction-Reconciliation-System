import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { parseAndValidateSettlementCSV } from '../services/csv-parser.service.js';
import { runReconciliation } from '../services/reconciliation.service.js';
import { seedDatabase } from '../config/seed.js';
import { getDatabase } from '../config/db.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export const reconcileRouter = Router();

reconcileRouter.post('/', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    let csvData = '';

    if (req.file) {
      csvData = req.file.buffer.toString('utf-8');
    } else {
      // Process default settlement_report.csv
      const defaultPaths = [
        path.resolve(process.cwd(), 'data', 'settlement_report.csv'),
        path.resolve(process.cwd(), 'backend', 'data', 'settlement_report.csv'),
        path.resolve(__dirname, '../../data', 'settlement_report.csv'),
      ];

      const foundPath = defaultPaths.find((p) => fs.existsSync(p));
      if (!foundPath) {
        res.status(404).json({
          status: 'error',
          message: 'Default settlement_report.csv file not found on server.',
        });
        return;
      }

      csvData = fs.readFileSync(foundPath, 'utf-8');
    }

    const { validRecords, duplicateRecords: parseDuplicates, malformedRecords } =
      parseAndValidateSettlementCSV(csvData);

    const summary = runReconciliation(validRecords);

    // Merge in parse-time duplicates and malformed records
    summary.duplicate_records.push(...parseDuplicates);
    if (malformedRecords.length > 0) {
      for (const m of malformedRecords) {
        summary.unmatched_records.push({
          settlement_id: `ROW_${m.row}`,
          lifecycle_id: null,
          account_id: 'N/A',
          merchant_name: 'N/A',
          settlement_amount: 0,
          settlement_type: 'UNKNOWN',
          reason: `Malformed CSV record at line ${m.row}: ${m.reason}`,
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Reconciliation process completed successfully.',
      summary,
    });
  } catch (error: any) {
    res.status(400).json({
      status: 'error',
      message: error.message || 'An error occurred during reconciliation.',
    });
  }
});

// Helper endpoint to reset and re-seed database (convenient for test runs & demo resets)
reconcileRouter.post('/reset', (req: Request, res: Response): void => {
  try {
    seedDatabase(getDatabase());
    res.status(200).json({
      status: 'success',
      message: 'Database reset and re-seeded to initial state.',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to reset database.',
    });
  }
});
