import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { getLanguageColor } from '../../utils/format';

interface LanguageBarProps {
  languages: Record<string, number>;
}

export default function LanguageBar({ languages }: LanguageBarProps) {
  const total = Object.values(languages).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const sorted = Object.entries(languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {sorted.map(([lang, bytes]) => (
          <Tooltip key={lang} delayDuration={0}>
            <TooltipTrigger asChild>
              <div
                className="h-full cursor-default transition-opacity hover:opacity-90"
                style={{
                  width: `${(bytes / total) * 100}%`,
                  backgroundColor: getLanguageColor(lang),
                  minWidth: '2px',
                }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {lang}: {((bytes / total) * 100).toFixed(1)}%
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {sorted.slice(0, 5).map(([lang, bytes]) => (
          <div key={lang} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getLanguageColor(lang) }}
            />
            <span>{lang}</span>
            <span className="opacity-60">{((bytes / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
