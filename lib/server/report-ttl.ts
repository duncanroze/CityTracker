import type { ReportType } from '@prisma/client';

/** Base TTL in milliseconds per report type */
export const REPORT_TTL_MS: Record<ReportType, number> = {
  CONTROLEURS:        30 * 60 * 1000,     // 30 min
  RAME_BONDEE:        20 * 60 * 1000,     // 20 min
  ESCALATOR_PANNE:    4 * 60 * 60 * 1000, // 4h
  ASCENSEUR_PANNE:    4 * 60 * 60 * 1000, // 4h
  RETARD_NON_SIGNALE: 45 * 60 * 1000,     // 45 min
  GREVE:              12 * 60 * 60 * 1000, // 12h
};

/** TTL extension per upvote in milliseconds */
export const UPVOTE_TTL_EXTENSION_MS: Record<ReportType, number> = {
  CONTROLEURS:        10 * 60 * 1000,     // +10 min
  RAME_BONDEE:        10 * 60 * 1000,     // +10 min
  ESCALATOR_PANNE:    60 * 60 * 1000,     // +1h
  ASCENSEUR_PANNE:    60 * 60 * 1000,     // +1h
  RETARD_NON_SIGNALE: 15 * 60 * 1000,     // +15 min
  GREVE:              2 * 60 * 60 * 1000, // +2h
};

/** Max TTL = 3× base (prevents immortal reports via upvotes) */
export function maxExpiresAt(type: ReportType, createdAt: Date): Date {
  return new Date(createdAt.getTime() + REPORT_TTL_MS[type] * 3);
}

/** Rate limit: max reports per user per window */
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 min
