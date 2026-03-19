import { useMemo } from 'react';
import { format, startOfYear, eachWeekOfInterval, addDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import type { GitLabEvent } from '../../types/gitlab';

interface ContributionHeatmapProps {
  events: GitLabEvent[];
  year?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getColor(count: number): string {
  if (count === 0) return 'bg-muted hover:bg-muted/80';
  if (count < 3) return 'bg-green-200 dark:bg-green-900 hover:bg-green-300 dark:hover:bg-green-800';
  if (count < 6) return 'bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-600';
  if (count < 10) return 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400';
  return 'bg-green-800 dark:bg-green-300 hover:bg-green-900 dark:hover:bg-green-200';
}

export default function ContributionHeatmap({
  events,
  year = new Date().getFullYear(),
}: ContributionHeatmapProps) {
  const contributionMap = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((event) => {
      const date = event.created_at.slice(0, 10);
      map[date] = (map[date] || 0) + 1;
    });
    return map;
  }, [events]);

  const totalContributions = useMemo(
    () => Object.values(contributionMap).reduce((sum, n) => sum + n, 0),
    [contributionMap]
  );

  const { weeks, monthLabels } = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = new Date(year, 11, 31);
    const weekStarts = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });

    const weeksData = weekStarts.map((weekStart) =>
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        const dateStr = format(day, 'yyyy-MM-dd');
        return {
          date: day,
          dateStr,
          count: contributionMap[dateStr] || 0,
          isCurrentYear: day.getFullYear() === year,
        };
      })
    );

    const labels: Array<{ month: string; col: number }> = [];
    let lastMonth = -1;
    weeksData.forEach((week, wi) => {
      const firstDayOfYear = week.find((d) => d.isCurrentYear);
      if (firstDayOfYear) {
        const m = firstDayOfYear.date.getMonth();
        if (m !== lastMonth) {
          labels.push({ month: MONTHS[m], col: wi });
          lastMonth = m;
        }
      }
    });

    return { weeks: weeksData, monthLabels: labels };
  }, [contributionMap, year]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {totalContributions.toLocaleString()} contributions in {year}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          {[0, 2, 5, 8, 11].map((n) => (
            <div key={n} className={`w-3 h-3 rounded-sm ${getColor(n)}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <div className="flex flex-col gap-[3px] mr-1 mt-5">
          {[0, 1, 2, 3, 4, 5, 6].filter((_, i) => i % 2 === 1).map((i) => (
            <div key={i} className="h-3 text-[9px] text-muted-foreground leading-3">
              {DAYS[i]}
            </div>
          ))}
        </div>

        <div className="flex-1">
          <div className="flex mb-1 relative" style={{ height: '16px' }}>
            {monthLabels.map(({ month, col }) => (
              <div
                key={`${month}-${col}`}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: `${col * 16}px` }}
              >
                {month}
              </div>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  day.isCurrentYear ? (
                    <Tooltip key={di} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-3 h-3 rounded-sm cursor-pointer heatmap-cell ${getColor(day.count)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{day.count} contribution{day.count !== 1 ? 's' : ''} on {format(day.date, 'MMM d, yyyy')}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div key={di} className="w-3 h-3 rounded-sm bg-transparent" />
                  )
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
