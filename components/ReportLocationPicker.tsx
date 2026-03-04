'use client';

import { useState, useEffect } from 'react';
import type { Station, ReportLocationType } from '@/types';
import StationPicker from './StationPicker';
import { REPORT_LOCATIONS } from '@/lib/report-config';
import { cn } from '@/lib/utils';

interface ReportLocationPickerProps {
  stations: Station[];
  locationType: ReportLocationType;
  onLocationTypeChange: (type: ReportLocationType) => void;
  stationId: string | null;
  onStationChange: (stationId: string | null, stationName: string | null) => void;
  lineCode: string | null;
  onLineCodeChange: (code: string | null) => void;
  direction: string | null;
  onDirectionChange: (dir: string | null) => void;
  fromLineCode: string | null;
  onFromLineCodeChange: (code: string | null) => void;
  toLineCode: string | null;
  onToLineCodeChange: (code: string | null) => void;
}

export default function ReportLocationPicker({
  stations,
  locationType,
  onLocationTypeChange,
  stationId,
  onStationChange,
  lineCode,
  onLineCodeChange,
  direction,
  onDirectionChange,
  fromLineCode,
  onFromLineCodeChange,
  toLineCode,
  onToLineCodeChange,
}: ReportLocationPickerProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  // Reset fields when location type changes
  useEffect(() => {
    onLineCodeChange(null);
    onDirectionChange(null);
    onFromLineCodeChange(null);
    onToLineCodeChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationType]);

  const stationLines = selectedStation?.lines ?? [];

  return (
    <div className="space-y-3">
      {/* Location type pills */}
      <div className="flex gap-1.5">
        {REPORT_LOCATIONS.map((loc) => (
          <button
            key={loc.type}
            type="button"
            onClick={() => onLocationTypeChange(loc.type)}
            aria-pressed={locationType === loc.type}
            className={cn(
              'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
              locationType === loc.type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* Station picker */}
      <StationPicker
        label="Station"
        stations={stations}
        selected={selectedStation ? { type: 'station', station: selectedStation } : null}
        onSelect={(sel) => {
          if (sel?.type === 'station') {
            setSelectedStation(sel.station);
            onStationChange(sel.station.id, sel.station.name);
          } else {
            setSelectedStation(null);
            onStationChange(null, null);
          }
        }}
      />

      {/* PLATFORM: line + direction */}
      {locationType === 'PLATFORM' && stationLines.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Ligne</label>
          <div className="flex flex-wrap gap-1.5">
            {stationLines.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => onLineCodeChange(lineCode === l.code ? null : l.code)}
                aria-pressed={lineCode === l.code}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold transition-all',
                  'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                  lineCode === l.code ? 'ring-2 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100',
                )}
                style={{
                  backgroundColor: l.color,
                  color: l.textColor,
                  ...(lineCode === l.code ? { ringColor: l.color } : {}),
                }}
              >
                {l.code}
              </button>
            ))}
          </div>

          {lineCode && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Direction (optionnel)</label>
              <input
                type="text"
                value={direction ?? ''}
                onChange={(e) => onDirectionChange(e.target.value || null)}
                placeholder="Ex: Porte de Clignancourt"
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
              />
            </div>
          )}
        </div>
      )}

      {/* TRANSFER_CORRIDOR: from line + to line */}
      {locationType === 'TRANSFER_CORRIDOR' && stationLines.length > 1 && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">De la ligne</label>
            <div className="flex flex-wrap gap-1.5">
              {stationLines.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => onFromLineCodeChange(fromLineCode === l.code ? null : l.code)}
                  aria-pressed={fromLineCode === l.code}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold transition-all',
                    'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                    fromLineCode === l.code ? 'ring-2 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100',
                  )}
                  style={{ backgroundColor: l.color, color: l.textColor }}
                >
                  {l.code}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Vers la ligne</label>
            <div className="flex flex-wrap gap-1.5">
              {stationLines.filter((l) => l.code !== fromLineCode).map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => onToLineCodeChange(toLineCode === l.code ? null : l.code)}
                  aria-pressed={toLineCode === l.code}
                  className={cn(
                    'inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold transition-all',
                    'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                    toLineCode === l.code ? 'ring-2 ring-offset-1 ring-offset-background' : 'opacity-60 hover:opacity-100',
                  )}
                  style={{ backgroundColor: l.color, color: l.textColor }}
                >
                  {l.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATION_EXIT: only station picker needed (already above) */}
      {locationType === 'STATION_EXIT' && stationId && (
        <p className="text-xs text-muted-foreground">Le signalement sera associé à la sortie de cette station.</p>
      )}
    </div>
  );
}
