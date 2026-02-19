import { Footprints } from 'lucide-react';
import type { Transfer } from '@/types';

interface TransferIndicatorProps {
  transfer: Transfer;
}

export default function TransferIndicator({ transfer }: TransferIndicatorProps) {
  const mins = Math.round(transfer.walkingTimeSeconds / 60);

  return (
    <div className="relative pl-6 py-2">
      {/* Dashed line continuation */}
      <div className="absolute left-[7px] top-0 bottom-0 w-1 border-l-2 border-dashed border-border" />

      <div className="flex items-center gap-2 text-sm text-muted-foreground pl-1">
        <Footprints className="w-4 h-4 shrink-0" />
        <span>
          Marche {mins > 0 ? `${mins} min` : `${transfer.walkingTimeSeconds}s`} à {transfer.stationName}
        </span>
      </div>
    </div>
  );
}
