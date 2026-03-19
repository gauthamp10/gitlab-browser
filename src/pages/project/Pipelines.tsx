import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, RotateCcw, XCircle, Filter, GitBranch } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useApi } from '../../api';
import { usePagination } from '../../hooks/usePagination';
import { formatDuration } from '../../utils/format';
import type { GitLabProject, GitLabPipeline } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

function PipelineRow({ pipeline, projectId, onRetry, onCancel }: {
  pipeline: GitLabPipeline;
  projectId: number;
  onRetry: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const isRunning = pipeline.status === 'running' || pipeline.status === 'pending';

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors border-b last:border-0">
      <PipelineBadge status={pipeline.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            to={`/projects/${projectId}/pipelines/${pipeline.id}`}
            className="font-medium text-sm hover:text-primary transition-colors"
          >
            #{pipeline.id}
          </Link>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
            <GitBranch className="h-3 w-3" />{pipeline.ref}
          </code>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <code className="font-mono">{pipeline.sha.slice(0, 8)}</code>
          {pipeline.user && <span>by {pipeline.user.name}</span>}
          <span>·</span>
          <TimeAgo date={pipeline.created_at} />
          {pipeline.duration && (
            <>
              <span>·</span>
              <span>{formatDuration(pipeline.duration)}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {pipeline.user && <UserAvatar user={pipeline.user} size="xs" />}
        {isRunning && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-600"
            onClick={() => onCancel(pipeline.id)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />Cancel
          </Button>
        )}
        {!isRunning && pipeline.status !== 'running' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onRetry(pipeline.id)}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />Retry
          </Button>
        )}
      </div>
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
  const [ref, setRef] = useState('');

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
          <EmptyState title="Failed to load pipelines" description={(error as Error).message} />
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Play className="h-8 w-8" />}
            title="No pipelines"
            description="No pipelines have been run yet."
          />
        ) : (
          <>
            <div className="px-4 py-2 border-b bg-muted/30 text-sm text-muted-foreground">
              {data.pagination.total !== null
                ? `${data.pagination.total.toLocaleString()} pipelines`
                : `${data.items.length} pipelines`}
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
    </div>
  );
}
