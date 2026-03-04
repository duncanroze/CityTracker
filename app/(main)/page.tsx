'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStations } from '@/hooks/useStations';
import { useRoute } from '@/hooks/useRoute';
import { useDisruptions } from '@/hooks/useDisruptions';
import { useNavigation } from '@/hooks/useNavigation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapContext } from '@/contexts/MapContext';
import type { PickerSelection, RouteResult, WalkingDirect, DirectEstimate } from '@/types';
import RouteForm from '@/components/RouteForm';
import RouteOptions from '@/components/RouteOptions';
import RouteResultView from '@/components/RouteResult';
import NavigationView from '@/components/NavigationView';
import AlternativeModes from '@/components/AlternativeModes';
import { Skeleton } from '@/components/ui/skeleton';
import { Navigation, Share2, Check, Star, X, Locate, Radar } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useRouteSimulator } from '@/hooks/useRouteSimulator';
import { useRouteAlerts } from '@/hooks/useRouteAlerts';
import { useUpvoteReport } from '@/hooks/useUpvoteReport';
import dynamic from 'next/dynamic';

const DevSimulatorPanel = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('@/components/DevSimulatorPanel'), { ssr: false })
  : () => null;

/**
 * Inject initial synthetic departure times into a route for dev simulation.
 * Uses short fixed intervals from now — the departure refresh effect will
 * regenerate fresh times on each phase change so they stay realistic.
 */
function injectSyntheticDepartures(route: RouteResult): RouteResult {
  const segments = route.segments.map((seg) => {
    return { ...seg, nextDepartures: makeSyntheticDepartures(), waitTimeSeconds: 60 };
  });
  return { ...route, segments };
}

