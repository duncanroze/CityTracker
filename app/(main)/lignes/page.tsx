'use client';

import Link from 'next/link';
import { useLines } from '@/hooks/useLines';
import { useDisruptions } from '@/hooks/useDisruptions';
import { Skeleton } from '@/components/ui/skeleton';
import LineBadge from '@/components/LineBadge';
import { cn } from '@/lib/utils';

function LineCard({
  line,
  disruption,
}: {
  line: { code: string; name: string; color: string; textColor: string; transportType: string; stations: { id: string }[] };
  disruption?: { severity: 'disrupted' | 'interrupted'; message: string | null };
}) {
  return (
    <Link
      href={`/lignes/${line.code}`}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card text-card-foreground transition-all hover:border-primary/20',
        disruption?.severity === 'interrupted' && 'border-destructive/30',
        disruption?.severity === 'disrupted' && 'border-amber-500/30'
      )}
    >
      <LineBadge
        code={line.code}
        color={line.color}
        textColor={line.textColor}
        shape={line.transportType === 'METRO' ? 'circle' : 'rounded'}
        disruption={disruption?.severity}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{line.name}</div>
        <div className="text-[11px] text-muted-foreground">{line.stations.length} stations</div>
      </div>
      {disruption ? (
        <span
          className={cn(
            'shrink-0 w-2.5 h-2.5 rounded-full',
            disruption.severity === 'interrupted' ? 'bg-destructive' : 'bg-amber-500'
          )}
        />
      ) : (
        <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-500" />
      )}
    </Link>
  );
}

export default function LignesPage() {
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
      <div role="alert" className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
        Erreur : {error}
      </div>
    );
  }

  const metro = lines.filter((l) => l.transportType === 'METRO');
  const rer = lines.filter((l) => l.transportType === 'RER');
  const transilien = lines.filter((l) => l.transportType === 'TRANSILIEN');
  const tram = lines.filter((l) => l.transportType === 'TRAM');

  const sections = [
    { title: 'Métro', lines: metro },
    { title: 'RER', lines: rer },
    { title: 'Transilien', lines: transilien },
    { title: 'Tramway', lines: tram },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {sections.map(
        (section) =>
          section.lines.length > 0 && (
            <div key={section.title}>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {section.title}
              </h2>
              <div className="space-y-1.5">
                {section.lines.map((line) => (
                  <LineCard
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
