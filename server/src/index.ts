import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from './lib/prisma.js';
import { env } from './env.js';
import stationsRouter from './routes/stations.js';
import routeRouter from './routes/route.js';
import departuresRouter from './routes/departures.js';
import disruptionsRouter from './routes/disruptions.js';
import linesRouter from './routes/lines.js';

const app = express();

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.use('/api/stations', stationsRouter);
app.use('/api/route', routeRouter);
app.use('/api/departures', departuresRouter);
app.use('/api/disruptions', disruptionsRouter);
app.use('/api/lines', linesRouter);

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(env.PORT, () => {
  console.log(`Server running on http://localhost:${env.PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
