import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('headways', () => {
  let getLineHeadway: typeof import('../headways').getLineHeadway;
  let updateLineHeadway: typeof import('../headways').updateLineHeadway;
  let getBoardingPenalty: typeof import('../headways').getBoardingPenalty;

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    const mod = await import('../headways');
    getLineHeadway = mod.getLineHeadway;
    updateLineHeadway = mod.updateLineHeadway;
    getBoardingPenalty = mod.getBoardingPenalty;
  });

  describe('getLineHeadway', () => {
    it('returns default headway for metro', () => {
      expect(getLineHeadway('M1', 'metro')).toBe(150);
    });

    it('returns default headway for RER', () => {
      expect(getLineHeadway('RER-A', 'rer')).toBe(600);
    });

    it('returns default headway for transilien', () => {
      expect(getLineHeadway('L', 'transilien')).toBe(900);
    });

    it('returns default headway for tram', () => {
      expect(getLineHeadway('T1', 'tram')).toBe(420);
    });

    it('returns 180s fallback for unknown transport type', () => {
      expect(getLineHeadway('X', 'funicular')).toBe(180);
    });

    it('is case-insensitive for transport type', () => {
      expect(getLineHeadway('M1', 'Metro')).toBe(150);
      expect(getLineHeadway('M1', 'METRO')).toBe(150);
    });
  });

  describe('updateLineHeadway', () => {
    it('updates cache with valid departure times', () => {
      const now = Date.now();
      const departures = [
        new Date(now),
        new Date(now + 120_000),  // +2 min
        new Date(now + 240_000),  // +4 min
      ];
      updateLineHeadway('M1', departures);
      expect(getLineHeadway('M1', 'metro')).toBe(120); // avg gap = 120s
    });

    it('does nothing with fewer than 2 departures', () => {
      updateLineHeadway('M1', [new Date()]);
      expect(getLineHeadway('M1', 'metro')).toBe(150); // still default
    });

    it('does nothing with empty array', () => {
      updateLineHeadway('M1', []);
      expect(getLineHeadway('M1', 'metro')).toBe(150);
    });

    it('ignores gaps > 30 minutes (service breaks)', () => {
      const now = Date.now();
      const departures = [
        new Date(now),
        new Date(now + 2_400_000), // +40 min (ignored)
        new Date(now + 2_520_000), // +42 min → gap to prev = 2 min
      ];
      updateLineHeadway('M1', departures);
      expect(getLineHeadway('M1', 'metro')).toBe(120); // only 2-min gap counts
    });

    it('ignores zero-second gaps', () => {
      const now = Date.now();
      const departures = [
        new Date(now),
        new Date(now),           // 0s gap (ignored)
        new Date(now + 180_000), // +3 min
      ];
      updateLineHeadway('M1', departures);
      expect(getLineHeadway('M1', 'metro')).toBe(180); // only 180s gap counts
    });

    it('returns default when all gaps are invalid', () => {
      const now = Date.now();
      const departures = [
        new Date(now),
        new Date(now + 3_600_000), // +60 min (ignored)
      ];
      updateLineHeadway('M1', departures);
      expect(getLineHeadway('M1', 'metro')).toBe(150); // still default
    });

    it('rounds average to nearest second', () => {
      const now = Date.now();
      const departures = [
        new Date(now),
        new Date(now + 100_000), // 100s
        new Date(now + 250_000), // 150s gap
      ];
      updateLineHeadway('M1', departures);
      // avg = (100 + 150) / 2 = 125
      expect(getLineHeadway('M1', 'metro')).toBe(125);
    });
  });

  describe('cache expiration', () => {
    it('returns cached value within TTL', () => {
      const now = Date.now();
      const departures = [new Date(now), new Date(now + 90_000)];
      updateLineHeadway('M1', departures);
      expect(getLineHeadway('M1', 'metro')).toBe(90);
    });

    it('returns default after cache expires (5 min)', () => {
      const realNow = Date.now();
      const departures = [new Date(realNow), new Date(realNow + 90_000)];

      // Update with mocked time
      vi.spyOn(Date, 'now').mockReturnValue(realNow);
      updateLineHeadway('M1', departures);
      expect(getLineHeadway('M1', 'metro')).toBe(90);

      // Advance past 5 min TTL
      vi.spyOn(Date, 'now').mockReturnValue(realNow + 5 * 60 * 1000 + 1);
      expect(getLineHeadway('M1', 'metro')).toBe(150); // back to default
    });
  });

  describe('getBoardingPenalty', () => {
    it('returns half of default headway', () => {
      expect(getBoardingPenalty('M1', 'metro')).toBe(75); // 150 / 2
    });

    it('returns half of cached headway', () => {
      const now = Date.now();
      updateLineHeadway('M1', [new Date(now), new Date(now + 200_000)]);
      expect(getBoardingPenalty('M1', 'metro')).toBe(100); // 200 / 2
    });

    it('rounds to nearest second', () => {
      const now = Date.now();
      // 3 departures: gaps of 100s and 150s → avg = 125s → penalty = 63 (rounded)
      updateLineHeadway('M1', [
        new Date(now),
        new Date(now + 100_000),
        new Date(now + 250_000),
      ]);
      expect(getBoardingPenalty('M1', 'metro')).toBe(63); // Math.round(125 / 2)
    });
  });
});
