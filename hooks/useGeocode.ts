import { useState, useCallback, useRef } from 'react';
import type { GeocodeResult } from '@/types';

export function useGeocode() {
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    controllerRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Debounce 400ms to respect Nominatim rate limits
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      controllerRef.current = controller;

      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('Geocode failed');
        const data: GeocodeResult[] = await res.json();
        setResults(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
    setResults([]);
    setLoading(false);
  }, []);

  return { results, loading, search, clear };
}
