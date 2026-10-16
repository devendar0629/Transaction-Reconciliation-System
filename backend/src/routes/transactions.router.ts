import { Router, Request, Response } from 'express';
import { getAllTransactions, getTransactionById } from '../services/transaction.service.js';
import { SettlementStatus } from '../types/index.js';

export const transactionsRouter = Router();

transactionsRouter.get('/', (req: Request, res: Response): void => {
  try {
    const statusQuery = req.query.settlement_status as string | undefined;
    const statusFilter = statusQuery ? (statusQuery.toUpperCase() as SettlementStatus) : undefined;

    const transactions = getAllTransactions(statusFilter);

    res.status(200).json({
      status: 'success',
      count: transactions.length,
      data: transactions,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve transactions.',
    });
  }
});

transactionsRouter.get('/:id', (req: Request, res: Response): void => {
  try {
    const id = req.params.id as string;
    const transaction = getTransactionById(id);

    if (!transaction) {
      res.status(404).json({
        status: 'error',
        message: `Transaction with ID '${id}' was not found.`,
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: transaction,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve transaction details.',
    });
  }
});
