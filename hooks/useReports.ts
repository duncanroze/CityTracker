import { useState, useEffect, useCallback } from 'react';
import type { CommunityReport, ReportType } from '@/types';

interface UseReportsOptions {
  stationId?: string;
  lineCode?: string;
  type?: ReportType;
}

export function useReports(options?: UseReportsOptions) {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (options?.stationId) params.set('stationId', options.stationId);
      if (options?.lineCode) params.set('lineCode', options.lineCode);
      if (options?.type) params.set('type', options.type);
      const qs = params.toString();
      const res = await fetch(`/api/reports${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setReports(data.reports);
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch reports:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [options?.stationId, options?.lineCode, options?.type]);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      await fetchReports();
      if (cancelled) return;
    };

    doFetch();
    const interval = setInterval(doFetch, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchReports]);

  return { reports, loading, error, refetch: fetchReports };
}
