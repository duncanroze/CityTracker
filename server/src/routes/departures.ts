import { type Router as RouterType, Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { getNextDepartures } from "../lib/prim.js";

const router: RouterType = Router();

const querySchema = z.object({
  lineStopId: z.string().min(1, "lineStopId is required"),
});

router.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { lineStopId } = parsed.data;

    // Look up the IDFM stop mapping
    const mapping = await prisma.idfmStopMapping.findUnique({
      where: { lineStopId },
      include: {
        lineStop: {
          include: { line: true },
        },
      },
    });

    if (!mapping) {
      res.status(404).json({ error: "No IDFM mapping found for this stop" });
      return;
    }

    const allDepartures = await getNextDepartures(mapping.idfmStopId, mapping.isStopArea);

    // Filter by the line's IDFM reference if available
    const idfmLineId = mapping.lineStop.line.idfmId;
    const departures = idfmLineId
      ? allDepartures.filter((d) => d.lineRef.includes(idfmLineId))
      : allDepartures;

    res.json({
      departures: departures.map((d) => ({
        destination: d.destination,
        expectedTime: d.expectedDeparture,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
