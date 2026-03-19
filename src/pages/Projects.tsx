import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Star, GitFork, Clock, Search, Lock, Unlock, Globe,
  AlertCircle, SlidersHorizontal, Plus
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import Pagination from '../components/common/Pagination';
import TimeAgo from '../components/common/TimeAgo';
import EmptyState from '../components/common/EmptyState';
import CreateProjectDialog from '../components/projects/CreateProjectDialog';
import { useApi } from '../api';
import { useSearch } from '../hooks/useSearch';
import { usePagination } from '../hooks/usePagination';
import { useSettingsStore } from '../store/settings';
import { formatNumber } from '../utils/format';
import type { GitLabProject } from '../types/gitlab';

function ProjectRow({ project }: { project: GitLabProject }) {
  const { pinnedProjects, pinProject, unpinProject } = useSettingsStore();
  const isPinned = pinnedProjects.includes(project.id);
  const api = useApi();

  const handleStar = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      if (project.star_count > 0) {
        await api.projects.unstar(project.id);
      } else {
        await api.projects.star(project.id);
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors border-b last:border-0">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold">
        {project.avatar_url ? (
          <img src={project.avatar_url} alt="" className="h-full w-full rounded-lg object-cover" />
        ) : (
          project.name[0].toUpperCase()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/projects/${project.id}`}
                className="font-medium hover:text-primary transition-colors"
              >
                {project.name_with_namespace}
              </Link>
              <span className="text-muted-foreground">
                {project.visibility === 'private' ? (
                  <Lock className="h-3.5 w-3.5" />
                ) : project.visibility === 'internal' ? (
                  <Unlock className="h-3.5 w-3.5" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
              </span>
              {project.archived && <Badge variant="secondary" className="text-xs">Archived</Badge>}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              {project.topics.slice(0, 3).map((topic) => (
                <Badge key={topic} variant="secondary" className="text-xs rounded-full">{topic}</Badge>
              ))}
              <span className="flex items-center gap-1"><Star className="h-3 w-3" />{formatNumber(project.star_count)}</span>
              <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{formatNumber(project.forks_count)}</span>
              <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />{project.open_issues_count}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /><TimeAgo date={project.last_activity_at} /></span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => isPinned ? unpinProject(project.id) : pinProject(project.id)}
              title={isPinned ? 'Unpin project' : 'Pin project'}
            >
              <Star className={`h-4 w-4 ${isPinned ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const api = useApi();
  const { query, setQuery, debouncedQuery } = useSearch();
  const { page, perPage, setPage } = usePagination(20);
  const [orderBy, setOrderBy] = useState<string>('last_activity_at');
  const [visibility, setVisibility] = useState<string>('all');
  const [membership, setMembership] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', 'list', debouncedQuery, page, perPage, orderBy, visibility, membership],
    queryFn: () =>
      api.projects.list({
        search: debouncedQuery || undefined,
        order_by: orderBy as never,
        sort: 'desc',
        page,
        per_page: perPage,
        membership: membership || undefined,
        visibility: visibility !== 'all' ? (visibility as never) : undefined,
        statistics: false,
      }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Project
        </Button>
      </div>

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="pl-8"
          />
        </div>

        <Select value={orderBy} onValueChange={(v) => { setOrderBy(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_activity_at">Last activity</SelectItem>
            <SelectItem value="created_at">Created date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="star_count">Stars</SelectItem>
          </SelectContent>
        </Select>

        <Select value={visibility} onValueChange={(v) => { setVisibility(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All visibility</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={membership ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => { setMembership(!membership); setPage(1); }}
        >
          Member projects
        </Button>
      </div>

      {/* Results */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-start gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <CardContent className="pt-6">
            <EmptyState
              title="Failed to load projects"
              description={(error as Error).message}
            />
          </CardContent>
        ) : !data?.items.length ? (
          <CardContent className="pt-6">
            <EmptyState
              title="No projects found"
              description={debouncedQuery ? `No projects matching "${debouncedQuery}"` : 'You have no projects yet.'}
            />
          </CardContent>
        ) : (
          <>
            <div className="px-4 py-2 border-b bg-muted/30 text-sm text-muted-foreground">
              {data.pagination.total !== null
                ? `${data.pagination.total.toLocaleString()} projects`
                : `Showing ${data.items.length} projects`}
            </div>
            {data.items.map((project) => (
              <ProjectRow key={project.id} project={project} />
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
