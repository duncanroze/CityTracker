interface LineBadgeProps {
  code: string;
  color: string;
  textColor?: string;
  disruption?: 'disrupted' | 'interrupted' | null;
  size?: 'sm' | 'default';
}

export default function LineBadge({ code, color, textColor = '#FFFFFF', disruption, size = 'default' }: LineBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'px-1 py-px text-[10px]'
    : 'px-1.5 py-0.5 text-xs';

  return (
    <span className="relative inline-flex items-center">
      <span
        className={`inline-flex items-center justify-center rounded-md font-bold leading-none ${sizeClasses}`}
        style={{
          backgroundColor: color,
          color: textColor,
          outline: disruption ? `2px solid ${disruption === 'interrupted' ? 'oklch(0.577 0.245 27.325)' : 'oklch(0.75 0.183 55.934)'}` : undefined,
          outlineOffset: '1px',
        }}
      >
        {code}
      </span>
      {disruption && (
        <span
          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: disruption === 'interrupted' ? 'oklch(0.577 0.245 27.325)' : 'oklch(0.75 0.183 55.934)' }}
        />
      )}
    </span>
  );
}
