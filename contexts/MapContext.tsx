'use client';

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { RouteResult, LineWithStations } from '@/types';

interface MapOverlay {
  type: 'route' | 'line' | 'none';
  route?: RouteResult;
  line?: LineWithStations;
}

interface MapContextValue {
  overlay: MapOverlay;
  dark: boolean;
  setRouteOverlay: (route: RouteResult | null) => void;
  setLineOverlay: (line: LineWithStations | null) => void;
  clearOverlay: () => void;
  setDark: (dark: boolean) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<MapOverlay>({ type: 'none' });
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  const setRouteOverlay = useCallback((route: RouteResult | null) => {
    if (route) {
      setOverlay({ type: 'route', route });
    } else {
      setOverlay({ type: 'none' });
    }
  }, []);

  const setLineOverlay = useCallback((line: LineWithStations | null) => {
    if (line) {
      setOverlay({ type: 'line', line });
    } else {
      setOverlay({ type: 'none' });
    }
  }, []);

  const clearOverlay = useCallback(() => {
    setOverlay({ type: 'none' });
  }, []);

  const value = useMemo(
    () => ({ overlay, dark, setRouteOverlay, setLineOverlay, clearOverlay, setDark }),
    [overlay, dark, setRouteOverlay, setLineOverlay, clearOverlay, setDark],
  );

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used within a MapProvider');
  return ctx;
}
