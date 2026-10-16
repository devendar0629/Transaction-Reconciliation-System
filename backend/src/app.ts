import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { reconcileRouter } from './routes/reconcile.router.js';
import { transactionsRouter } from './routes/transactions.router.js';
import { dashboardRouter } from './routes/dashboard.router.js';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST API Routes
  app.use('/reconcile', reconcileRouter);
  app.use('/transactions', transactionsRouter);
  app.use('/dashboard', dashboardRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Central error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message || 'Internal Server Error',
    });
  });

  return app;
}
