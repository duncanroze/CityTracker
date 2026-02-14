import type { LabeledRoute } from '../types';
import LineBadge from './LineBadge';

interface RouteOptionCardProps {
  labeledRoute: LabeledRoute;
  selected: boolean;
  onClick: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export default function RouteOptionCard({ labeledRoute, selected, onClick }: RouteOptionCardProps) {
  const { label, route } = labeledRoute;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          label === 'Fastest'
            ? 'bg-green-100 text-green-700'
            : label === 'Fewer transfers'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600'
        }`}>
          {label}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {formatDuration(route.totalDurationSeconds)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {route.segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300 text-xs">&#8250;</span>}
            <LineBadge code={seg.lineCode} color={seg.lineColor} textColor={seg.lineTextColor} />
          </div>
        ))}
        {route.totalTransfers > 0 && (
          <span className="text-xs text-gray-400 ml-auto">
            {route.totalTransfers} transfer{route.totalTransfers > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}
