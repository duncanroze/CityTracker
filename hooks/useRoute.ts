import { useState, useCallback, useRef } from 'react';
import type { LabeledRoute, MultiRouteResult, PickerSelection } from '@/types';

function buildSearchParams(from: PickerSelection, to: PickerSelection): URLSearchParams {
  const params = new URLSearchParams();

  if (from.type === 'station') {
    params.set('from', from.station.id);
  } else {
    params.set('fromLat', String(from.lat));
    params.set('fromLng', String(from.lng));
    params.set('fromAddress', from.address);
  }

  if (to.type === 'station') {
    params.set('to', to.station.id);
  } else {
    params.set('toLat', String(to.lat));
    params.set('toLng', String(to.lng));
    params.set('toAddress', to.address);
  }

  return params;
}

export function useRoute() {
  const [routes, setRoutes] = useState<LabeledRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (from: PickerSelection, to: PickerSelection) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedIndex(0);

    try {
      const params = buildSearchParams(from, to);
      const res = await fetch(
        `/api/route?${params.toString()}`,
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
