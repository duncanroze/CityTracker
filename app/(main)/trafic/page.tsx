'use client';

import { useLines } from '@/hooks/useLines';
import { useDisruptions } from '@/hooks/useDisruptions';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import LineBadge from '@/components/LineBadge';
import { cn } from '@/lib/utils';

function TraficLine({
  line,
  disruption,
}: {
  line: { code: string; name: string; color: string; textColor: string; transportType: string };
  disruption?: { severity: 'disrupted' | 'interrupted'; message: string | null };
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card text-card-foreground',
        disruption?.severity === 'interrupted' && 'border-destructive/30',
        disruption?.severity === 'disrupted' && 'border-amber-500/30',
        !disruption && 'border-border'
      )}
    >
      <div className="flex items-center gap-3">
        <LineBadge
          code={line.code}
          color={line.color}
          textColor={line.textColor}
          shape={line.transportType === 'METRO' ? 'circle' : 'rounded'}
          disruption={disruption?.severity}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{line.name}</div>
        </div>
        {disruption ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <AlertTriangle
              className={cn(
                'w-4 h-4',
                disruption.severity === 'interrupted'
                  ? 'text-destructive'
                  : 'text-amber-500'
              )}
            />
            <span
              className={cn(
                'text-xs font-medium',
                disruption.severity === 'interrupted'
                  ? 'text-destructive'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            >
              {disruption.severity === 'interrupted' ? 'Interrompu' : 'Perturbé'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Normal
            </span>
          </div>
        )}
      </div>
      {disruption?.message && (
        <p className="mt-2 text-xs text-muted-foreground pl-11">
          {disruption.message}
        </p>
      )}
    </div>
  );
}

export default function TraficPage() {
  const { lines, loading, error } = useLines();
  const disruptions = useDisruptions();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
        Erreur : {error}
      </div>
    );
  }

  const metro = lines.filter((l) => l.transportType === 'METRO');
  const rer = lines.filter((l) => l.transportType === 'RER');
  const transilien = lines.filter((l) => l.transportType === 'TRANSILIEN');
  const tram = lines.filter((l) => l.transportType === 'TRAM');

  // Sort: disrupted/interrupted first within each group
  const sortByDisruption = (a: typeof lines[0], b: typeof lines[0]) => {
    const aD = disruptions[a.code];
    const bD = disruptions[b.code];
    if (aD && !bD) return -1;
    if (!aD && bD) return 1;
    if (aD && bD) {
      if (aD.severity === 'interrupted' && bD.severity !== 'interrupted') return -1;
      if (aD.severity !== 'interrupted' && bD.severity === 'interrupted') return 1;
    }
    return 0;
  };

  const disruptedCount = Object.keys(disruptions).length;

  const sections = [
    { title: 'Métro', lines: [...metro].sort(sortByDisruption) },
    { title: 'RER', lines: [...rer].sort(sortByDisruption) },
    { title: 'Transilien', lines: [...transilien].sort(sortByDisruption) },
    { title: 'Tramway', lines: [...tram].sort(sortByDisruption) },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-3">
        {disruptedCount > 0 ? (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">
              {disruptedCount} ligne{disruptedCount > 1 ? 's' : ''} perturbée{disruptedCount > 1 ? 's' : ''}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium">Trafic normal sur l&apos;ensemble du réseau</span>
          </div>
        )}
      </div>

      {sections.map(
        (section) =>
          section.lines.length > 0 && (
            <div key={section.title}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {section.title}
              </h2>
              <div className="space-y-1.5">
                {section.lines.map((line) => (
                  <TraficLine
                    key={line.code}
                    line={line}
                    disruption={disruptions[line.code]}
                  />
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}
