import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitPullRequest, Plus, Search, Filter, MessageSquare, CheckCircle, GitMerge } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import LabelBadge from '../../components/issues/LabelBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useApi } from '../../api';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import type { GitLabProject, GitLabMergeRequest } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

function MRRow({ mr, projectId }: { mr: GitLabMergeRequest; projectId: number }) {
  const stateVariant = mr.state === 'opened' ? 'info' : mr.state === 'merged' ? 'success' : 'secondary';
  const stateIcon = mr.state === 'merged' ? <GitMerge className="h-3 w-3" /> : <GitPullRequest className="h-3 w-3" />;

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors border-b last:border-0">
      <Badge variant={stateVariant} className="mt-0.5 shrink-0 gap-1">
        {stateIcon}
        <span className="capitalize">{mr.state}</span>
      </Badge>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            to={`/projects/${projectId}/merge_requests/${mr.iid}`}
            className="font-medium hover:text-primary transition-colors line-clamp-1"
          >
            {mr.draft && <span className="text-muted-foreground">[Draft] </span>}
            {mr.title}
          </Link>
          {mr.head_pipeline && (
            <PipelineBadge status={mr.head_pipeline.status} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {mr.labels.slice(0, 4).map((l) => <LabelBadge key={l} name={l} />)}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          <span>!{mr.iid}</span>
          <code className="bg-muted px-1 py-0.5 rounded">{mr.source_branch}</code>
          <span>→</span>
          <code className="bg-muted px-1 py-0.5 rounded">{mr.target_branch}</code>
          <span>·</span>
          <span>by {mr.author.name}</span>
          <span>·</span>
          <TimeAgo date={mr.created_at} />
          {mr.user_notes_count > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />{mr.user_notes_count}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {mr.reviewers.slice(0, 2).map((u) => (
          <UserAvatar key={u.id} user={u} size="xs" />
        ))}
      </div>
    </div>
  );
}

export default function MergeRequests() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const { query, setQuery, debouncedQuery } = useSearch();
  const { page, perPage, setPage } = usePagination(20);
  const [state, setState] = useState<'opened' | 'closed' | 'merged' | 'all'>('opened');
  const [orderBy, setOrderBy] = useState('created_at');

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id, 'merge_requests', state, debouncedQuery, page, perPage, orderBy],
    queryFn: () =>
      api.mergeRequests.list(Number(id), {
        state,
        search: debouncedQuery || undefined,
        order_by: orderBy as never,
        sort: 'desc',
        page,
        per_page: perPage,
      }),
    enabled: !!id,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Merge Requests</h2>
        <Button size="sm" asChild>
          <a href={`${project.web_url}/-/merge_requests/new`} target="_blank" rel="noopener noreferrer">
            <Plus className="h-4 w-4 mr-1" />
            New MR
          </a>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search merge requests…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>

        <div className="flex border rounded-md overflow-hidden">
          {(['opened', 'merged', 'closed', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setState(s); setPage(1); }}
              className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                state === s ? 'bg-secondary text-secondary-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <Select value={orderBy} onValueChange={(v) => { setOrderBy(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Created date</SelectItem>
            <SelectItem value="updated_at">Updated date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState title="Failed to load merge requests" description={(error as Error).message} />
        ) : !data?.items.length ? (
          <EmptyState
            icon={<GitPullRequest className="h-8 w-8" />}
            title={`No ${state === 'all' ? '' : state} merge requests`}
            description="No merge requests match your filter."
          />
        ) : (
          <>
            <div className="px-4 py-2 border-b bg-muted/30 text-sm text-muted-foreground">
              {data.pagination.total !== null
                ? `${data.pagination.total.toLocaleString()} merge requests`
                : `${data.items.length} merge requests`}
            </div>
            {data.items.map((mr) => (
              <MRRow key={mr.id} mr={mr} projectId={Number(id)} />
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
