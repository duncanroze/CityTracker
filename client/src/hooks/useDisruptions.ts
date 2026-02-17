import { useState, useEffect } from 'react';

export interface LineDisruption {
  severity: 'disrupted' | 'interrupted';
  message: string | null;
}

export type DisruptionsMap = Record<string, LineDisruption>;

export function useDisruptions() {
  const [disruptions, setDisruptions] = useState<DisruptionsMap>({});

  useEffect(() => {
    let cancelled = false;

    async function fetchDisruptions() {
      try {
        const res = await fetch('/api/disruptions');
        if (!res.ok) return;
        const data: DisruptionsMap = await res.json();
        if (!cancelled) setDisruptions(data);
      } catch {
        // silent fail
      }
    }

    fetchDisruptions();

    // Refresh every 60 seconds
    const interval = setInterval(fetchDisruptions, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return disruptions;
}
