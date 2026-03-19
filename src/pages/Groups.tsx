import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, FolderOpen } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import EmptyState from '../components/common/EmptyState';
import { useApi } from '../api';
import { useSearch } from '../hooks/useSearch';
import { formatNumber } from '../utils/format';

export default function Groups() {
  const api = useApi();
  const { query, setQuery, debouncedQuery } = useSearch();

  const { data, isLoading } = useQuery({
    queryKey: ['groups', debouncedQuery],
    queryFn: () =>
      api.groups.list({
        search: debouncedQuery || undefined,
        order_by: 'name',
        sort: 'asc',
        per_page: 50,
      }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Groups</h1>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 max-w-sm"
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No groups found"
            description={debouncedQuery ? `No groups matching "${debouncedQuery}"` : 'You are not a member of any groups.'}
          />
        ) : (
          <div className="divide-y">
            {data.items.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold overflow-hidden">
                  {group.avatar_url ? (
                    <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    group.name[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium group-hover:text-primary transition-colors">{group.full_name}</p>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{group.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="capitalize">{group.visibility}</span>
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {group.projects_count ?? 0} projects
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
