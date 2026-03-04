'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
}

interface GeolocationState {
  position: GeoPosition | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  tracking: boolean;
}

export interface UseGeolocationReturn extends GeolocationState {
  requestPosition: () => void;
  startTracking: () => void;
  stopTracking: () => void;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 10000,
};

function mapError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "L'acces a la position a ete refuse";
    case err.POSITION_UNAVAILABLE:
      return 'Position non disponible';
    case err.TIMEOUT:
      return "Delai d'attente depasse";
    default:
      return 'Erreur de geolocalisation';
  }
}

export function useGeolocation(): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    accuracy: null,
    loading: false,
    error: null,
    tracking: false,
  });
  const watchIdRef = useRef<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setState(prev => ({
      ...prev,
      position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracy: pos.coords.accuracy,
      loading: false,
      error: null,
    }));
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      loading: false,
      error: mapError(err),
    }));
  }, []);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalisation non supportee par ce navigateur' }));
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, GEO_OPTIONS);
  }, [handleSuccess, handleError]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocalisation non supportee par ce navigateur' }));
      return;
    }
    if (watchIdRef.current !== null) return; // Already tracking
    setState(prev => ({ ...prev, loading: true, error: null, tracking: true }));
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, GEO_OPTIONS);
  }, [handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(prev => ({ ...prev, tracking: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { ...state, requestPosition, startTracking, stopTracking };
}
