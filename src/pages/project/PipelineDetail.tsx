import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, XCircle, ChevronRight, Play, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import PipelineStatus, { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import JobLog from '../../components/pipelines/JobLog';
import ErrorMessage from '../../components/common/ErrorMessage';
import TimeAgo from '../../components/common/TimeAgo';
import { useApi } from '../../api';
import { formatDuration } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { GitLabJob } from '../../types/gitlab';

export default function PipelineDetail() {
  const { id, pid } = useParams<{ id: string; pid: string }>();
  useOutletContext();
  const api = useApi();
  const qc = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<GitLabJob | null>(null);

  const { data: pipeline, isLoading, error } = useQuery({
    queryKey: ['project', id, 'pipeline', pid],
    queryFn: () => api.pipelines.get(Number(id), Number(pid)),
    enabled: !!id && !!pid,
    refetchInterval: 15000,
  });

  const { data: jobs } = useQuery({
    queryKey: ['project', id, 'pipeline', pid, 'jobs'],
    queryFn: () => api.pipelines.getJobs(Number(id), Number(pid), { per_page: 100 }),
    enabled: !!id && !!pid,
    refetchInterval: 10000,
  });

  const retryMutation = useMutation({
    mutationFn: () => api.pipelines.retry(Number(id), Number(pid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'pipeline', pid] }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.pipelines.cancel(Number(id), Number(pid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'pipeline', pid] }),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (error || !pipeline) return <ErrorMessage error={error as Error} />;

  const stages = jobs
    ? Array.from(new Set(jobs.items.map((j) => j.stage))).sort((a, b) => {
        const order = ['build', 'test', 'deploy', 'review', 'staging', 'production'];
        return order.indexOf(a) - order.indexOf(b);
      })
    : [];

  const jobsByStage = stages.reduce<Record<string, GitLabJob[]>>((acc, stage) => {
    acc[stage] = jobs?.items.filter((j) => j.stage === stage) ?? [];
    return acc;
  }, {});

  const isRunning = pipeline.status === 'running' || pipeline.status === 'pending';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to={`/projects/${id}/pipelines`} className="hover:text-foreground">Pipelines</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>#{pid}</span>
      </div>

      {/* Pipeline header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <PipelineStatus status={pipeline.status} size="lg" showLabel />
            <h1 className="text-xl font-bold">Pipeline #{pipeline.id}</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{pipeline.ref}</code>
            <code className="font-mono">{pipeline.sha.slice(0, 8)}</code>
            {pipeline.user && <span>· triggered by {pipeline.user.name}</span>}
            <span>·</span>
            <TimeAgo date={pipeline.created_at} />
            {pipeline.duration && (
              <>
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(pipeline.duration)}
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <Button variant="destructive" size="sm" onClick={() => cancelMutation.mutate()}>
              <XCircle className="h-4 w-4 mr-1" />Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => retryMutation.mutate()}>
              <RotateCcw className="h-4 w-4 mr-1" />Retry
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline stages graph */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {stages.map((stage, si) => (
          <div key={stage} className="flex items-start gap-2">
            {si > 0 && <div className="mt-4 h-px w-8 bg-border shrink-0 self-start mt-6" />}
            <div className="min-w-[140px]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
                {stage}
              </p>
              <div className="space-y-1.5">
                {jobsByStage[stage].map((job) => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-2 rounded-md border text-sm transition-all',
                      selectedJob?.id === job.id
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    )}
                  >
                    <PipelineStatus status={job.status} size="sm" />
                    <span className="truncate flex-1 text-left">{job.name}</span>
                    {job.duration && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDuration(job.duration)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Job log panel */}
      {selectedJob && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <PipelineBadge status={selectedJob.status} />
              <span className="font-medium text-sm">{selectedJob.name}</span>
              {selectedJob.duration && (
                <span className="text-xs text-muted-foreground">
                  ({formatDuration(selectedJob.duration)})
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {selectedJob.status === 'manual' && (
                <Button size="sm" variant="outline" className="h-7">
                  <Play className="h-3.5 w-3.5 mr-1" />Play
                </Button>
              )}
              {(selectedJob.status === 'failed' || selectedJob.status === 'canceled') && (
                <Button size="sm" variant="outline" className="h-7">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />Retry
                </Button>
              )}
            </div>
          </div>
          <div className="h-80">
            <JobLog
              projectId={Number(id)}
              jobId={selectedJob.id}
              status={selectedJob.status}
              fetchLog={api.pipelines.getJobTrace}
            />
          </div>
        </div>
      )}
    </div>
  );
}
