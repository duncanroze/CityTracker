import { useState, useCallback } from 'react';

export function useUpvoteReport(onSuccess?: () => void) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const upvote = useCallback(async (reportId: string) => {
    setLoadingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/upvote`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        console.warn('Upvote failed:', data.error);
        return false;
      }
      onSuccess?.();
      return true;
    } catch (err) {
      console.warn('Upvote error:', err);
      return false;
    } finally {
      setLoadingId(null);
    }
  }, [onSuccess]);

  return { upvote, loadingId };
}
