'use client';

import { Shield, Users, ArrowUpDown, Accessibility, Clock, Megaphone } from 'lucide-react';
import { REPORT_TYPES } from '@/lib/report-config';
import type { ReportType } from '@/types';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Shield,
  Users,
  ArrowUpDown,
  Accessibility,
  Clock,
  Megaphone,
};

interface ReportTypePickerProps {
  selected: ReportType | null;
  onSelect: (type: ReportType) => void;
}

export default function ReportTypePicker({ selected, onSelect }: ReportTypePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {REPORT_TYPES.map((rt) => {
        const Icon = ICON_MAP[rt.icon];
        const isActive = selected === rt.type;
        return (
          <button
            key={rt.type}
            type="button"
            onClick={() => onSelect(rt.type)}
            aria-pressed={isActive}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all',
              'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              isActive
                ? 'border-2 bg-accent shadow-sm'
                : 'border-border hover:bg-accent/50',
            )}
            style={isActive ? { borderColor: rt.color } : undefined}
          >
            {Icon && <Icon className="w-5 h-5" style={{ color: rt.color }} />}
            <span className="text-xs font-medium leading-tight">{rt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
