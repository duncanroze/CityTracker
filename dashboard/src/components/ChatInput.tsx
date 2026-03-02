import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2, Check, X, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ConnectionStatus } from '../hooks/usePipelineSocket';

/** Lightweight markdown → HTML for plan display (headers, bold, code, lists) */
function renderMarkdown(md: string): string {
  return md
    .split('\n')
    .map(line => {
      // Code blocks (```) → handled below as multiline
      if (line.startsWith('```')) return line;
      // Headers
      if (line.startsWith('### ')) return `<h4 class="mt-3 mb-1 text-[13px] font-bold text-foreground">${line.slice(4)}</h4>`;
      if (line.startsWith('## ')) return `<h3 class="mt-4 mb-1 text-[14px] font-bold text-foreground">${line.slice(3)}</h3>`;
      if (line.startsWith('# ')) return `<h2 class="mt-4 mb-1.5 text-[15px] font-bold text-foreground">${line.slice(2)}</h2>`;
      // Bullet lists
      if (/^[-*] /.test(line)) return `<li class="ml-4 list-disc">${inlineFormat(line.slice(2))}</li>`;
      // Numbered lists
      if (/^\d+\. /.test(line)) return `<li class="ml-4 list-decimal">${inlineFormat(line.replace(/^\d+\.\s/, ''))}</li>`;
      // Empty lines
      if (line.trim() === '') return '<br/>';
      // Regular paragraph
      return `<p>${inlineFormat(line)}</p>`;
    })
    .join('\n')
    // Handle code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="my-2 rounded bg-black/20 p-2 text-[11px] overflow-x-auto">$1</pre>');
}

function inlineFormat(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/20 px-1 py-0.5 text-[11px]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

interface ChatInputProps {
  status: string;
  request: string;
  iterations: number;
  maxIterations: number;
  connectionStatus: ConnectionStatus;
  pendingPlan: string | null;
  onSend: (message: string) => void;
  onApprovePlan: (plan: string) => void;
  onRejectPlan: () => void;
}

function PlanMarkdown({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);
  return (
    <div
      className="mb-3 max-h-[400px] overflow-y-auto rounded-lg border border-border bg-card p-3 text-[12px] leading-relaxed text-foreground/90"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function ChatInput({
  status,
  request,
  iterations,
  maxIterations,
  connectionStatus,
  pendingPlan,
  onSend,
  onApprovePlan,
  onRejectPlan,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [editedPlan, setEditedPlan] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isIdle = status === 'idle';
  const isAwaitingApproval = status === 'awaiting_approval' || pendingPlan !== null;
  const isRunning = !isIdle && !isAwaitingApproval;
  const canSend = connectionStatus === 'connected' && isIdle && input.trim().length > 0;

  // Auto-focus input when idle
  useEffect(() => {
    if (isIdle && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isIdle]);

  // Sync pending plan to editable state
  useEffect(() => {
    if (pendingPlan) {
      setEditedPlan(pendingPlan);
      setIsEditingPlan(false);
    }
  }, [pendingPlan]);

  const handleSend = () => {
    if (!canSend) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Keep Ctrl+A within the input (don't select entire page)
    if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Plan approval mode
  if (isAwaitingApproval && pendingPlan) {
    return (
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/10 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-400">
              Plan propose
            </span>
            <span className="text-[12px] text-muted-foreground">
              Validez ou modifiez le plan avant l'execution
            </span>
          </div>
          <button
            onClick={() => {
              setIsEditingPlan(!isEditingPlan);
              if (!isEditingPlan) {
                setTimeout(() => textareaRef.current?.focus(), 0);
              }
            }}
            className={cn(
              'flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              isEditingPlan
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Pencil className="h-3 w-3" />
            {isEditingPlan ? 'Edition' : 'Modifier'}
          </button>
        </div>

        {isEditingPlan ? (
          <textarea
            ref={textareaRef}
            value={editedPlan}
            onChange={(e) => setEditedPlan(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'a' && (e.ctrlKey || e.metaKey)) e.stopPropagation(); }}
            className="mb-3 w-full rounded-lg border border-border bg-card p-3 font-mono text-[12px] text-foreground/90 outline-none focus:border-indigo-500/50"
            rows={Math.min(20, editedPlan.split('\n').length + 2)}
          />
        ) : (
          <PlanMarkdown content={editedPlan} />
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprovePlan(editedPlan)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-500/15 px-4 py-2 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
          >
            <Check className="h-3.5 w-3.5" />
            Valider et lancer
          </button>
          <button
            onClick={onRejectPlan}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-500/10 px-4 py-2 text-[12px] font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <X className="h-3.5 w-3.5" />
            Annuler
          </button>
          {editedPlan !== pendingPlan && (
            <span className="ml-2 text-[11px] text-amber-400">
              (plan modifie)
            </span>
          )}
        </div>
      </div>
    );
  }

  // Running mode
  if (isRunning) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-3 text-[13px]">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" />
        <span className="text-muted-foreground">Demande :</span>
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{request}</span>
        {iterations > 0 && (
          <span className="ml-auto shrink-0 rounded-lg bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
            Iteration {iterations}/{maxIterations}
          </span>
        )}
      </div>
    );
  }

  // Idle mode — chat input
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Decrivez votre demande..."
        disabled={connectionStatus !== 'connected'}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={cn(
          'flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-all duration-150',
          canSend
            ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25'
            : 'text-muted-foreground/30 cursor-not-allowed',
        )}
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
