import { useStations } from '../hooks/useStations';
import { useRoute } from '../hooks/useRoute';
import RouteForm from '../components/RouteForm';
import RouteOptions from '../components/RouteOptions';
import RouteMap from '../components/RouteMap';
import RouteResultView from '../components/RouteResult';

export default function HomePage() {
  const { stations, loading: stationsLoading, error: stationsError } = useStations();
  const { routes, selectedRoute, selectedIndex, selectRoute, loading: routeLoading, error: routeError, search } = useRoute();

  if (stationsLoading) {
    return <p className="text-center text-gray-500 py-12">Loading stations...</p>;
  }

  if (stationsError) {
    return <p className="text-center text-red-500 py-12">Error: {stationsError}</p>;
  }

  return (
    <div className="space-y-4">
      <RouteForm stations={stations} loading={routeLoading} onSearch={search} />

      {routeError && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {routeError}
        </div>
      )}

      {routes.length > 1 && (
        <RouteOptions routes={routes} selectedIndex={selectedIndex} onSelect={selectRoute} />
      )}

      {selectedRoute && (
        <>
          <RouteMap route={selectedRoute.route} />
          <RouteResultView route={selectedRoute.route} />
        </>
      )}
    </div>
  );
}
