import { createApp } from './app.js';
import { getDatabase, initDatabase } from './config/db.js';
import { seedDatabase } from './config/seed.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  const db = initDatabase();

  // Check if database needs initial seeding
  const row = db.prepare<[], { count: number }>('SELECT COUNT(*) as count FROM transactions').get();
  if (!row || row.count === 0) {
    console.log('Database empty. Running initial seed...');
    seedDatabase(db);
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` Transaction Reconciliation API Server Started `);
    console.log(` Port:    http://localhost:${PORT}`);
    console.log(` Health:  http://localhost:${PORT}/health`);
    console.log(`=================================================`);
  });

  process.on('SIGINT', () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