function makeSyntheticDepartures(): string[] {
  const now = Date.now();
  return [
    new Date(now + 60_000).toISOString(),   // +1 min
    new Date(now + 240_000).toISOString(),  // +4 min
    new Date(now + 420_000).toISOString(),  // +7 min
    new Date(now + 600_000).toISOString(),  // +10 min
    new Date(now + 780_000).toISOString(),  // +13 min
  ];
}

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
  const { routes, selectedRoute, selectedIndex, selectRoute, loading: routeLoading, error: routeError, search, walkingEstimate, cyclingEstimate, strategy, changeStrategy } = useRoute();
  const disruptions = useDisruptions();
  const navigation = useNavigation();
  const geo = useGeolocation();
  const { setRouteOverlay, clearOverlay, setPreviewPin, removePreviewPin, clearPreviewPins, lastMapClick, setLastMapClick, lastPinDrag, setLastPinDrag, setUserPosition } = useMapContext();
  const simulator = useRouteSimulator({ setUserPosition, updateNavPosition: navigation.updatePosition });
  const routeAlerts = useRouteAlerts(selectedRoute?.route ?? null);
  const { upvote: upvoteAlert } = useUpvoteReport();

  // Feed geolocation updates to navigation + map
  useEffect(() => {
    if (simulator.active) return; // Simulator overrides real geo
    if (!geo.position) return;
    setUserPosition({ lat: geo.position.lat, lng: geo.position.lng, accuracy: geo.accuracy ?? 50 });
    if (navigation.active) {
      navigation.updatePosition(geo.position.lat, geo.position.lng);
    }
  }, [geo.position, geo.accuracy, navigation.active, navigation.updatePosition, setUserPosition, simulator.active]);

  // Start/stop geolocation tracking with navigation lifecycle
  useEffect(() => {
    if (navigation.active) {
      geo.startTracking();
    } else {
      geo.stopTracking();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation.active]);

  const handleStartNavigation = useCallback(() => {
    if (!selectedRoute) return;
    // Request notification permission for descent alerts
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    navigation.startNavigation(selectedRoute.route);
  }, [selectedRoute, navigation]);

  // Collapsed form state & labels
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [fromLabel, setFromLabel] = useState('');
  const [toLabel, setToLabel] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeAltMode, setActiveAltMode] = useState<'walking' | 'cycling' | null>(null);
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

  // Handle map clicks: reverse geocode → set origin (1st click) or destination (2nd click)
  const mapClickAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!lastMapClick) return;
    setLastMapClick(null); // Consume the click

    // Skip if both fields are already filled
    if (fromSelRef.current && toSelRef.current) return;

    // Abort any in-flight reverse geocode
    mapClickAbortRef.current?.abort();
    const controller = new AbortController();
    mapClickAbortRef.current = controller;

    const target: 'from' | 'to' = fromSelRef.current ? 'to' : 'from';

    // Immediately set a preview pin with coordinates while we reverse geocode
    const pinType = target === 'from' ? 'origin' : 'destination';
    const tempLabel = `${lastMapClick.lat.toFixed(4)}, ${lastMapClick.lng.toFixed(4)}`;
    setPreviewPin({ lat: lastMapClick.lat, lng: lastMapClick.lng, label: tempLabel, type: pinType });

    // Reverse geocode
    fetch(`/api/geocode?lat=${lastMapClick.lat}&lng=${lastMapClick.lng}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then((data: { address: string; lat: number; lng: number } | null) => {
        if (!data) return;
        const selection: PickerSelection = {
          type: 'address',
          lat: data.lat,
          lng: data.lng,
          address: data.address,
        };
        handleSelectionChange(target, selection);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Fallback: use raw coordinates as address
        const selection: PickerSelection = {
          type: 'address',
          lat: lastMapClick.lat,
          lng: lastMapClick.lng,
          address: tempLabel,
        };
        handleSelectionChange(target, selection);
      });
  }, [lastMapClick, setLastMapClick, setPreviewPin, handleSelectionChange]);

  // Handle pin drag: reverse geocode → update the corresponding field
  const pinDragAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!lastPinDrag) return;
    setLastPinDrag(null); // Consume

    // Abort any in-flight reverse geocode
    pinDragAbortRef.current?.abort();
    const controller = new AbortController();
    pinDragAbortRef.current = controller;

    const { lat, lng, type } = lastPinDrag;
    const target: 'from' | 'to' = type === 'origin' ? 'from' : 'to';
    const tempLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

    // Update preview pin immediately
    setPreviewPin({ lat, lng, label: tempLabel, type });

    // Reverse geocode
    fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then((data: { address: string; lat: number; lng: number } | null) => {
        if (!data) return;
        handleSelectionChange(target, { type: 'address', lat: data.lat, lng: data.lng, address: data.address });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        handleSelectionChange(target, { type: 'address', lat, lng, address: tempLabel });
      });
  }, [lastPinDrag, setLastPinDrag, setPreviewPin, handleSelectionChange]);

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

  // Push selected route to the map — skip when an alt mode (walking/cycling) is active
  useEffect(() => {
    if (activeAltMode) return;
    if (selectedRoute) {
      setRouteOverlay(selectedRoute.route);
    } else {
      clearOverlay();
    }
  }, [selectedRoute, setRouteOverlay, clearOverlay, activeAltMode]);

  // Build a walking-only RouteResult from a DirectEstimate for map display
  const buildDirectRoute = useCallback((estimate: DirectEstimate, mode: 'walking' | 'cycling'): RouteResult | null => {
    const f = fromSelRef.current;
    const t = toSelRef.current;
    if (!f || !t || !estimate.path) return null;
    const fromLat = f.type === 'address' ? f.lat : f.station.latitude;
    const fromLng = f.type === 'address' ? f.lng : f.station.longitude;
    const toLat = t.type === 'address' ? t.lat : t.station.latitude;
    const toLng = t.type === 'address' ? t.lng : t.station.longitude;
    const fromAddr = f.type === 'address' ? f.address.split(',').slice(0, 2).join(', ') : f.station.name;
    const toAddr = t.type === 'address' ? t.address.split(',').slice(0, 2).join(', ') : t.station.name;

    const walkingDirect: WalkingDirect = {
      fromAddress: fromAddr, fromLat, fromLng,
      toAddress: toAddr, toLat, toLng,
      distanceMeters: estimate.distanceMeters,
      durationSeconds: estimate.durationSeconds,
      path: estimate.path,
    };
    return {
      found: true,
      walkingOnly: true,
      walkingDirect,
      totalDurationSeconds: estimate.durationSeconds,
      totalStations: 0,
      totalTransfers: 0,
      segments: [],
      transfers: [],
    };
  }, []);

  const handleAltModeClick = useCallback((mode: 'walking' | 'cycling') => {
    const estimate = mode === 'walking' ? walkingEstimate : cyclingEstimate;
    if (!estimate) return;
    if (activeAltMode === mode) {
      // Deselect — go back to selected transit route
      setActiveAltMode(null);
      if (selectedRoute) setRouteOverlay(selectedRoute.route);
      return;
    }
    const route = buildDirectRoute(estimate, mode);
    if (route) {
      setActiveAltMode(mode);
      setRouteOverlay(route);
    }
  }, [walkingEstimate, cyclingEstimate, activeAltMode, selectedRoute, buildDirectRoute, setRouteOverlay]);

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
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — silently fail
    }
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
      <div role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label="Partager l'itinéraire"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              onClick={handleToggleFavorite}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-foreground/20 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label={currentIsFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star className={`w-4 h-4 ${currentIsFav ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {routeError && (
        <div role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
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
                <div
                  key={fav.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleFavoriteClick(fav)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFavoriteClick(fav); } }}
                  className="group w-full text-left rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20 cursor-pointer"
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
                      className="sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 p-1 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 transition-opacity"
                      aria-label="Supprimer le favori"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
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

      {!navigation.active && routes.length > 0 && (walkingEstimate || cyclingEstimate) && (
        <div className="animate-in fade-in duration-200">
          <AlternativeModes
            walking={walkingEstimate}
            cycling={cyclingEstimate}
            activeMode={activeAltMode}
            onClickWalking={() => handleAltModeClick('walking')}
            onClickCycling={() => handleAltModeClick('cycling')}
          />
        </div>
      )}

      {!navigation.active && routes.length > 1 && (
        <div className="animate-in fade-in duration-200">
          <RouteOptions
            routes={routes}
            selectedIndex={selectedIndex}
            onSelect={(idx) => { setActiveAltMode(null); selectRoute(idx); }}
            disruptions={disruptions}
            strategy={strategy}
            onChangeStrategy={changeStrategy}
            loading={routeLoading}
          />
        </div>
      )}

      {/* DEV: Route position simulator panel */}
      {process.env.NODE_ENV === 'development' && (
        <DevSimulatorPanel simulator={simulator} />
      )}

      {/* Navigation mode: replaces route result when active */}
      {navigation.active ? (
        <div className="animate-in fade-in duration-200">
          <NavigationView navigation={navigation} />
        </div>
      ) : selectedRoute && (
        <div className="animate-in fade-in duration-200">
          {/* Start navigation button */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleStartNavigation}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium py-2.5 px-4 transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              <Locate className="w-4 h-4" />
              Lancer la navigation
            </button>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => {
                  if (!selectedRoute) return;
                  // Inject synthetic departures so navigation UI shows trains
                  const enriched = injectSyntheticDepartures(selectedRoute.route);
                  navigation.startNavigation(enriched);
                  simulator.start(enriched);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium py-2.5 px-3 transition-colors text-sm"
                title="Simuler le deplacement (dev)"
              >
                <Radar className="w-4 h-4" />
                Sim
              </button>
            )}
          </div>
          <RouteResultView route={selectedRoute.route} disruptions={disruptions} communityAlerts={routeAlerts} onUpvoteAlert={upvoteAlert} />
        </div>
      )}
    </div>
  );
}
