import { Footprints, MapPin } from 'lucide-react';
import type { RouteResult as RouteResultType, WalkingLeg } from '@/types';
import type { DisruptionsMap } from '@/hooks/useDisruptions';
import RouteSummary from './RouteSummary';
import RouteSegment from './RouteSegment';
import TransferIndicator from './TransferIndicator';
import { Card, CardContent } from '@/components/ui/card';

function WalkingIndicator({ leg, direction }: { leg: WalkingLeg; direction: 'from' | 'to' }) {
  const mins = Math.round(leg.durationSeconds / 60);
  const shortAddr = leg.address.split(',')[0];

  return (
    <div className="relative pl-6 py-2">
      <div className="absolute left-[7px] top-0 bottom-0 w-1 border-l-2 border-dashed border-border" />
      <div className="flex items-center gap-2 py-1.5 pl-1">
        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">{shortAddr}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
        <Footprints className="w-4 h-4 shrink-0" />
        <span>
          Marche {mins > 0 ? `${mins} min` : `${leg.durationSeconds}s`}
          {direction === 'from' ? ` vers ${leg.stationName}` : ` depuis ${leg.stationName}`}
        </span>
      </div>
    </div>
  );
}

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
          {route.walkingFrom && (
            <WalkingIndicator leg={route.walkingFrom} direction="from" />
          )}
          {route.segments.map((segment, i) => (
            <div key={`${segment.lineCode}-${segment.stops[0]?.stationName}`}>
              {i > 0 && route.transfers[i - 1] && (
                <TransferIndicator transfer={route.transfers[i - 1]} />
              )}
              <RouteSegment segment={segment} disruption={disruptions?.[segment.lineCode]} />
            </div>
          ))}
          {route.walkingTo && (
            <WalkingIndicator leg={route.walkingTo} direction="to" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
