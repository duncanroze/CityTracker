'use client';

import { useReports } from '@/hooks/useReports';
import { useStations } from '@/hooks/useStations';
import ReportFeed from '@/components/ReportFeed';
import ReportForm from '@/components/ReportForm';

export default function CommunautePage() {
  const { reports, loading, error, refetch } = useReports();
  const { stations } = useStations();

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <ReportFeed
        reports={reports}
        loading={loading}
        error={error}
        onRefetch={refetch}
      />
      <ReportForm stations={stations} onSuccess={refetch} />
    </div>
  );
}
