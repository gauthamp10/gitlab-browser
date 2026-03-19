import { Link, Outlet, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GitFork, Star, Lock, Unlock, Globe, ChevronRight,
  GitBranch, AlertCircle, GitPullRequest, Play,
  BarChart2, GitCompare, Pin, Settings, GitCommit
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import ErrorMessage from '../common/ErrorMessage';
import { useApi } from '../../api';
import { useSettingsStore } from '../../store/settings';
import { formatNumber } from '../../utils/format';
import { cn } from '../../utils/cn';

const projectNavItems = [
  { path: '/repository', label: 'Repository', icon: GitBranch },
  { path: '/commits', label: 'Commits', icon: GitCommit },
  { path: '/issues', label: 'Issues', icon: AlertCircle },
  { path: '/merge_requests', label: 'Merge Requests', icon: GitPullRequest },
  { path: '/pipelines', label: 'Pipelines', icon: Play },
  { path: '/insights', label: 'Insights', icon: BarChart2 },
  { path: '/compare', label: 'Compare', icon: GitCompare },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const api = useApi();
  const { pinnedProjects, pinProject, unpinProject } = useSettingsStore();
  const projectId = Number(id);

  const { data: project, isLoading, error, refetch } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.projects.get(id!),
    enabled: !!id,
  });

  const isPinned = pinnedProjects.includes(projectId);
  const basePath = `/projects/${id}`;

  const currentPath = location.pathname.replace(basePath, '') || '';
  const activeNav = projectNavItems
    .slice()
    .reverse()
    .find((item) => currentPath.startsWith(item.path))?.path ?? '';

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-24" />)}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <ErrorMessage
          error={error as Error ?? new Error('Project not found')}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <Link to="/projects" className="hover:text-foreground transition-colors">Projects</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to={`/groups/${project.namespace.id}`} className="hover:text-foreground transition-colors">
            {project.namespace.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">{project.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {project.avatar_url ? (
              <img
                src={project.avatar_url}
                alt={project.name}
                className="h-10 w-10 rounded-lg object-cover shrink-0"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-lg">{project.name[0].toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
                <Badge variant="outline" className="text-xs capitalize">
                  {project.visibility === 'public' ? (
                    <Globe className="h-3 w-3 mr-1" />
                  ) : project.visibility === 'internal' ? (
                    <Unlock className="h-3 w-3 mr-1" />
                  ) : (
                    <Lock className="h-3 w-3 mr-1" />
                  )}
                  {project.visibility}
                </Badge>
                {project.archived && <Badge variant="secondary">Archived</Badge>}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {formatNumber(project.star_count)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Stars</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-4 w-4" />
                    {formatNumber(project.forks_count)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Forks</TooltipContent>
              </Tooltip>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => isPinned ? unpinProject(projectId) : pinProject(projectId)}
            >
              <Pin className={cn('h-4 w-4 mr-1', isPinned && 'fill-current')} />
              {isPinned ? 'Unpin' : 'Pin'}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={project.web_url} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-1" />
                GitLab
              </a>
            </Button>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="flex items-center gap-0.5 mt-4 -mb-4 overflow-x-auto">
          {projectNavItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={`${basePath}${path}`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors whitespace-nowrap',
                activeNav === path
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {label === 'Issues' && project.open_issues_count > 0 && (
                <span className="text-xs bg-muted rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                  {formatNumber(project.open_issues_count)}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        <Outlet context={{ project }} />
      </div>
    </div>
  );
}
