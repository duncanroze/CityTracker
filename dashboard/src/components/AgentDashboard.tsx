import { useState, useEffect, useMemo } from 'react';
import { Wifi, WifiOff, Radio, Timer } from 'lucide-react';
import { cn } from '../lib/utils';
import { DEMO_SCENARIOS } from '../lib/config';
import { usePipelineSocket, type ConnectionStatus } from '../hooks/usePipelineSocket';
import { useElapsedTime, formatElapsed } from '../hooks/useElapsedTime';
import PhaseTracker from './PhaseTracker';
import PipelineView from './PipelineView';
import ActivityLog from './ActivityLog';
import RunHistory from './RunHistory';
import SummaryBanner from './SummaryBanner';
import AgentDetailPanel from './AgentDetailPanel';
import ChatInput from './ChatInput';
import type { AgentId } from '../lib/types';

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: { icon: Wifi, label: 'Connecte', color: 'text-emerald-500', dot: 'bg-emerald-500' },
    connecting: { icon: Radio, label: 'Connexion...', color: 'text-amber-500', dot: 'bg-amber-500' },
    disconnected: { icon: WifiOff, label: 'Deconnecte', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  }[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5 text-[11px] font-medium', config.color)}>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', config.dot, status === 'connecting' && 'animate-pulse-dot')} />
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </div>
  );
}

export default function AgentDashboard() {
  const { scenario: liveScenario, runs, connectionStatus, streamBuffers, pendingPlan, sendChat, approvePlan, rejectPlan } = usePipelineSocket();

  const [mode, setMode] = useState<'live' | 'demo'>('live');
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);

  useEffect(() => {
    if (connectionStatus === 'connected') setMode('live');
  }, [connectionStatus]);

  useEffect(() => {
    if (mode !== 'demo' || !autoPlay) return;
    const timer = setInterval(() => {
      setScenarioIdx(prev => (prev + 1) % DEMO_SCENARIOS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [mode, autoPlay]);

  const scenario = mode === 'live' ? liveScenario : DEMO_SCENARIOS[scenarioIdx];

  // Live timer
  const isRunning = scenario.status !== 'idle' && scenario.status !== 'completed';
  const elapsed = useElapsedTime(scenario.startedAt, isRunning && mode === 'live');

  // Pipeline completion detection
  const allDone = useMemo(() => {
    if (scenario.status === 'idle') return false;
    const statuses = Object.values(scenario.state);
    const active = statuses.filter(s => s !== 'idle');
    return active.length > 0 && active.every(s => s === 'completed' || s === 'error');
  }, [scenario.state, scenario.status]);

  const hasError = useMemo(() => Object.values(scenario.state).some(s => s === 'error'), [scenario.state]);

  const activeCount = Object.values(scenario.state).filter(s => s === 'running').length;
  const completedCount = Object.values(scenario.state).filter(s => s === 'completed').length;
  const errorCount = Object.values(scenario.state).filter(s => s === 'error' || s === 'blocked').length;

  return (
    <div className="mx-auto max-w-[880px] px-5 py-6">
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-400 bg-clip-text text-[22px] font-extrabold tracking-tight text-transparent">
            Agent Pipeline Monitor
          </h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-[13px] text-muted-foreground">
              Visualisation temps reel du pipeline multi-agent
            </p>
            <ConnectionIndicator status={connectionStatus} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {elapsed > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-amber-500">
              <Timer className="h-3 w-3" />
              {formatElapsed(elapsed)}
            </span>
          )}
          {activeCount > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-500">
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          )}
          {completedCount > 0 && (
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
              {completedCount} termine{completedCount > 1 ? 's' : ''}
            </span>
          )}
          {errorCount > 0 && (
            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-500">
              {errorCount} erreur{errorCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      {allDone && (
        <div className="mb-4">
          <SummaryBanner
            status={hasError ? 'error' : 'completed'}
            durationMs={elapsed * 1000}
            scores={scenario.scores}
            logCount={scenario.logs.length}
            iterations={scenario.iterations}
            feedbackCount={scenario.feedback?.length ?? 0}
          />
        </div>
      )}

      {/* Chat Input / Request Display */}
      <div className="mb-4">
        <ChatInput
          status={scenario.status}
          request={scenario.request}
          iterations={scenario.iterations}
          maxIterations={scenario.maxIterations ?? 3}
          connectionStatus={connectionStatus}
          pendingPlan={mode === 'live' ? pendingPlan : null}
          onSend={sendChat}
          onApprovePlan={approvePlan}
          onRejectPlan={rejectPlan}
        />
      </div>

      {/* Phase Tracker */}
      <div className="mb-5">
        <PhaseTracker
          currentPhase={scenario.phase}
          iterations={scenario.iterations}
          maxIterations={scenario.maxIterations}
        />
      </div>

      {/* Pipeline View */}
      <div className="mb-5">
        <PipelineView
          state={scenario.state}
          scores={scenario.scores}
          logs={scenario.logs}
          feedback={scenario.feedback}
          onAgentClick={setSelectedAgent}
        />
      </div>

      {/* Activity Log */}
      <div className="mb-5">
        <ActivityLog logs={scenario.logs} />
      </div>

      {/* Run History */}
      {runs.length > 0 && (
        <div className="mb-5">
          <RunHistory runs={runs} />
        </div>
      )}

      {/* Controls */}
      <div className="rounded-lg border border-border bg-muted p-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Source
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setMode('live')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-all duration-200',
                mode === 'live'
                  ? 'border-[1.5px] border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-400'
                  : 'border border-border font-normal text-muted-foreground hover:text-foreground',
              )}
            >
              Live
            </button>
            <button
              onClick={() => setMode('demo')}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-all duration-200',
                mode === 'demo'
                  ? 'border-[1.5px] border-indigo-500 bg-indigo-500/15 font-semibold text-indigo-400'
                  : 'border border-border font-normal text-muted-foreground hover:text-foreground',
              )}
            >
              Demo
            </button>
          </div>
        </div>

        {mode === 'demo' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {DEMO_SCENARIOS.map((s, i) => (
              <button
                key={i}
                onClick={() => { setScenarioIdx(i); setAutoPlay(false); }}
                className={cn(
                  'cursor-pointer rounded-lg px-3 py-1.5 text-xs transition-all duration-200',
                  i === scenarioIdx
                    ? 'border-[1.5px] border-indigo-500 bg-indigo-500/15 font-semibold text-indigo-400'
                    : 'border border-border font-normal text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                )}
              >
                {s.name}
              </button>
            ))}
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={cn(
                'ml-auto cursor-pointer rounded-lg border-[1.5px] px-3.5 py-1.5 text-xs font-semibold transition-all duration-200',
                autoPlay
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {autoPlay ? 'Pause' : 'Auto-play'}
            </button>
          </div>
        )}
      </div>

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <AgentDetailPanel
          agentId={selectedAgent}
          status={scenario.state[selectedAgent]}
          score={scenario.scores[selectedAgent]}
          logs={scenario.logs}
          feedback={scenario.feedback ?? []}
          streamBuffer={mode === 'live' ? streamBuffers[selectedAgent] : undefined}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
