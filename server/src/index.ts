import express from 'express';
import stationsRouter from './routes/stations.js';
import routeRouter from './routes/route.js';
import departuresRouter from './routes/departures.js';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/stations', stationsRouter);
app.use('/api/route', routeRouter);
app.use('/api/departures', departuresRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
