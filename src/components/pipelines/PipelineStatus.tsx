import {
  CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle,
  MinusCircle, SkipForward, Pause, Play,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { PipelineStatus as PipelineStatusType } from '../../types/gitlab';

interface PipelineStatusProps {
  status: PipelineStatusType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const statusConfig: Record<PipelineStatusType, {
  icon: React.ElementType;
  label: string;
  className: string;
  animate?: boolean;
}> = {
  success: { icon: CheckCircle2, label: 'Passed', className: 'text-green-500' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-red-500' },
  running: { icon: RefreshCw, label: 'Running', className: 'text-blue-500', animate: true },
  pending: { icon: Clock, label: 'Pending', className: 'text-yellow-500' },
  created: { icon: Clock, label: 'Created', className: 'text-gray-400' },
  canceled: { icon: MinusCircle, label: 'Canceled', className: 'text-gray-500' },
  skipped: { icon: SkipForward, label: 'Skipped', className: 'text-gray-400' },
  manual: { icon: Play, label: 'Manual', className: 'text-purple-500' },
  scheduled: { icon: Pause, label: 'Scheduled', className: 'text-teal-500' },
  waiting_for_resource: { icon: Clock, label: 'Waiting', className: 'text-orange-400' },
  preparing: { icon: RefreshCw, label: 'Preparing', className: 'text-blue-400', animate: true },
};

const sizeClasses = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export default function PipelineStatus({
  status,
  size = 'md',
  showLabel = false,
  className,
}: PipelineStatusProps) {
  const config = statusConfig[status] ?? statusConfig.created;
  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon
        className={cn(
          sizeClasses[size],
          config.className,
          config.animate && 'animate-spin'
        )}
      />
      {showLabel && (
        <span className={cn('text-sm font-medium', config.className)}>{config.label}</span>
      )}
    </span>
  );
}

export function PipelineBadge({ status }: { status: PipelineStatusType }) {
  const config = statusConfig[status] ?? statusConfig.created;
  const Icon = config.icon;

  const bgMap: Record<string, string> = {
    'text-green-500': 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    'text-red-500': 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    'text-blue-500': 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    'text-yellow-500': 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    'text-gray-400': 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700',
    'text-gray-500': 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700',
    'text-purple-500': 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    'text-teal-500': 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
    'text-orange-400': 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    'text-blue-400': 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        bgMap[config.className] ?? 'bg-muted border-border',
        config.className
      )}
    >
      <Icon className={cn('h-3 w-3', config.animate && 'animate-spin')} />
      {config.label}
    </span>
  );
}
