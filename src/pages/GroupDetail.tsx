import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitFork, Star, Users, FolderOpen, Globe, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import EmptyState from '../components/common/EmptyState';
import TimeAgo from '../components/common/TimeAgo';
import ErrorMessage from '../components/common/ErrorMessage';
import { useApi } from '../api';
import { formatNumber } from '../utils/format';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();

  const { data: group, isLoading, error } = useQuery({
    queryKey: ['group', id],
    queryFn: () => api.groups.get(Number(id)),
    enabled: !!id,
  });

  const { data: projects } = useQuery({
    queryKey: ['group', id, 'projects'],
    queryFn: () => api.groups.getProjects(Number(id), { per_page: 20, order_by: 'last_activity_at', sort: 'desc' }),
    enabled: !!id,
  });

  const { data: subgroups } = useQuery({
    queryKey: ['group', id, 'subgroups'],
    queryFn: () => api.groups.getSubgroups(Number(id), { per_page: 20 }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !group) return <ErrorMessage error={error as Error} />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Group header */}
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden shrink-0">
          {group.avatar_url ? (
            <img src={group.avatar_url} alt="" className="h-full w-full object-cover rounded-xl" />
          ) : (
            group.name[0].toUpperCase()
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{group.full_name}</h1>
            <Badge variant="outline" className="capitalize">
              {group.visibility === 'public' ? <Globe className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
              {group.visibility}
            </Badge>
          </div>
          {group.description && (
            <p className="text-muted-foreground mt-1">{group.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-1">@{group.full_path}</p>
        </div>
      </div>

      {/* Subgroups */}
      {(subgroups?.items.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Subgroups ({subgroups!.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {subgroups!.items.map((sg) => (
                <Link
                  key={sg.id}
                  to={`/groups/${sg.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
                    {sg.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{sg.name}</p>
                    <p className="text-xs text-muted-foreground">{sg.full_path}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!projects?.items.length ? (
            <EmptyState title="No projects" description="This group has no projects." />
          ) : (
            <div className="divide-y">
              {projects.items.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors group"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    {project.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium group-hover:text-primary transition-colors">{project.name}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" />{formatNumber(project.star_count)}</span>
                      <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{formatNumber(project.forks_count)}</span>
                      <TimeAgo date={project.last_activity_at} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
