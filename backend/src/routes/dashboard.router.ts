import { Router, Request, Response } from 'express';
import { getDashboardSummary } from '../services/transaction.service.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (req: Request, res: Response): void => {
  try {
    const summary = getDashboardSummary();

    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve dashboard summary.',
    });
  }
});
