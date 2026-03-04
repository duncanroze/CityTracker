import { Footprints, MapPin } from 'lucide-react';
import type { RouteResult as RouteResultType, WalkingLeg, CommunityReport } from '@/types';
import type { DisruptionsMap } from '@/hooks/useDisruptions';
import RouteSummary from './RouteSummary';
import RouteSegment from './RouteSegment';
import TransferIndicator from './TransferIndicator';
import ReportInlineAlert from './ReportInlineAlert';
import { Card, CardContent } from '@/components/ui/card';

function shortAddress(address: string): string {
  // BAN format: "20b Rue Balard 75015 Paris" → "20b Rue Balard"
  const banMatch = address.match(/^(.+?)\s+\d{5}\s/);
  if (banMatch) return banMatch[1];
  // Nominatim format: "55, Boulevard Voltaire, 75011 Paris" → "55, Boulevard Voltaire"
  const parts = address.split(',');
  if (parts.length >= 2) return parts.slice(0, 2).join(',').trim();
  return address;
}

function WalkingIndicator({ leg, direction }: { leg: WalkingLeg; direction: 'from' | 'to' }) {
  const mins = Math.round(leg.durationSeconds / 60);
  const shortAddr = shortAddress(leg.address);

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
  communityAlerts?: CommunityReport[];
  onUpvoteAlert?: (id: string) => void;
}

export default function RouteResult({ route, disruptions, communityAlerts, onUpvoteAlert }: RouteResultProps) {
  if (route.walkingOnly && route.walkingDirect) {
    const wd = route.walkingDirect;
    const mins = Math.round(wd.durationSeconds / 60);
    const shortFrom = shortAddress(wd.fromAddress);
    const shortTo = shortAddress(wd.toAddress);

    return (
      <Card className="py-4 gap-4">
        <CardContent className="space-y-4">
          <RouteSummary route={route} />
          <div className="relative pl-6 py-2">
            <div className="absolute left-[7px] top-0 bottom-0 w-1 border-l-2 border-dashed border-muted-foreground/40" />
            {/* Origin */}
            <div className="flex items-center gap-2 py-1.5 pl-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm font-medium">{shortFrom}</span>
            </div>
            {/* Walking info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1 py-2">
              <Footprints className="w-4 h-4 shrink-0" />
              <span>
                {mins > 0 ? `${mins} min` : '< 1 min'} à pied
                {wd.distanceMeters > 0 && ` · ${wd.distanceMeters >= 1000 ? `${(wd.distanceMeters / 1000).toFixed(1)} km` : `${wd.distanceMeters} m`}`}
              </span>
            </div>
            {/* Destination */}
            <div className="flex items-center gap-2 py-1.5 pl-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-sm font-medium">{shortTo}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
              {communityAlerts?.filter(a =>
                segment.stops.some(s => s.stationId === a.stationId) &&
                (a.lineCode === segment.lineCode || !a.lineCode)
              ).map(alert => (
                <div key={alert.id} className="pl-6 mt-1">
                  <ReportInlineAlert report={alert} onUpvote={onUpvoteAlert} />
                </div>
              ))}
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
