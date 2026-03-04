'use client';

import { useState, useEffect } from 'react';
import { ThumbsUp, Trash2, Shield, Users, ArrowUpDown, Accessibility, Clock, Megaphone } from 'lucide-react';
import type { CommunityReport } from '@/types';
import { REPORT_TYPE_MAP } from '@/lib/report-config';
import LineBadge from './LineBadge';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Shield,
  Users,
  ArrowUpDown,
  Accessibility,
  Clock,
  Megaphone,
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 60_000);
  if (diff < 1) return 'à l\'instant';
  if (diff < 60) return `il y a ${diff} min`;
  const hours = Math.floor(diff / 60);
  return `il y a ${hours}h${diff % 60 > 0 ? `${String(diff % 60).padStart(2, '0')}` : ''}`;
}

function expiresIn(ts: number): string {
  const diff = Math.floor((ts - Date.now()) / 60_000);
  if (diff <= 0) return 'expiré';
  if (diff < 60) return `expire dans ${diff} min`;
  const hours = Math.floor(diff / 60);
  return `expire dans ${hours}h${diff % 60 > 0 ? `${String(diff % 60).padStart(2, '0')}` : ''}`;
}

interface ReportCardProps {
  report: CommunityReport;
  onUpvote?: (id: string) => void;
  onDelete?: (id: string) => void;
  isOwner?: boolean;
  upvoteLoading?: boolean;
}

export default function ReportCard({ report, onUpvote, onDelete, isOwner, upvoteLoading }: ReportCardProps) {
  const config = REPORT_TYPE_MAP[report.type];
  const Icon = ICON_MAP[config.icon];
  const [, setTick] = useState(0);

  // Update relative times every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const locationLabel = (() => {
    if (report.locationType === 'TRANSFER_CORRIDOR' && report.fromLineCode && report.toLineCode) {
      return `Couloir ${report.fromLineCode} → ${report.toLineCode}`;
    }
    if (report.locationType === 'STATION_EXIT') return 'Sortie de station';
    if (report.direction) return `Dir. ${report.direction}`;
    return null;
  })();

  return (
    <div className="rounded-lg border border-border bg-card p-3 relative overflow-hidden">
      {/* Color accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: config.color }} />

      <div className="pl-2">
        {/* Header: icon + type + time ago */}
        <div className="flex items-center gap-2 mb-1.5">
          {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: config.color }} />}
          <span className="text-sm font-semibold flex-1">{config.label}</span>
          <span className="text-xs text-muted-foreground">{timeAgo(report.createdAt)}</span>
        </div>

        {/* Station + line */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{report.stationName}</span>
          {report.lineCode && (
            <LineBadge code={report.lineCode} color={config.color} size="sm" />
          )}
        </div>

        {/* Location detail */}
        {locationLabel && (
          <p className="text-xs text-muted-foreground mb-1.5">{locationLabel}</p>
        )}

        {/* Comment */}
        {report.comment && (
          <p className="text-xs text-muted-foreground mb-2 italic">&ldquo;{report.comment}&rdquo;</p>
        )}

        {/* Confidence bar */}
        <div className="h-1 rounded-full bg-muted mb-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(report.confidence * 100)}%`,
              backgroundColor: report.confidence > 0.6 ? '#22c55e' : report.confidence > 0.3 ? '#eab308' : '#ef4444',
            }}
          />
        </div>

        {/* Footer: upvote + expiry + delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpvote?.(report.id)}
            disabled={report.userUpvoted || upvoteLoading}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              report.userUpvoted
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            aria-label={report.userUpvoted ? 'Déjà confirmé' : 'Confirmer : encore là'}
          >
            <ThumbsUp className="w-3 h-3" />
            <span>{report.upvoteCount}</span>
            {!report.userUpvoted && <span className="hidden sm:inline">Encore là</span>}
          </button>

          <span className="text-xs text-muted-foreground flex-1 text-right">{expiresIn(report.expiresAt)}</span>

          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(report.id)}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              aria-label="Supprimer mon signalement"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Reporter */}
        {report.reporterName && (
          <p className="text-[10px] text-muted-foreground mt-1">par {report.reporterName}</p>
        )}
      </div>
    </div>
  );
}
