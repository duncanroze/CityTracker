import { useState, useEffect, useRef, useCallback } from 'react';
import type { PipelineScenario, PipelineRun, FeedbackEntry, AgentId, AgentStatus, PipelinePhase, PipelineLog } from '../lib/types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const WS_URL = 'ws://localhost:3002';
const RECONNECT_DELAY = 2000;

const IDLE_STATE: Record<AgentId, AgentStatus> = {
  planner: 'idle', designer: 'idle', backend: 'idle', reviewer: 'idle', tester: 'idle',
};

const IDLE_SCORES: Record<AgentId, number> = {
  planner: 0, designer: 0, backend: 0, reviewer: 0, tester: 0,
};

const IDLE_SCENARIO: PipelineScenario = {
  name: 'Live',
  state: { ...IDLE_STATE },
  phase: 0 as PipelinePhase,
  iterations: 0,
  maxIterations: 3,
  status: 'idle',
  request: "En attente d'une demande...",
  logs: [],
  scores: { ...IDLE_SCORES },
  autoApprove: true,
  startedAt: null,
  feedback: [],
};

export function usePipelineSocket() {
  const [scenario, setScenario] = useState<PipelineScenario>({ ...IDLE_SCENARIO, state: { ...IDLE_STATE }, logs: [], scores: { ...IDLE_SCORES } });
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);

        if (msg.type === 'state') {
          setScenario(prev => ({
            ...prev,
            name: 'Live',
            state: msg.data.state,
            phase: msg.data.phase as PipelinePhase,
            iterations: msg.data.iterations,
            maxIterations: msg.data.maxIterations ?? prev.maxIterations,
            status: msg.data.status,
            request: msg.data.request,
            scores: msg.data.scores ?? prev.scores,
            autoApprove: msg.data.autoApprove ?? prev.autoApprove,
            startedAt: msg.data.startedAt ?? prev.startedAt,
            feedback: msg.data.feedback ?? prev.feedback,
          }));
        } else if (msg.type === 'log') {
          setScenario(prev => ({
            ...prev,
            logs: [...prev.logs, msg.data as PipelineLog],
          }));
        } else if (msg.type === 'feedback') {
          setScenario(prev => ({
            ...prev,
            feedback: [...prev.feedback, msg.data as FeedbackEntry],
          }));
        } else if (msg.type === 'history') {
          setRuns(msg.data as PipelineRun[]);
        } else if (msg.type === 'reset') {
          setScenario({ ...IDLE_SCENARIO, state: { ...IDLE_STATE }, logs: [], scores: { ...IDLE_SCORES }, feedback: [] });
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { scenario, runs, connectionStatus };
}
