import { useState, useEffect } from 'react';
import type { CommunityReport, RouteResult } from '@/types';

export function useRouteAlerts(route: RouteResult | null) {
  const [alerts, setAlerts] = useState<CommunityReport[]>([]);

  useEffect(() => {
    if (!route?.found || route.segments.length === 0) {
      setAlerts([]);
      return;
    }

    let cancelled = false;

    const stationIds = new Set<string>();
    const lineCodes = new Set<string>();

    for (const seg of route.segments) {
      lineCodes.add(seg.lineCode);
      for (const stop of seg.stops) {
        stationIds.add(stop.stationId);
      }
    }

    async function fetchAlerts() {
      try {
        const params = new URLSearchParams({
          stationIds: [...stationIds].join(','),
          lineCodes: [...lineCodes].join(','),
        });
        const res = await fetch(`/api/reports/route-alerts?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAlerts(data.reports);
      } catch (err) {
        console.warn('Failed to fetch route alerts:', err);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [route]);

  return alerts;
}
