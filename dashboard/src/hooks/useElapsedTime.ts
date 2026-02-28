import { useState, useEffect, useRef } from 'react';

/** Returns elapsed seconds since `startedAt` HH:MM:SS string, or 0 if null. */
export function useElapsedTime(startedAt: string | null, active: boolean): number {
  const [elapsed, setElapsed] = useState(0);
  const originRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt || !active) {
      setElapsed(0);
      originRef.current = null;
      return;
    }

    // Parse HH:MM:SS into today's timestamp
    const [h, m, s] = startedAt.split(':').map(Number);
    const now = new Date();
    const started = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s);
    originRef.current = started.getTime();

    const tick = () => {
      if (originRef.current) {
        setElapsed(Math.floor((Date.now() - originRef.current) / 1000));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, active]);

  return elapsed;
}

export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
