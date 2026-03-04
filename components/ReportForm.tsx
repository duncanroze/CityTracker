'use client';

import { useState, useCallback } from 'react';
import { Plus, X, Send } from 'lucide-react';
import type { Station, ReportType, ReportLocationType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateReport } from '@/hooks/useCreateReport';
import ReportTypePicker from './ReportTypePicker';
import ReportLocationPicker from './ReportLocationPicker';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReportFormProps {
  stations: Station[];
  onSuccess?: () => void;
}

type Step = 'closed' | 'type' | 'location' | 'comment';

export default function ReportForm({ stations, onSuccess }: ReportFormProps) {
  const { user } = useAuth();
  const { create, loading, error } = useCreateReport();

  const [step, setStep] = useState<Step>('closed');
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [locationType, setLocationType] = useState<ReportLocationType>('PLATFORM');
  const [stationId, setStationId] = useState<string | null>(null);
  const [stationName, setStationName] = useState<string | null>(null);
  const [lineCode, setLineCode] = useState<string | null>(null);
  const [direction, setDirection] = useState<string | null>(null);
  const [fromLineCode, setFromLineCode] = useState<string | null>(null);
  const [toLineCode, setToLineCode] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const reset = useCallback(() => {
    setStep('closed');
    setReportType(null);
    setLocationType('PLATFORM');
    setStationId(null);
    setStationName(null);
    setLineCode(null);
    setDirection(null);
    setFromLineCode(null);
    setToLineCode(null);
    setComment('');
  }, []);

  const canSubmit = reportType && stationId && (
    (locationType === 'PLATFORM' && lineCode) ||
    (locationType === 'TRANSFER_CORRIDOR' && fromLineCode && toLineCode) ||
    locationType === 'STATION_EXIT'
  );

  const handleSubmit = useCallback(async () => {
    if (!reportType || !stationId) return;

    const result = await create({
      type: reportType,
      locationType,
      stationId,
      lineCode,
      direction,
      fromLineCode,
      toLineCode,
      comment: comment.trim() || null,
    });

    if (result) {
      reset();
      onSuccess?.();
    }
  }, [reportType, locationType, stationId, lineCode, direction, fromLineCode, toLineCode, comment, create, reset, onSuccess]);

  // Not logged in: don't show the FAB
  if (!user) return null;

  // FAB button
  if (step === 'closed') {
    return (
      <button
        onClick={() => setStep('type')}
        className={cn(
          'fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full shadow-lg',
          'bg-primary text-primary-foreground',
          'flex items-center justify-center',
          'hover:scale-105 active:scale-95 transition-transform',
          'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
          'sm:bottom-6',
        )}
        aria-label="Nouveau signalement"
      >
        <Plus className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={reset} />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md bg-background rounded-t-xl sm:rounded-xl border border-border shadow-xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-sm font-semibold">
            {step === 'type' && 'Type de signalement'}
            {step === 'location' && 'Localisation'}
            {step === 'comment' && 'Commentaire'}
          </h2>
          <button
            onClick={reset}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded focus-visible:outline-2 focus-visible:outline-ring"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step 1: Type */}
          {step === 'type' && (
            <>
              <ReportTypePicker
                selected={reportType}
                onSelect={(type) => {
                  setReportType(type);
                  setStep('location');
                }}
              />
            </>
          )}

          {/* Step 2: Location */}
          {step === 'location' && (
            <>
              <ReportLocationPicker
                stations={stations}
                locationType={locationType}
                onLocationTypeChange={setLocationType}
                stationId={stationId}
                onStationChange={(id, name) => { setStationId(id); setStationName(name); }}
                lineCode={lineCode}
                onLineCodeChange={setLineCode}
                direction={direction}
                onDirectionChange={setDirection}
                fromLineCode={fromLineCode}
                onFromLineCodeChange={setFromLineCode}
                toLineCode={toLineCode}
                onToLineCodeChange={setToLineCode}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setStep('type')}>Retour</Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!stationId || (locationType === 'PLATFORM' && !lineCode) || (locationType === 'TRANSFER_CORRIDOR' && (!fromLineCode || !toLineCode))}
                  onClick={() => setStep('comment')}
                >
                  Suivant
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Comment + submit */}
          {step === 'comment' && (
            <>
              {/* Summary */}
              {stationName && (
                <p className="text-sm text-muted-foreground">
                  Signalement à <span className="font-medium text-foreground">{stationName}</span>
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Commentaire (optionnel, 140 car. max)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 140))}
                  placeholder="Détails supplémentaires..."
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus-visible:outline-2 focus-visible:outline-ring"
                />
                <span className="text-xs text-muted-foreground">{comment.length}/140</span>
              </div>

              {error && (
                <p role="alert" className="text-xs text-destructive">{error}</p>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setStep('location')}>Retour</Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!canSubmit || loading}
                  onClick={handleSubmit}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Envoi...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      Signaler
                    </span>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
