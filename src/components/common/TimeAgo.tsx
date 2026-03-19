import { timeAgo, formatDateTime } from '../../utils/format';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface TimeAgoProps {
  date: string;
  className?: string;
}

export default function TimeAgo({ date, className }: TimeAgoProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={date} className={className}>
          {timeAgo(date)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(date)}</TooltipContent>
    </Tooltip>
  );
}
