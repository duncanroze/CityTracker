import { useState, useCallback, useRef } from 'react';
import type { LabeledRoute, MultiRouteResult, PickerSelection, DirectEstimate } from '@/types';

export type SortStrategy = 'fastest' | 'fewest_transfers' | 'least_walking';

function buildSearchParams(from: PickerSelection, to: PickerSelection, strategy?: SortStrategy): URLSearchParams {
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

  if (strategy && strategy !== 'fastest') {
    params.set('strategy', strategy);
  }

  return params;
}

export function useRoute() {
  const [routes, setRoutes] = useState<LabeledRoute[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walkingEstimate, setWalkingEstimate] = useState<DirectEstimate | null>(null);
  const [cyclingEstimate, setCyclingEstimate] = useState<DirectEstimate | null>(null);
  const [strategy, setStrategy] = useState<SortStrategy>('fastest');
  const controllerRef = useRef<AbortController | null>(null);
  // Remember last search params to allow re-searching with different strategy
  const lastSearchRef = useRef<{ from: PickerSelection; to: PickerSelection } | null>(null);

  const search = useCallback(async (from: PickerSelection, to: PickerSelection, strat: SortStrategy = 'fastest', isStrategyChange = false) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    lastSearchRef.current = { from, to };
    setLoading(true);
    setError(null);
    // Don't clear routes on strategy change — keeps the UI stable while loading
    if (!isStrategyChange) {
      setRoutes([]);
      setWalkingEstimate(null);
      setCyclingEstimate(null);
    }
    setSelectedIndex(0);
    setStrategy(strat);

    try {
      const params = buildSearchParams(from, to, strat);
      // Skip walking/cycling estimates on strategy changes — they don't depend on strategy
      if (isStrategyChange) params.set('skipEstimates', '1');
      const res = await fetch(
        `/api/route?${params.toString()}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'Impossible de trouver un itinéraire');
      }
      const data: MultiRouteResult = await res.json();
      if (!data.found || data.routes.length === 0) {
        setError('Aucun itinéraire trouvé entre ces stations');
      } else {
        setRoutes(data.routes);
        if (data.walkingEstimate) setWalkingEstimate(data.walkingEstimate);
        if (data.cyclingEstimate) setCyclingEstimate(data.cyclingEstimate);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Re-search with a different strategy using the last origin/destination */
  const changeStrategy = useCallback((newStrategy: SortStrategy) => {
    if (!lastSearchRef.current) return;
    search(lastSearchRef.current.from, lastSearchRef.current.to, newStrategy, true);
  }, [search]);

  const selectRoute = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const clear = useCallback(() => {
    setRoutes([]);
    setSelectedIndex(0);
    setError(null);
    setWalkingEstimate(null);
    setCyclingEstimate(null);
    setStrategy('fastest');
    lastSearchRef.current = null;
  }, []);

  const selectedRoute = routes.length > 0 ? routes[selectedIndex] : null;

  return { routes, selectedRoute, selectedIndex, selectRoute, loading, error, search, clear, walkingEstimate, cyclingEstimate, strategy, changeStrategy };
}
