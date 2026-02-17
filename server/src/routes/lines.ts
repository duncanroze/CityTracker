import { type Router as RouterType, Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router: RouterType = Router();

router.get('/', async (_req, res, next) => {
  try {
    const lines = await prisma.line.findMany({
      orderBy: { code: 'asc' },
      include: {
        lineStops: {
          orderBy: { position: 'asc' },
          include: {
            station: {
              select: {
                id: true,
                name: true,
                slug: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    });

    const result = lines.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      transportType: l.transportType,
      color: l.color,
      textColor: l.textColor,
      stations: l.lineStops.map((ls) => ({
        id: ls.station.id,
        name: ls.station.name,
        slug: ls.station.slug,
        latitude: ls.station.latitude,
        longitude: ls.station.longitude,
        position: ls.position,
      })),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
