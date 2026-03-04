'use client';

import { BellRing, X } from 'lucide-react';

interface DescentAlertProps {
  stationName: string;
  onDismiss: () => void;
}

export default function DescentAlert({ stationName, onDismiss }: DescentAlertProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <BellRing className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          Descendez à <span className="font-bold">{stationName}</span>
        </p>
      </div>
      <button
        onClick={onDismiss}
        className="p-0.5 text-amber-600/60 hover:text-amber-700 dark:text-amber-400/60 dark:hover:text-amber-300 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
