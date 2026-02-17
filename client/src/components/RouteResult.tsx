import type { RouteResult as RouteResultType } from '../types';
import type { DisruptionsMap } from '../hooks/useDisruptions';
import RouteSummary from './RouteSummary';
import RouteSegment from './RouteSegment';
import TransferIndicator from './TransferIndicator';
import { Card, CardContent } from '@/components/ui/card';

interface RouteResultProps {
  route: RouteResultType;
  disruptions?: DisruptionsMap;
}

export default function RouteResult({ route, disruptions }: RouteResultProps) {
  return (
    <Card className="py-4 gap-4">
      <CardContent className="space-y-4">
        <RouteSummary route={route} />
        <div>
          {route.segments.map((segment, i) => (
            <div key={`${segment.lineCode}-${segment.stops[0]?.stationName}`}>
              {i > 0 && route.transfers[i - 1] && (
                <TransferIndicator transfer={route.transfers[i - 1]} />
              )}
              <RouteSegment segment={segment} disruption={disruptions?.[segment.lineCode]} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
