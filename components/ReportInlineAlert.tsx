'use client';

import { ThumbsUp, Shield, Users, ArrowUpDown, Accessibility, Clock, Megaphone } from 'lucide-react';
import type { CommunityReport } from '@/types';
import { REPORT_TYPE_MAP } from '@/lib/report-config';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Shield,
  Users,
  ArrowUpDown,
  Accessibility,
  Clock,
  Megaphone,
};

interface ReportInlineAlertProps {
  report: CommunityReport;
  onUpvote?: (id: string) => void;
}

export default function ReportInlineAlert({ report, onUpvote }: ReportInlineAlertProps) {
  const config = REPORT_TYPE_MAP[report.type];
  const Icon = ICON_MAP[config.icon];

  return (
    <div className={cn(
      'flex items-center gap-1.5 pb-2 text-xs rounded-md px-2 py-1.5 mb-1',
    )} style={{ backgroundColor: `${config.color}15`, color: config.color }}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span className="font-medium">{config.label}</span>
      <span className="text-muted-foreground truncate flex-1">
        — {report.stationName}
        {report.comment && ` : "${report.comment}"`}
      </span>
      {onUpvote && !report.userUpvoted && (
        <button
          onClick={() => onUpvote(report.id)}
          className="flex items-center gap-0.5 rounded px-1.5 py-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Confirmer : encore là"
        >
          <ThumbsUp className="w-3 h-3" />
          <span>{report.upvoteCount}</span>
        </button>
      )}
      {report.userUpvoted && (
        <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
          <ThumbsUp className="w-3 h-3" />
          <span>{report.upvoteCount}</span>
        </span>
      )}
    </div>
  );
}
