'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStations } from '@/hooks/useStations';
import { useRoute } from '@/hooks/useRoute';
import { useDisruptions } from '@/hooks/useDisruptions';
import { useMapContext } from '@/contexts/MapContext';
import type { PickerSelection } from '@/types';
import RouteForm from '@/components/RouteForm';
import RouteOptions from '@/components/RouteOptions';
import RouteResultView from '@/components/RouteResult';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation, Share2, Check, Star, X } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';

function buildShareUrl(fromSel: PickerSelection, toSel: PickerSelection): string {
  const params = new URLSearchParams();
  if (fromSel.type === 'address') {
    params.set('from', `${fromSel.lat},${fromSel.lng},${fromSel.address}`);
  } else {
    params.set('from', `station:${fromSel.station.id},${fromSel.station.name}`);
  }
  if (toSel.type === 'address') {
    params.set('to', `${toSel.lat},${toSel.lng},${toSel.address}`);
  } else {
    params.set('to', `station:${toSel.station.id},${toSel.station.name}`);
  }
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export default function ItinerairePage() {
  return (
    <Suspense>
      <ItineraireContent />
    </Suspense>
  );
}

function ItineraireContent() {
  const searchParams = useSearchParams();
  const { stations, loading: stationsLoading, error: stationsError } = useStations();
  const { routes, selectedRoute, selectedIndex, selectRoute, loading: routeLoading, error: routeError, search } = useRoute();
  const disruptions = useDisruptions();
  const { setRouteOverlay, clearOverlay, setPreviewPin, removePreviewPin, clearPreviewPins } = useMapContext();

  // Collapsed form state & labels
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [fromLabel, setFromLabel] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [copied, setCopied] = useState(false);
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  // Track selections for share + pass to RouteForm
  const fromSelRef = useRef<PickerSelection | null>(null);
  const toSelRef = useRef<PickerSelection | null>(null);
  const [fromSel, setFromSel] = useState<PickerSelection | null>(null);
  const [toSel, setToSel] = useState<PickerSelection | null>(null);
  const deepLinkHandled = useRef(false);

  // Handle selection changes from RouteForm to show preview pins
  const handleSelectionChange = useCallback(
    (field: 'from' | 'to', selection: PickerSelection | null) => {
      const pinType = field === 'from' ? 'origin' : 'destination';
      if (field === 'from') { fromSelRef.current = selection; setFromSel(selection); }
      else { toSelRef.current = selection; setToSel(selection); }

      // Track labels for collapsed banner
      if (selection) {
        const label = selection.type === 'address'
          ? selection.address.split(',').slice(0, 2).join(', ')
          : selection.station.name;
        if (field === 'from') setFromLabel(label);
        else setToLabel(label);
      } else {
        if (field === 'from') setFromLabel('');
        else setToLabel('');
      }

      if (!selection) {
        removePreviewPin(pinType);
        return;
      }
      if (selection.type === 'address') {
        setPreviewPin({ lat: selection.lat, lng: selection.lng, label: selection.address.split(',').slice(0, 2).join(', '), type: pinType });
      } else if (selection.type === 'station') {
        setPreviewPin({ lat: selection.station.latitude, lng: selection.station.longitude, label: selection.station.name, type: pinType });
      }
    },
    [setPreviewPin, removePreviewPin],
  );

  // Deep linking: parse URL params and auto-search
  useEffect(() => {
    if (deepLinkHandled.current || stationsLoading || stations.length === 0) return;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (!fromParam || !toParam) return;
    deepLinkHandled.current = true;

    function parseParam(param: string): PickerSelection | null {
      if (param.startsWith('station:')) {
        const rest = param.slice(8);
        const commaIdx = rest.indexOf(',');
        if (commaIdx === -1) return null;
        const id = rest.slice(0, commaIdx);
        const station = stations.find(s => s.id === id);
        if (station) return { type: 'station', station };
        return null;
      }
      const parts = param.split(',');
      if (parts.length < 3) return null;
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const address = parts.slice(2).join(',');
      if (isNaN(lat) || isNaN(lng)) return null;
      return { type: 'address', lat, lng, address };
    }

    const fromSel = parseParam(fromParam);
    const toSel = parseParam(toParam);
    if (fromSel && toSel) {
      handleSelectionChange('from', fromSel);
      handleSelectionChange('to', toSel);
      search(fromSel, toSel);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, stations, stationsLoading, handleSelectionChange, search]);

  // Collapse the form when routes are found
  useEffect(() => {
    if (routes.length > 0) setFormCollapsed(true);
  }, [routes]);

  // Push selected route to the map
  useEffect(() => {
    if (selectedRoute) {
      setRouteOverlay(selectedRoute.route);
    } else {
      clearOverlay();
    }
  }, [selectedRoute, setRouteOverlay, clearOverlay]);

  // Clear overlay and preview pins on unmount
  useEffect(() => {
    return () => {
      clearOverlay();
      clearPreviewPins();
    };
  }, [clearOverlay, clearPreviewPins]);

  const getCurrentFromTo = useCallback(() => {
    const f = fromSelRef.current;
    const t = toSelRef.current;
    if (!f || !t) return null;
    const from = f.type === 'address'
      ? { lat: f.lat, lng: f.lng, label: f.address.split(',').slice(0, 2).join(', ') }
      : { lat: f.station.latitude, lng: f.station.longitude, label: f.station.name };
    const to = t.type === 'address'
      ? { lat: t.lat, lng: t.lng, label: t.address.split(',').slice(0, 2).join(', ') }
      : { lat: t.station.latitude, lng: t.station.longitude, label: t.station.name };
    return { from, to };
  }, []);

  const handleToggleFavorite = useCallback(() => {
    const ft = getCurrentFromTo();
    if (!ft) return;
    if (isFavorite(ft.from, ft.to)) {
      const id = `${ft.from.lat.toFixed(4)},${ft.from.lng.toFixed(4)}->${ft.to.lat.toFixed(4)},${ft.to.lng.toFixed(4)}`;
      removeFavorite(id);
    } else {
      addFavorite(ft.from, ft.to);
    }
  }, [getCurrentFromTo, isFavorite, addFavorite, removeFavorite]);

  const handleFavoriteClick = useCallback((fav: { from: { lat: number; lng: number; label: string }; to: { lat: number; lng: number; label: string } }) => {
    const fromSel: PickerSelection = { type: 'address', lat: fav.from.lat, lng: fav.from.lng, address: fav.from.label };
    const toSel: PickerSelection = { type: 'address', lat: fav.to.lat, lng: fav.to.lng, address: fav.to.label };
    handleSelectionChange('from', fromSel);
    handleSelectionChange('to', toSel);
    search(fromSel, toSel);
  }, [handleSelectionChange, search]);

  const currentIsFav = (() => {
    const ft = getCurrentFromTo();
    return ft ? isFavorite(ft.from, ft.to) : false;
  })();

  const handleShare = useCallback(async () => {
    if (!fromSelRef.current || !toSelRef.current) return;
    const url = buildShareUrl(fromSelRef.current, toSelRef.current);

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Itinéraire CityTracker', url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (stationsLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  if (stationsError) {
    return (
      <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
        Erreur : {stationsError}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <RouteForm
            stations={stations}
            loading={routeLoading}
            onSearch={search}
            onSelectionChange={handleSelectionChange}
            collapsed={formCollapsed}
            onExpand={() => setFormCollapsed(false)}
            fromLabel={fromLabel}
            toLabel={toLabel}
            externalFrom={fromSel}
            externalTo={toSel}
          />
        </div>
        {formCollapsed && selectedRoute && (
          <div className="flex flex-col gap-1 mt-1">
            <button
              onClick={handleShare}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
              aria-label="Partager l'itinéraire"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleToggleFavorite}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20"
              aria-label={currentIsFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star className={`w-4 h-4 ${currentIsFav ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {routeError && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
          {routeError}
        </div>
      )}

      {!routeLoading && !routeError && routes.length === 0 && !formCollapsed && (
        <>
          {favorites.length > 0 && (
            <div className="space-y-2 animate-in fade-in duration-200">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Star className="w-3 h-3" />
                Favoris
              </h2>
              {favorites.map(fav => (
                <button
                  key={fav.id}
                  onClick={() => handleFavoriteClick(fav)}
                  className="group w-full text-left rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-sm truncate">{fav.from.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="text-sm truncate">{fav.to.label}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFavorite(fav.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity"
                      aria-label="Supprimer le favori"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
          {favorites.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground animate-in fade-in duration-300">
              <Navigation className="w-5 h-5 opacity-40" />
              <p className="text-sm text-center">
                Sélectionnez un départ et une arrivée pour trouver votre itinéraire
              </p>
            </div>
          )}
        </>
      )}

      {routes.length > 1 && (
        <div className="animate-in fade-in duration-200">
          <RouteOptions
            routes={routes}
            selectedIndex={selectedIndex}
            onSelect={selectRoute}
            disruptions={disruptions}
          />
        </div>
      )}

      {selectedRoute && (
        <div className="animate-in fade-in duration-200">
          <RouteResultView route={selectedRoute.route} disruptions={disruptions} />
        </div>
      )}
    </div>
  );
}
