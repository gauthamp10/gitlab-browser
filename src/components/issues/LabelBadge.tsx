import { cn } from '../../utils/cn';

interface LabelBadgeProps {
  name: string;
  color?: string;
  textColor?: string;
  className?: string;
  onRemove?: () => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default function LabelBadge({ name, color, textColor, className, onRemove }: LabelBadgeProps) {
  const bg = color ?? '#e0e0e0';
  const fg = textColor ?? getContrastColor(bg);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium leading-none',
        className
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 rounded-full"
          style={{ color: fg }}
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export function LabelList({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <LabelBadge key={label} name={label} />
      ))}
    </div>
  );
}
