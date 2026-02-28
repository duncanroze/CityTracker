'use client';

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { RouteResult, LineWithStations } from '@/types';

export interface PreviewPin {
  lat: number;
  lng: number;
  label: string;
  type: 'origin' | 'destination';
}

interface MapOverlay {
  type: 'route' | 'line' | 'none';
  route?: RouteResult;
  line?: LineWithStations;
}

interface MapContextValue {
  overlay: MapOverlay;
  dark: boolean;
  previewPins: PreviewPin[];
  drawerSnap: number | null;
  setRouteOverlay: (route: RouteResult | null) => void;
  setLineOverlay: (line: LineWithStations | null) => void;
  clearOverlay: () => void;
  setDark: (dark: boolean) => void;
  setPreviewPin: (pin: PreviewPin) => void;
  removePreviewPin: (type: 'origin' | 'destination') => void;
  clearPreviewPins: () => void;
  setDrawerSnap: (snap: number | null) => void;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<MapOverlay>({ type: 'none' });
  const [previewPins, setPreviewPins] = useState<PreviewPin[]>([]);
  const [drawerSnap, setDrawerSnap] = useState<number | null>(null);
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      return stored ? stored === 'dark' : true;
    }
    return true;
  });

  const setRouteOverlay = useCallback((route: RouteResult | null) => {
    if (route) {
      setOverlay({ type: 'route', route });
      setPreviewPins([]); // Clear preview pins when route overlay takes over
      setDrawerSnap(2); // Auto-expand drawer to 92% on mobile
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

  const setPreviewPin = useCallback((pin: PreviewPin) => {
    setPreviewPins((prev) => {
      const filtered = prev.filter((p) => p.type !== pin.type);
      return [...filtered, pin];
    });
  }, []);

  const removePreviewPin = useCallback((type: 'origin' | 'destination') => {
    setPreviewPins((prev) => prev.filter((p) => p.type !== type));
  }, []);

  const clearPreviewPins = useCallback(() => {
    setPreviewPins([]);
  }, []);

  const value = useMemo(
    () => ({
      overlay, dark, previewPins, drawerSnap,
      setRouteOverlay, setLineOverlay, clearOverlay, setDark,
      setPreviewPin, removePreviewPin, clearPreviewPins, setDrawerSnap,
    }),
    [overlay, dark, previewPins, drawerSnap, setRouteOverlay, setLineOverlay, clearOverlay, setDark, setPreviewPin, removePreviewPin, clearPreviewPins, setDrawerSnap],
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
