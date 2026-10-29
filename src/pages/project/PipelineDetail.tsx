import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, XCircle, ChevronRight, Play, Clock, X, GitBranch, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Card } from '../../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import PipelineStatus, { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import PipelineGraph, { type SelectJobHandler } from '../../components/pipelines/PipelineGraph';
import JobsTable from '../../components/pipelines/JobsTable';
import JobLog from '../../components/pipelines/JobLog';
import ErrorMessage from '../../components/common/ErrorMessage';
import TimeAgo from '../../components/common/TimeAgo';
import { useApi } from '../../api';
import { usePipelineStages } from '../../hooks/usePipelineStages';
import { formatDuration } from '../../utils/format';
import { projectPathFromWebUrl } from '../../utils/pipelineStages';

const SOURCE_LABELS: Record<string, string> = {
  pipeline: 'Triggered by upstream project',
  parent_pipeline: 'Child pipeline',
  trigger: 'Trigger token',
  schedule: 'Scheduled',
  merge_request_event: 'Merge request',
  web: 'Run from UI',
  api: 'API',
};

export default function PipelineDetail() {
  const { id, pid } = useParams<{ id: string; pid: string }>();
  useOutletContext();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = Number(id);
  const pipelineId = Number(pid);
  const selectedJobId = Number(searchParams.get('job')) || null;
  const tab = searchParams.get('tab') ?? 'pipeline';

  const { data: pipeline, isLoading, error } = useQuery({
    queryKey: ['project', id, 'pipeline', pid],
    queryFn: () => api.pipelines.get(projectId, pipelineId),
    enabled: !!id && !!pid,
    refetchInterval: 15000,
  });

  const { data: structure } = usePipelineStages(projectId, pipelineId, {
    enabled: !!id && !!pid,
    status: pipeline?.status,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['project', id, 'pipeline', pid] });
    qc.invalidateQueries({ queryKey: ['pipeline-stages', projectId, pipelineId] });
  };
  const retryMutation = useMutation({ mutationFn: () => api.pipelines.retry(projectId, pipelineId), onSuccess: invalidate });
  const cancelMutation = useMutation({ mutationFn: () => api.pipelines.cancel(projectId, pipelineId), onSuccess: invalidate });
  const playJob = useMutation({ mutationFn: (jobId: number) => api.pipelines.playJob(projectId, jobId), onSuccess: invalidate });
  const retryJob = useMutation({ mutationFn: (jobId: number) => api.pipelines.retryJob(projectId, jobId), onSuccess: invalidate });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key); else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  // Jobs in an expanded downstream pipeline live in another pipeline (and
  // possibly another project), so open that pipeline's page instead.
  const handleSelectJob: SelectJobHandler = (jobProjectId, jobPipelineId, job) => {
    if (jobProjectId === projectId && jobPipelineId === pipelineId) {
      setParam('job', selectedJobId === job.id ? null : String(job.id));
    } else {
      navigate(`/projects/${jobProjectId}/pipelines/${jobPipelineId}?job=${job.id}`);
    }
  };

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

  const isRunning = pipeline.status === 'running' || pipeline.status === 'pending';
  const jobs = structure?.jobs ?? [];
  const downstream = (structure?.bridges ?? []).flatMap((b) =>
    b.downstream_pipeline ? [{ bridge: b, dp: b.downstream_pipeline }] : []
  );
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const failedCount = jobs.filter((j) => j.status === 'failed' && !j.allow_failure).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to={`/projects/${id}/pipelines`} className="hover:text-foreground">Pipelines</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>#{pid}</span>
      </div>

      {/* Pipeline header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-3">
            <PipelineStatus status={pipeline.status} size="lg" showLabel />
            <h1 className="text-xl font-bold truncate">{pipeline.name || `Pipeline #${pipeline.id}`}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>#{pipeline.id}</span>
            <code className="font-mono bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
              <GitBranch className="h-3 w-3" />{pipeline.ref}
            </code>
            <code className="font-mono">{pipeline.sha.slice(0, 8)}</code>
            {pipeline.source && SOURCE_LABELS[pipeline.source] && (
              <span className="text-xs rounded border px-1.5 py-0.5">{SOURCE_LABELS[pipeline.source]}</span>
            )}
            {pipeline.user && <span>triggered by {pipeline.user.name}</span>}
            <TimeAgo date={pipeline.created_at} />
            {pipeline.duration ? (
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(pipeline.duration)}</span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
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

      <Tabs value={tab} onValueChange={(v) => setParam('tab', v === 'pipeline' ? null : v)}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="jobs">
            Jobs <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{jobs.length}</span>
          </TabsTrigger>
          {failedCount > 0 && (
            <TabsTrigger value="failed">
              Failed jobs <span className="ml-1.5 rounded-full bg-red-100 dark:bg-red-950 text-red-600 px-1.5 text-xs">{failedCount}</span>
            </TabsTrigger>
          )}
          {downstream.length > 0 && (
            <TabsTrigger value="downstream">
              Downstream <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{downstream.length}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pipeline" className="pt-4">
          <PipelineGraph
            projectId={projectId}
            pipelineId={pipelineId}
            selectedJobId={selectedJobId}
            onSelectJob={handleSelectJob}
          />
        </TabsContent>

        <TabsContent value="jobs" className="pt-4">
          <Card className="overflow-hidden">
            <JobsTable
              projectId={projectId}
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelect={(job) => handleSelectJob(projectId, pipelineId, job)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="failed" className="pt-4">
          <Card className="overflow-hidden">
            <JobsTable
              projectId={projectId}
              jobs={jobs.filter((j) => j.status === 'failed' && !j.allow_failure)}
              selectedJobId={selectedJobId}
              onSelect={(job) => handleSelectJob(projectId, pipelineId, job)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="downstream" className="pt-4">
          <Card className="overflow-hidden divide-y">
            {downstream.map(({ bridge, dp }) => {
              const isChild = dp.project_id === projectId;
              return (
                <Link
                  key={bridge.id}
                  to={`/projects/${dp.project_id}/pipelines/${dp.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-muted/30"
                >
                  <PipelineBadge status={dp.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {isChild ? 'Child pipeline' : projectPathFromWebUrl(dp.web_url) ?? `Project ${dp.project_id}`}
                      <span className="text-muted-foreground font-normal"> · #{dp.id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      triggered by job <span className="font-medium">{bridge.name}</span>
                      <span>·</span>
                      <GitBranch className="h-3 w-3" />{dp.ref}
                      <span>·</span>
                      <TimeAgo date={dp.created_at} />
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              );
            })}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job log panel */}
      {selectedJob && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <PipelineBadge status={selectedJob.status} />
              <span className="font-medium text-sm">{selectedJob.name}</span>
              <span className="text-xs text-muted-foreground">#{selectedJob.id} · {selectedJob.stage}</span>
              {selectedJob.duration ? (
                <span className="text-xs text-muted-foreground">({formatDuration(selectedJob.duration)})</span>
              ) : null}
            </div>
            <div className="flex gap-2">
              {selectedJob.status === 'manual' && (
                <Button size="sm" variant="outline" className="h-7" onClick={() => playJob.mutate(selectedJob.id)}>
                  <Play className="h-3.5 w-3.5 mr-1" />Run
                </Button>
              )}
              {(selectedJob.status === 'failed' || selectedJob.status === 'canceled') && (
                <Button size="sm" variant="outline" className="h-7" onClick={() => retryJob.mutate(selectedJob.id)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />Retry
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setParam('job', null)} aria-label="Close log">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="h-96">
            <JobLog
              projectId={projectId}
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
