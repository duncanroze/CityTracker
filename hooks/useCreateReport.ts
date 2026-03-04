import { useState, useCallback } from 'react';
import type { CommunityReport, ReportType, ReportLocationType } from '@/types';

export interface CreateReportInput {
  type: ReportType;
  locationType: ReportLocationType;
  stationId: string;
  lineCode?: string | null;
  direction?: string | null;
  fromLineCode?: string | null;
  toLineCode?: string | null;
  comment?: string | null;
}

export function useCreateReport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (input: CreateReportInput): Promise<CommunityReport | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Erreur de création');
        return null;
      }

      return data.report;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}
