import type { RouteResult as RouteResultType } from '../types';
import RouteSummary from './RouteSummary';
import RouteSegment from './RouteSegment';
import TransferIndicator from './TransferIndicator';

interface RouteResultProps {
  route: RouteResultType;
}

export default function RouteResult({ route }: RouteResultProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
      <RouteSummary route={route} />
      <div className="border-t border-gray-100 pt-4">
        {route.segments.map((segment, i) => (
          <div key={i}>
            {i > 0 && route.transfers[i - 1] && (
              <TransferIndicator transfer={route.transfers[i - 1]} />
            )}
            <RouteSegment segment={segment} />
          </div>
        ))}
      </div>
    </div>
  );
}
