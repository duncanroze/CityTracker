interface LineBadgeProps {
  code: string;
  color: string;
  textColor?: string;
}

export default function LineBadge({ code, color, textColor = '#FFFFFF' }: LineBadgeProps) {
  return (
    <span
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-bold leading-none"
      style={{ backgroundColor: color, color: textColor }}
    >
      {code}
    </span>
  );
}
