import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';

const app = express();

// CORS
app.use(cors());

// JSON body parsing
app.use(express.json());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start listening when run directly (not imported for tests)
const isDirectRun = process.argv[1]?.includes('app');
if (isDirectRun) {
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

export default app;
