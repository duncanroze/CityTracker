import type { LabeledRoute } from '@/types';
import type { DisruptionsMap } from '@/hooks/useDisruptions';
import RouteOptionBubbles from './RouteOptionBubbles';

interface RouteOptionsProps {
  routes: LabeledRoute[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  disruptions?: DisruptionsMap;
}

export default function RouteOptions({ routes, selectedIndex, onSelect, disruptions }: RouteOptionsProps) {
  if (routes.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Itinéraires</h2>
      <div className="grid gap-2">
        {routes.map((lr, i) => (
          <RouteOptionBubbles
            key={lr.route.segments.map(s => s.lineCode).join('-')}
            labeledRoute={lr}
            selected={i === selectedIndex}
            onClick={() => onSelect(i)}
            disruptions={disruptions}
          />
        ))}
      </div>
    </div>
  );
}
