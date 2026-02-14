import type { Transfer } from '../types';

interface TransferIndicatorProps {
  transfer: Transfer;
}

export default function TransferIndicator({ transfer }: TransferIndicatorProps) {
  const mins = Math.round(transfer.walkingTimeSeconds / 60);

  return (
    <div className="flex items-center gap-2 py-2 pl-6 text-sm text-gray-500">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-gray-400">
        <path d="M10 3.75a2 2 0 10-4 0 2 2 0 004 0zM17.25 7.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM5 6a.75.75 0 01.544.235l2 2.125a.75.75 0 01-.044 1.06l-1.5 1.33V14a.75.75 0 01-1.5 0v-3.5a.75.75 0 01.28-.586L6.194 8.7 5.456 7.92 3.78 8.695a.75.75 0 01-.652-1.35l1.25-.604A.75.75 0 015 6zm12.25 5.5a.75.75 0 000-1.5h-5.5a.75.75 0 000 1.5h5.5zM14 14.75a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75z" />
      </svg>
      <span>
        Walk {mins > 0 ? `${mins} min` : `${transfer.walkingTimeSeconds}s`} at {transfer.stationName}
      </span>
    </div>
  );
}
