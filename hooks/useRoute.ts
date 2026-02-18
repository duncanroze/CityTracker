import { useState, useCallback, useRef } from 'react';
import type { LabeledRoute, MultiRouteResult } from '@/types';

export function useRoute() {
  const [routes, setRoutes] = useState<LabeledRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (fromId: string, toId: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedIndex(0);

    try {
      const res = await fetch(
        `/api/route?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Failed to find route');
      }
      const data: MultiRouteResult = await res.json();
      if (!data.found || data.routes.length === 0) {
        setError('No route found between these stations');
      } else {
        setRoutes(data.routes);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectRoute = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const clear = useCallback(() => {
    setRoutes([]);
    setSelectedIndex(0);
    setError(null);
  }, []);

  const selectedRoute = routes.length > 0 ? routes[selectedIndex] : null;

  return { routes, selectedRoute, selectedIndex, selectRoute, loading, error, search, clear };
}
