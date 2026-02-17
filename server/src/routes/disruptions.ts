import { type Router as RouterType, Router } from 'express';
import { getDisruptions } from '../lib/disruptions.js';

const router: RouterType = Router();

router.get('/', async (_req, res, next) => {
  try {
    const disruptions = await getDisruptions();

    // Return as object keyed by line code
    const result: Record<string, { severity: string; message: string | null }> = {};
    for (const [code, d] of disruptions) {
      if (d.severity !== 'ok') {
        result[code] = { severity: d.severity, message: d.message };
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
