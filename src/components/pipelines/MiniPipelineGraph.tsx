import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PipelineStatus from './PipelineStatus';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Skeleton } from '../ui/skeleton';
import { usePipelineStages } from '../../hooks/usePipelineStages';
import { formatDuration } from '../../utils/format';
import { isBridge, projectPathFromWebUrl } from '../../utils/pipelineStages';
import type { PipelineStatus as PipelineStatusType } from '../../types/gitlab';

/**
 * GitLab-style "stages" column: one status icon per stage (click to list its
 * jobs), followed by the downstream pipelines that trigger jobs created.
 */
export default function MiniPipelineGraph({ projectId, pipelineId, status }: {
  projectId: number;
  pipelineId: number;
  status: PipelineStatusType;
}) {
  const { data, isLoading } = usePipelineStages(projectId, pipelineId, { status });

  if (isLoading) return <Skeleton className="h-5 w-24" />;
  if (!data) return null;

  const downstream = data.bridges.flatMap((b) => (b.downstream_pipeline ? [{ bridge: b, dp: b.downstream_pipeline }] : []));
  const pipelineLink = `/projects/${projectId}/pipelines/${pipelineId}`;

  return (
    <div className="flex items-center gap-1">
      {data.stages.map((stage) => (
        <DropdownMenu key={stage.name}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger
                className="rounded-full p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Stage ${stage.name}: ${stage.status}`}
              >
                <PipelineStatus status={stage.status} size="md" />
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{stage.name}: {stage.status}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              {stage.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {stage.items.map((item) => (
              <DropdownMenuItem key={item.id} asChild>
                <Link
                  to={
                    isBridge(item) && item.downstream_pipeline
                      ? `/projects/${item.downstream_pipeline.project_id}/pipelines/${item.downstream_pipeline.id}`
                      : `${pipelineLink}?job=${item.id}`
                  }
                  className="flex items-center gap-2"
                >
                  <PipelineStatus status={item.status} size="sm" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {isBridge(item) ? (
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : item.duration ? (
                    <span className="text-xs text-muted-foreground">{formatDuration(item.duration)}</span>
                  ) : null}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}

      {downstream.length > 0 && (
        <>
          <ArrowRight className="h-3.5 w-3.5 mx-0.5 text-muted-foreground shrink-0" />
          {downstream.map(({ bridge, dp }) => {
            const path = projectPathFromWebUrl(dp.web_url);
            return (
              <Tooltip key={bridge.id}>
                <TooltipTrigger asChild>
                  <Link
                    to={`/projects/${dp.project_id}/pipelines/${dp.id}`}
                    className="rounded-full p-0.5 hover:bg-muted"
                    aria-label={`Downstream pipeline #${dp.id}`}
                  >
                    <PipelineStatus status={dp.status} size="md" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  {dp.project_id === projectId ? 'Child pipeline' : path ?? 'Downstream'} · #{dp.id} · {dp.status}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </>
      )}
    </div>
  );
}
