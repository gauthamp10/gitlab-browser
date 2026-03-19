import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare, Check, ExternalLink, CheckCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import EmptyState from '../components/common/EmptyState';
import TimeAgo from '../components/common/TimeAgo';
import UserAvatar from '../components/common/UserAvatar';
import { useApi } from '../api';

export default function Todos() {
  const api = useApi();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: () => api.todos.list({ state: 'pending', per_page: 50 }),
  });

  const markDoneMutation = useMutation({
    mutationFn: (id: number) => api.todos.markDone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const markAllDoneMutation = useMutation({
    mutationFn: () => api.todos.markAllDone(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['todos'] }),
  });

  const actionLabels: Record<string, string> = {
    assigned: 'assigned you',
    mentioned: 'mentioned you in',
    build_failed: 'Pipeline failed in',
    marked: 'marked a todo in',
    approval_required: 'set you as approver for',
    unmergeable: 'Could not merge',
    directly_addressed: 'directly addressed you in',
    merge_train_removed: 'Removed from merge train in',
    review_requested: 'requested your review of',
    member_access_requested: 'requested member access to',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Todos</h1>
          {data && data.pagination.total !== null && data.pagination.total > 0 && (
            <Badge>{data.pagination.total}</Badge>
          )}
        </div>
        {(data?.items.length ?? 0) > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllDoneMutation.mutate()}
            disabled={markAllDoneMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all done
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden bg-card">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <Skeleton className="h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<CheckSquare className="h-8 w-8" />}
            title="All caught up!"
            description="You have no pending todos. Great job!"
          />
        ) : (
          <div className="divide-y">
            {data.items.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <UserAvatar user={todo.author} size="sm" showTooltip={false} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{todo.author.name}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {actionLabels[todo.action_name] ?? todo.action_name}
                    </span>
                  </p>
                  <a
                    href={todo.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {todo.target.title}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {todo.project && (
                      <span>{todo.project.name_with_namespace}</span>
                    )}
                    <span>·</span>
                    <TimeAgo date={todo.created_at} />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-green-500"
                  onClick={() => markDoneMutation.mutate(todo.id)}
                  disabled={markDoneMutation.isPending}
                  title="Mark as done"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
