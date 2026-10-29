import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import PipelineStatus from './PipelineStatus';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { usePipelineStages } from '../../hooks/usePipelineStages';
import { formatDuration } from '../../utils/format';
import { isBridge, projectPathFromWebUrl, type PipelineStage } from '../../utils/pipelineStages';
import { cn } from '../../utils/cn';
import type { GitLabBridge, GitLabDownstreamPipeline, GitLabJob } from '../../types/gitlab';

export type SelectJobHandler = (projectId: number, pipelineId: number, job: GitLabJob) => void;

interface GraphProps {
  projectId: number;
  pipelineId: number;
  selectedJobId?: number | null;
  onSelectJob: SelectJobHandler;
}

/**
 * Full pipeline graph: one column per stage, then a column of downstream
 * pipelines (multi-project or child). Each downstream card can be expanded to
 * render that pipeline's own graph to its right, recursively.
 */
export default function PipelineGraph(props: GraphProps) {
  const { data, isLoading } = usePipelineStages(props.projectId, props.pipelineId);

  if (isLoading) {
    return (
      <div className="flex gap-6">
        {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-40" />)}
      </div>
    );
  }
  if (!data || data.stages.length === 0) {
    return <p className="text-sm text-muted-foreground">This pipeline has no jobs.</p>;
  }

  return (
    <div className="overflow-x-auto pb-2">
      <GraphBody {...props} stages={data.stages} bridges={data.bridges} />
    </div>
  );
}

function GraphBody({ projectId, pipelineId, stages, bridges, selectedJobId, onSelectJob }: GraphProps & {
  stages: PipelineStage[];
  bridges: GitLabBridge[];
}) {
  const [expanded, setExpanded] = useState<GitLabDownstreamPipeline | null>(null);
  const downstream = bridges.flatMap((b) => (b.downstream_pipeline ? [{ bridge: b, dp: b.downstream_pipeline }] : []));

  return (
    <div className="flex items-start gap-0 w-max">
      {stages.map((stage, si) => (
        <div key={stage.name} className="flex items-start">
          {si > 0 && <div className="h-px w-6 bg-border mt-[2.6rem] shrink-0" />}
          <div className="w-48">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1 truncate" title={stage.name}>
              {stage.name}
            </p>
            <div className="space-y-1.5">
              {stage.items.map((item) =>
                isBridge(item) ? (
                  <BridgeCard key={item.id} bridge={item} />
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectJob(projectId, pipelineId, item)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-full border text-sm transition-all',
                      selectedJobId === item.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    )}
                  >
                    <PipelineStatus status={item.status} size="sm" />
                    <span className="truncate flex-1 text-left" title={item.name}>{item.name}</span>
                    {item.allow_failure && item.status === 'failed' && (
                      <span className="text-[10px] text-orange-500 shrink-0">allowed</span>
                    )}
                    {item.duration ? (
                      <span className="text-xs text-muted-foreground shrink-0">{formatDuration(item.duration)}</span>
                    ) : null}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      ))}

      {downstream.length > 0 && (
        <div className="flex items-start">
          <div className="h-px w-6 bg-border mt-[2.6rem] shrink-0" />
          <div className="w-60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Downstream
            </p>
            <div className="space-y-1.5">
              {downstream.map(({ bridge, dp }) => (
                <DownstreamCard
                  key={bridge.id}
                  bridge={bridge}
                  pipeline={dp}
                  isChild={dp.project_id === projectId}
                  expanded={expanded?.id === dp.id}
                  onToggle={() => setExpanded(expanded?.id === dp.id ? null : dp)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="flex items-start ml-4 pl-4 border-l-2 border-dashed border-primary/40">
          <ExpandedPipeline
            projectId={expanded.project_id}
            pipelineId={expanded.id}
            selectedJobId={selectedJobId}
            onSelectJob={onSelectJob}
          />
        </div>
      )}
    </div>
  );
}

function ExpandedPipeline(props: GraphProps) {
  const { data, isLoading, isError } = usePipelineStages(props.projectId, props.pipelineId);
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-8" />;
  if (isError || !data) {
    return <p className="text-sm text-muted-foreground mt-8 w-48">Can't load this pipeline. Your token may not have access to its project.</p>;
  }
  return <GraphBody {...props} stages={data.stages} bridges={data.bridges} />;
}

function BridgeCard({ bridge }: { bridge: GitLabBridge }) {
  const dp = bridge.downstream_pipeline;
  const content = (
    <>
      <PipelineStatus status={bridge.status} size="sm" />
      <span className="truncate flex-1 text-left" title={bridge.name}>{bridge.name}</span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </>
  );
  const cls = 'w-full flex items-center gap-2 px-2.5 py-2 rounded-full border border-dashed text-sm bg-card';
  return dp ? (
    <Link to={`/projects/${dp.project_id}/pipelines/${dp.id}`} className={cn(cls, 'hover:bg-muted')}>
      {content}
    </Link>
  ) : (
    <div className={cn(cls, 'text-muted-foreground')}>{content}</div>
  );
}

function DownstreamCard({ bridge, pipeline, isChild, expanded, onToggle }: {
  bridge: GitLabBridge;
  pipeline: GitLabDownstreamPipeline;
  isChild: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const path = projectPathFromWebUrl(pipeline.web_url);
  return (
    <div className={cn('flex items-stretch rounded-lg border bg-card text-sm', expanded && 'border-primary')}>
      <Link
        to={`/projects/${pipeline.project_id}/pipelines/${pipeline.id}`}
        className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 hover:bg-muted rounded-l-lg"
      >
        <PipelineStatus status={pipeline.status} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-medium" title={path ?? undefined}>
            {isChild ? bridge.name : path ?? bridge.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            #{pipeline.id} · {isChild ? 'child pipeline' : `triggered by ${bridge.name}`}
          </p>
        </div>
      </Link>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse downstream pipeline' : 'Expand downstream pipeline'}
            className="px-1.5 border-l hover:bg-muted rounded-r-lg text-muted-foreground"
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{expanded ? 'Collapse' : 'Expand'} jobs</TooltipContent>
      </Tooltip>
    </div>
  );
}
