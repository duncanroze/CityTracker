'use client';

import { useState, useCallback } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import type { CommunityReport, ReportType } from '@/types';
import { REPORT_TYPES } from '@/lib/report-config';
import { useAuth } from '@/contexts/AuthContext';
import { useUpvoteReport } from '@/hooks/useUpvoteReport';
import ReportCard from './ReportCard';
import { cn } from '@/lib/utils';

interface ReportFeedProps {
  reports: CommunityReport[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onDelete?: (id: string) => void;
}

export default function ReportFeed({ reports, loading, error, onRefetch, onDelete }: ReportFeedProps) {
  const { user } = useAuth();
  const { upvote, loadingId } = useUpvoteReport(onRefetch);
  const [typeFilter, setTypeFilter] = useState<ReportType | null>(null);

  const filtered = typeFilter ? reports.filter(r => r.type === typeFilter) : reports;

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete?.(id);
        onRefetch();
      }
    } catch (err) {
      console.warn('Delete failed:', err);
    }
  }, [onRefetch, onDelete]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
        Erreur : {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <MessageSquareWarning className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {reports.length === 0
              ? 'Aucun signalement actif'
              : `${reports.length} signalement${reports.length > 1 ? 's' : ''} actif${reports.length > 1 ? 's' : ''}`}
          </span>
        </div>
      </div>

      {/* Filter chips */}
      {reports.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter(null)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              !typeFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            Tous
          </button>
          {REPORT_TYPES.map((rt) => {
            const count = reports.filter(r => r.type === rt.type).length;
            if (count === 0) return null;
            return (
              <button
                key={rt.type}
                onClick={() => setTypeFilter(typeFilter === rt.type ? null : rt.type)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                  typeFilter === rt.type
                    ? 'text-white'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
                style={typeFilter === rt.type ? { backgroundColor: rt.color } : undefined}
              >
                {rt.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Report cards */}
      <div className="space-y-2">
        {filtered.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onUpvote={upvote}
            onDelete={handleDelete}
            isOwner={!!user && user.id === report.userId}
            upvoteLoading={loadingId === report.id}
          />
        ))}
      </div>

      {filtered.length === 0 && reports.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun signalement de ce type.
        </p>
      )}
    </div>
  );
}
