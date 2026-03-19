import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Lock } from 'lucide-react';

interface PermGateProps {
  /** Whether the action is allowed */
  allowed: boolean;
  /** Message shown in the tooltip when not allowed */
  reason?: string;
  children: React.ReactNode;
  /** Extra class applied to the wrapper when not allowed */
  className?: string;
}

/**
 * Wraps children in a disabled overlay with an explanatory tooltip when
 * the current PAT does not have the required scope.
 */
export default function PermGate({
  allowed,
  reason = 'Requires "api" scope on your Personal Access Token',
  children,
  className,
}: PermGateProps) {
  if (allowed) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex opacity-50 cursor-not-allowed select-none pointer-events-none ${className ?? ''}`}
          aria-disabled="true"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-1.5 max-w-64 text-center">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>{reason}</span>
      </TooltipContent>
    </Tooltip>
  );
}
