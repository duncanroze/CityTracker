import { type Router as RouterType, Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router: RouterType = Router();

router.get('/', async (_req, res) => {
  const stations = await prisma.station.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      lineStops: {
        select: {
          line: {
            select: {
              code: true,
              color: true,
              textColor: true,
              transportType: true,
            },
          },
        },
      },
    },
  });

  const result = stations.map((s) => ({
    id: s.id,
    name: s.name,
    lines: s.lineStops.map((ls) => ({
      code: ls.line.code,
      color: ls.line.color,
      textColor: ls.line.textColor,
      transportType: ls.line.transportType,
    })),
  }));

  res.json(result);
});

export default router;
