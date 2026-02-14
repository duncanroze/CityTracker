import { useState, useCallback } from 'react';
import type { Station } from '../types';
import StationPicker from './StationPicker';

interface RouteFormProps {
  stations: Station[];
  loading: boolean;
  onSearch: (fromId: string, toId: string) => void;
}

export default function RouteForm({ stations, loading, onSearch }: RouteFormProps) {
  const [from, setFrom] = useState<Station | null>(null);
  const [to, setTo] = useState<Station | null>(null);

  const handleSwap = useCallback(() => {
    setFrom(to);
    setTo(from);
  }, [from, to]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (from && to) onSearch(from.id, to.id);
    },
    [from, to, onSearch],
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <StationPicker label="From" stations={stations} selected={from} onSelect={setFrom} />

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSwap}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          title="Swap stations"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8.6 3.44a.75.75 0 10-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V4.25a.75.75 0 00-1.5 0v8.59l-1.95-2.1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <StationPicker label="To" stations={stations} selected={to} onSelect={setTo} />

      <button
        type="submit"
        disabled={!from || !to || loading}
        className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Searching...' : 'Find route'}
      </button>
    </form>
  );
}
