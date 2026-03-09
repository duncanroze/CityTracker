'use client';

import { useCallback, useRef, useEffect } from 'react';
import { Locate, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapContext } from '@/contexts/MapContext';
import type { PickerSelection } from '@/types';
import { cn } from '@/lib/utils';

interface GeolocationButtonProps {
  onPositionResolved: (selection: PickerSelection) => void;
  className?: string;
}

export default function GeolocationButton({ onPositionResolved, className }: GeolocationButtonProps) {
  const { position, loading, error, accuracy, requestPosition } = useGeolocation();
  const { setUserPosition } = useMapContext();
  const pendingRef = useRef(false);

  const handleClick = useCallback(() => {
    pendingRef.current = true;
    requestPosition();
  }, [requestPosition]);

  // When position arrives after a click, reverse geocode and resolve
  useEffect(() => {
    if (!position || !pendingRef.current) return;
    pendingRef.current = false;

    // Show user position marker on the map
    setUserPosition({ lat: position.lat, lng: position.lng, accuracy: accuracy ?? 50 });

    // Reverse geocode to get a readable address
    fetch(`/api/geocode?lat=${position.lat}&lng=${position.lng}`)
      .then(res => res.ok ? res.json() : null)
      .then((data: { address: string; lat: number; lng: number } | null) => {
        const addr = data?.address ?? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`;
        onPositionResolved({
          type: 'address',
          lat: position.lat,
          lng: position.lng,
          address: addr,
        });
      })
      .catch(() => {
        onPositionResolved({
          type: 'address',
          lat: position.lat,
          lng: position.lng,
          address: `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
        });
      });
  }, [position, accuracy, onPositionResolved, setUserPosition]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors',
        'hover:text-foreground hover:border-foreground/20',
        loading && 'opacity-50 cursor-wait',
        className,
      )}
      aria-label="Utiliser ma position"
      title={error ?? 'Ma position'}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Locate className="w-4 h-4" />
      )}
    </button>
  );
}
