import { useState } from 'react';
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, RotateCcw, XCircle, Filter, GitBranch, Clock, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import MiniPipelineGraph from '../../components/pipelines/MiniPipelineGraph';
import JobsTable from '../../components/pipelines/JobsTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useApi } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { formatDuration } from '../../utils/format';
import type { GitLabProject, GitLabPipeline } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

const SOURCE_BADGES: Record<string, string> = {
  pipeline: 'trigger',
  parent_pipeline: 'child',
  trigger: 'trigger',
  schedule: 'scheduled',
  merge_request_event: 'merge request',
  api: 'api',
};

function PipelineRow({ pipeline, projectId, onRetry, onCancel }: {
  pipeline: GitLabPipeline;
  projectId: number;
  onRetry: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const isRunning = pipeline.status === 'running' || pipeline.status === 'pending';
  const sourceBadge = pipeline.source ? SOURCE_BADGES[pipeline.source] : undefined;
  const link = `/projects/${projectId}/pipelines/${pipeline.id}`;

  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)_3rem_minmax(8rem,auto)_auto] items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors border-b last:border-0">
      {/* Status */}
      <div className="space-y-1">
        <Link to={link}><PipelineBadge status={pipeline.status} /></Link>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {pipeline.duration ? (
            <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(pipeline.duration)}</div>
          ) : null}
          {pipeline.finished_at && (
            <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><TimeAgo date={pipeline.finished_at} /></div>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div className="min-w-0">
        <Link to={link} className="font-medium text-sm hover:text-primary transition-colors truncate block">
          {pipeline.name || `Pipeline #${pipeline.id}`}
        </Link>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Link to={link} className="hover:text-primary">#{pipeline.id}</Link>
          <code className="bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
            <GitBranch className="h-3 w-3" />{pipeline.ref}
          </code>
          <code className="font-mono">{pipeline.sha.slice(0, 8)}</code>
          {sourceBadge && (
            <span className="rounded border border-blue-300 text-blue-600 dark:text-blue-400 px-1.5">{sourceBadge}</span>
          )}
        </div>
      </div>

      {/* Created by */}
      <div>{pipeline.user && <UserAvatar user={pipeline.user} size="sm" />}</div>

      {/* Stages + downstream */}
      <MiniPipelineGraph projectId={projectId} pipelineId={pipeline.id} status={pipeline.status} />

      {/* Actions */}
      <div className="flex items-center justify-end">
        {isRunning ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-600"
            onClick={() => onCancel(pipeline.id)}
            aria-label="Cancel pipeline"
          >
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onRetry(pipeline.id)} aria-label="Retry pipeline">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ProjectJobs({ projectId }: { projectId: number }) {
  const api = useApi();
  const { page, perPage, setPage } = usePagination(30);
  const [scope, setScope] = useState('all');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['project-jobs', projectId, scope, page, perPage],
    queryFn: () =>
      api.pipelines.listProjectJobs(projectId, {
        scope: scope === 'all' ? undefined : scope,
        page,
        per_page: perPage,
      }),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <Select value={scope} onValueChange={(v) => { setScope(v); setPage(1); }}>
        <SelectTrigger className="w-40">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All jobs</SelectItem>
          <SelectItem value="running">Running</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="success">Passed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="canceled">Canceled</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="skipped">Skipped</SelectItem>
        </SelectContent>
      </Select>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="p-4"><Skeleton className="h-5 w-2/3" /></div>
            ))}
          </div>
        ) : isError ? (
          <EmptyState title="Failed to load jobs" description="Could not reach the GitLab API. Check your connection and try again." />
        ) : !data?.items.length ? (
          <EmptyState icon={<Play className="h-8 w-8" />} title="No jobs" description="No jobs match this filter." />
        ) : (
          <JobsTable projectId={projectId} jobs={data.items} showPipeline />
        )}
      </Card>

      {data && (data.pagination.nextPage || page > 1) && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          hasNext={!!data.pagination.nextPage}
          hasPrev={page > 1}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}

export default function Pipelines() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const qc = useQueryClient();
  const { page, perPage, setPage } = usePagination(20);
  const [status, setStatus] = useState('all');
  const [ref] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'jobs' ? 'jobs' : 'pipelines';

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id, 'pipelines', status, ref, page, perPage],
    queryFn: () =>
      api.pipelines.list(Number(id), {
        status: status === 'all' ? undefined : status,
        ref: ref || undefined,
        page,
        per_page: perPage,
        order_by: 'id',
        sort: 'desc',
      }),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const retryMutation = useMutation({
    mutationFn: (pipelineId: number) => api.pipelines.retry(Number(id), pipelineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'pipelines'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (pipelineId: number) => api.pipelines.cancel(Number(id), pipelineId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'pipelines'] }),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.pipelines.trigger(Number(id), project.default_branch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'pipelines'] }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pipelines</h2>
        <Button size="sm" onClick={() => triggerMutation.mutate()} disabled={triggerMutation.isPending}>
          <Play className="h-4 w-4 mr-1" />
          Run pipeline
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setSearchParams(v === 'jobs' ? { tab: 'jobs' } : {}, { replace: true })}>
        <TabsList>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="pt-4">
          <ProjectJobs projectId={Number(id)} />
        </TabsContent>

        <TabsContent value="pipelines" className="pt-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <Select value={status} onValueChange={(v) => { if (v) { setStatus(v); setPage(1); } }}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <EmptyState title="Failed to load pipelines" description="Could not reach the GitLab API. Check your connection and try again." />
            ) : !data?.items.length ? (
              <EmptyState
                icon={<Play className="h-8 w-8" />}
                title="No pipelines"
                description="No pipelines have been run yet."
              />
            ) : (
              <>
                <div className="grid grid-cols-[8rem_minmax(0,1fr)_3rem_minmax(8rem,auto)_auto] gap-4 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                  <span>Status</span>
                  <span>
                    Pipeline
                    {data.pagination.total !== null && ` (${data.pagination.total.toLocaleString()})`}
                  </span>
                  <span>Created by</span>
                  <span>Stages</span>
                  <span />
                </div>
                {data.items.map((pipeline) => (
                  <PipelineRow
                    key={pipeline.id}
                    pipeline={pipeline}
                    projectId={Number(id)}
                    onRetry={(pid) => retryMutation.mutate(pid)}
                    onCancel={(pid) => cancelMutation.mutate(pid)}
                  />
                ))}
              </>
            )}
          </Card>

          {data && (data.pagination.totalPages ?? 1) > 1 && (
            <Pagination
              page={page}
              totalPages={data.pagination.totalPages}
              hasNext={!!data.pagination.nextPage}
              hasPrev={page > 1}
              onPageChange={setPage}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
