import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Plus, Search, Filter } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import IssueCard from '../../components/issues/IssueCard';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { useApi } from '../../api';
import { useSearch } from '../../hooks/useSearch';
import { usePagination } from '../../hooks/usePagination';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

export default function Issues() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const { query, setQuery, debouncedQuery } = useSearch();
  const { page, perPage, setPage } = usePagination(20);
  const [state, setState] = useState<'opened' | 'closed' | 'all'>('opened');
  const [orderBy, setOrderBy] = useState('created_at');

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id, 'issues', state, debouncedQuery, page, perPage, orderBy],
    queryFn: () =>
      api.issues.list(Number(id), {
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
        <h2 className="text-xl font-semibold">Issues</h2>
        <Button size="sm" asChild>
          <a href={`${project.web_url}/-/issues/new`} target="_blank" rel="noopener noreferrer">
            <Plus className="h-4 w-4 mr-1" />
            New issue
          </a>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search issues…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>

        {/* State tabs */}
        <div className="flex border rounded-md overflow-hidden">
          {(['opened', 'closed', 'all'] as const).map((s) => (
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
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="due_date">Due date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title="Failed to load issues"
            description={(error as Error).message}
          />
        ) : !data?.items.length ? (
          <EmptyState
            icon={<AlertCircle className="h-8 w-8" />}
            title={`No ${state === 'all' ? '' : state} issues`}
            description={debouncedQuery ? `No issues matching "${debouncedQuery}"` : `There are no ${state} issues.`}
            action={
              <Button size="sm" asChild>
                <Link to={`${project.web_url}/-/issues/new`} target="_blank" rel="noopener noreferrer">
                  <Plus className="h-4 w-4 mr-1" />
                  Create first issue
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="px-4 py-2 border-b bg-muted/30 text-sm text-muted-foreground">
              {data.pagination.total !== null
                ? `${data.pagination.total.toLocaleString()} ${state === 'all' ? '' : state} issues`
                : `${data.items.length} issues`}
            </div>
            {data.items.map((issue) => (
              <IssueCard key={issue.id} issue={issue} projectId={Number(id)} />
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
