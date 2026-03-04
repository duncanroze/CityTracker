'use client';

import { useMemo } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { useReports } from '@/hooks/useReports';
import { REPORT_TYPE_MAP } from '@/lib/report-config';
import { useMapContext } from '@/contexts/MapContext';

export default function ReportMapMarkers() {
  const { reports } = useReports();
  const { dark } = useMapContext();

  // Group reports by station for clustering
  const stationGroups = useMemo(() => {
    const groups = new Map<string, typeof reports>();
    for (const r of reports) {
      const key = r.stationId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return groups;
  }, [reports]);

  const tooltipStyle = {
    background: dark ? 'rgba(23,23,23,0.9)' : 'rgba(255,255,255,0.9)',
    color: dark ? '#e5e5e5' : '#1a1a1a',
    border: 'none',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  } as const;

  return (
    <>
      {Array.from(stationGroups.entries()).map(([stationId, stationReports]) => {
        const first = stationReports[0];
        const config = REPORT_TYPE_MAP[first.type];
        const count = stationReports.length;

        return (
          <CircleMarker
            key={stationId}
            center={[first.stationLat, first.stationLng]}
            radius={count > 1 ? 8 : 6}
            pathOptions={{
              color: config.color,
              fillColor: config.color,
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} className="station-label">
              <span style={tooltipStyle}>
                {count > 1
                  ? `${count} signalements — ${first.stationName}`
                  : `${config.label} — ${first.stationName}`}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}
