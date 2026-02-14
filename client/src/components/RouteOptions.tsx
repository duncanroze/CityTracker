import type { LabeledRoute } from '../types';
import RouteOptionCard from './RouteOptionCard';

interface RouteOptionsProps {
  routes: LabeledRoute[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function RouteOptions({ routes, selectedIndex, onSelect }: RouteOptionsProps) {
  if (routes.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-500">Route options</h2>
      <div className="grid gap-2">
        {routes.map((lr, i) => (
          <RouteOptionCard
            key={i}
            labeledRoute={lr}
            selected={i === selectedIndex}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>
  );
}
