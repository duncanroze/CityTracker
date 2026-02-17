import { useEffect } from 'react';
import { useStations } from '../hooks/useStations';
import { useRoute } from '../hooks/useRoute';
import { useDisruptions } from '../hooks/useDisruptions';
import { useMapContext } from '../contexts/MapContext';
import RouteForm from '../components/RouteForm';
import RouteOptions from '../components/RouteOptions';
import RouteResultView from '../components/RouteResult';
import { Skeleton } from '@/components/ui/skeleton';

export default function ItinerairePage() {
  const { stations, loading: stationsLoading, error: stationsError } = useStations();
  const { routes, selectedRoute, selectedIndex, selectRoute, loading: routeLoading, error: routeError, search } = useRoute();
  const disruptions = useDisruptions();
  const { setRouteOverlay, clearOverlay } = useMapContext();

  // Push selected route to the map
  useEffect(() => {
    if (selectedRoute) {
      setRouteOverlay(selectedRoute.route);
    } else {
      clearOverlay();
    }
  }, [selectedRoute, setRouteOverlay, clearOverlay]);

  // Clear overlay on unmount
  useEffect(() => {
    return () => clearOverlay();
  }, [clearOverlay]);

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
    <div className="space-y-4">
      <RouteForm stations={stations} loading={routeLoading} onSearch={search} />

      {routeError && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
          {routeError}
        </div>
      )}

      {routes.length > 1 && (
        <RouteOptions
          routes={routes}
          selectedIndex={selectedIndex}
          onSelect={selectRoute}
          disruptions={disruptions}
        />
      )}

      {selectedRoute && (
        <RouteResultView route={selectedRoute.route} disruptions={disruptions} />
      )}
    </div>
  );
}
