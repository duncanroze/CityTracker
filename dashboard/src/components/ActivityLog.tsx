import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AGENTS } from '../lib/config';
import { cn } from '../lib/utils';
import type { PipelineLog } from '../lib/types';

interface ActivityLogProps {
  logs: PipelineLog[];
}

export default function ActivityLog({ logs }: ActivityLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Detect when user scrolls away from bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setUserScrolled(!atBottom);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-scroll to bottom on new logs (unless user scrolled up)
  useEffect(() => {
    if (!userScrolled) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, userScrolled]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUserScrolled(false);
  };

  if (logs.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 relative">
      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-status-running" />
        Journal d&apos;activite
        <span className="ml-auto text-[10px] font-normal tabular-nums">{logs.length}</span>
      </div>
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto scroll-smooth">
        {logs.map((log, i) => {
          const agent = AGENTS.find(a => a.id === log.agent);
          const isFeedback = log.msg.startsWith('[FEEDBACK');
          const isRedispatch = log.msg.startsWith('[REDISPATCH]');
          const isIterLimit = log.msg.startsWith('[ITERATION LIMIT]');
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2.5 py-1.5 font-mono text-[12.5px]',
                isFeedback && 'border-l-2 border-amber-500/50 bg-amber-500/5 pl-2 -ml-2 rounded-r',
                isRedispatch && 'border-l-2 border-indigo-500/50 bg-indigo-500/5 pl-2 -ml-2 rounded-r',
                isIterLimit && 'border-l-2 border-red-500/50 bg-red-500/5 pl-2 -ml-2 rounded-r',
              )}
            >
              <span className="shrink-0 text-muted-foreground">{log.time}</span>
              <span
                className="w-[72px] shrink-0 font-semibold"
                style={{ color: agent?.color }}
              >
                [{agent?.name ?? log.agent}]
              </span>
              <span className="text-foreground/85">{log.msg}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {/* Scroll-to-bottom button when user scrolled up */}
      {userScrolled && (
        <button
          onClick={scrollToBottom}
          className={cn(
            'absolute bottom-6 right-6 flex items-center gap-1 rounded-full',
            'bg-indigo-500/90 px-2.5 py-1 text-[11px] font-medium text-white',
            'shadow-lg backdrop-blur-sm transition-all hover:bg-indigo-500',
            'cursor-pointer',
          )}
        >
          <ChevronDown className="h-3 w-3" />
          Dernieres entrees
        </button>
      )}
    </div>
  );
}
