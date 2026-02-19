import { useEffect, useState } from 'react';
import type { LineWithStations } from '@/types';

export function useLines() {
  const [lines, setLines] = useState<LineWithStations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/lines', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch lines');
        return res.json();
      })
      .then((data: LineWithStations[]) => {
        setLines(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setError(err.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { lines, loading, error };
}
