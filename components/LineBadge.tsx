import { cn } from '@/lib/utils';

interface LineBadgeProps {
  code: string;
  color: string;
  textColor?: string;
  disruption?: 'disrupted' | 'interrupted' | null;
  size?: 'sm' | 'default' | 'lg';
  shape?: 'circle' | 'rounded';
}

export default function LineBadge({
  code,
  color,
  textColor = '#FFFFFF',
  disruption,
  size = 'default',
  shape = 'rounded',
}: LineBadgeProps) {
  return (
    <span className="relative inline-flex items-center">
      <span
        className={cn(
          'inline-flex items-center justify-center font-bold leading-none shrink-0 shadow-sm',
          shape === 'circle' ? 'rounded-full' : 'rounded-md',
          size === 'sm' && 'px-1 py-px text-[10px]',
          size === 'default' && 'px-1.5 py-0.5 text-xs',
          size === 'lg' && (shape === 'circle' ? 'w-10 h-10 text-sm' : 'w-12 h-9 text-sm'),
        )}
        style={{
          backgroundColor: color,
          color: textColor,
          outline: disruption ? `2px solid var(--disruption-${disruption === 'interrupted' ? 'interrupted' : 'warning'})` : undefined,
          outlineOffset: disruption ? '1px' : undefined,
        }}
      >
        {code}
      </span>
      {disruption && (
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: `var(--disruption-${disruption === 'interrupted' ? 'interrupted' : 'warning'})` }}
        />
      )}
    </span>
  );
}
