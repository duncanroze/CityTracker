import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

/**
 * Renders markdown content with custom styles for code blocks, headings, lists, etc.
 * Supports GitHub Flavored Markdown (GFM) via remark-gfm.
 */
export function MarkdownRenderer({ children, className }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={cn('max-w-none', className)}
      components={{
        // Inline code: small background
        code: ({ node, inline, className, children, ...props }) =>
          inline ? (
            <code
              className="rounded bg-slate-200 dark:bg-slate-800 px-1 py-0.5 text-[11px] font-mono text-foreground"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code
              className="block overflow-x-auto rounded bg-slate-100 dark:bg-slate-900 p-2 text-[11px] font-mono text-foreground"
              {...props}
            >
              {children}
            </code>
          ),
        // Pre (wraps code blocks)
        pre: ({ node, ...props }) => (
          <pre className="my-2 overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-900 border border-border" {...props} />
        ),
        // Headings
        h2: ({ node, ...props }) => (
          <h2 className="mt-4 mb-2 text-base font-semibold text-foreground" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="mt-3 mb-1 text-sm font-semibold text-foreground" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="mt-2 mb-1 text-[13px] font-semibold text-foreground" {...props} />
        ),
        // Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc pl-4 space-y-1 text-foreground/85" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal pl-4 space-y-1 text-foreground/85" {...props} />
        ),
        // Paragraphs
        p: ({ node, ...props }) => (
          <p className="mb-2 text-foreground/85" {...props} />
        ),
        // Blockquote
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-2 border-slate-400 dark:border-slate-600 pl-3 italic text-foreground/70"
            {...props}
          />
        ),
        // Strong/bold
        strong: ({ node, ...props }) => (
          <strong className="font-semibold text-foreground" {...props} />
        ),
        // Table (GFM)
        table: ({ node, ...props }) => (
          <table className="w-full border-collapse text-[11px]" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="border border-border bg-muted px-2 py-1 text-left font-semibold" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="border border-border px-2 py-1" {...props} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
