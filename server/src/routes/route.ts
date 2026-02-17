import { type Router as RouterType, Router } from 'express';
import { z } from 'zod';
import { findRoutes } from '../lib/pathfinder.js';
import { enrichRouteWithDepartures } from '../lib/departures.js';

const router: RouterType = Router();

const querySchema = z.object({
  from: z.string().min(1, 'from is required'),
  to: z.string().min(1, 'to is required'),
});

router.get('/', async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { from, to } = parsed.data;

  if (from === to) {
    res.status(400).json({ error: 'Origin and destination must be different' });
    return;
  }

  const result = await findRoutes(from, to);

  // Enrich routes with real-time departure data (non-blocking: failures are silent)
  const enrichedRoutes = await Promise.all(
    result.routes.map(async (labeled) => ({
      ...labeled,
      route: await enrichRouteWithDepartures(labeled.route),
    })),
  );

  // Re-sort by enriched duration and re-label
  enrichedRoutes.sort((a, b) => a.route.totalDurationSeconds - b.route.totalDurationSeconds);
  enrichedRoutes.forEach((r, i) => {
    r.label = i === 0 ? 'Fastest' : `Option ${i + 1}`;
  });

  res.json({ ...result, routes: enrichedRoutes });
});

export default router;
