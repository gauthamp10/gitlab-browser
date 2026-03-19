import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Star, GitFork, Clock, Activity, Globe, Lock, Unlock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import ContributionHeatmap from '../components/common/ContributionHeatmap';
import TimeAgo from '../components/common/TimeAgo';
import UserAvatar from '../components/common/UserAvatar';
import { PipelineBadge } from '../components/pipelines/PipelineStatus';
import { useApi } from '../api';
import { useAuthStore } from '../store/auth';
import { formatNumber } from '../utils/format';
import type { GitLabProject } from '../types/gitlab';

function ProjectCard({ project }: { project: GitLabProject }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
        {project.name[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
            {project.name_with_namespace}
          </span>
          {project.visibility === 'private' ? (
            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : project.visibility === 'internal' ? (
            <Unlock className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : (
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{project.description}</p>
        )}
        <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {formatNumber(project.star_count)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {formatNumber(project.forks_count)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <TimeAgo date={project.last_activity_at} />
          </span>
        </div>
      </div>
    </Link>
  );
}

import type { GitLabEvent } from '../types/gitlab';

function getEventLink(event: GitLabEvent): string | null {
  if (!event.project_id) return null;
  const base = `/projects/${event.project_id}`;
  if (event.target_type === 'Issue' && event.target_iid) {
    return `${base}/issues/${event.target_iid}`;
  }
  if (event.target_type === 'MergeRequest' && event.target_iid) {
    return `${base}/merge_requests/${event.target_iid}`;
  }
  if (event.push_data) {
    return `${base}/repository`;
  }
  return base;
}

function ActivityFeed() {
  const api = useApi();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['user-events'],
    queryFn: () => api.users.getCurrentUserEvents({ per_page: 20 }),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return <p className="text-sm text-muted-foreground p-4">No recent activity.</p>;
  }

  return (
    <div className="divide-y divide-border">
      {data.items.map((event) => {
        const link = getEventLink(event);
        const content = (
          <>
            <UserAvatar user={event.author} size="sm" showTooltip={false} />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{event.author.name}</span>
                {' '}
                <span className="text-muted-foreground">{event.action_name}</span>
                {event.target_title && (
                  <>
                    {' '}
                    <span className="font-medium truncate">{event.target_title}</span>
                  </>
                )}
                {event.push_data && (
                  <span className="text-muted-foreground">
                    {' '}to <code className="text-xs bg-muted px-1 py-0.5 rounded">{event.push_data.ref}</code>
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <TimeAgo date={event.created_at} />
              </p>
            </div>
          </>
        );

        if (link) {
          return (
            <button
              key={event.id}
              onClick={() => navigate(link)}
              className="w-full flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
            >
              {content}
            </button>
          );
        }

        return (
          <div key={event.id} className="flex items-start gap-3 p-3">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const api = useApi();
  const { user } = useAuthStore();

  const { data: recentProjects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects', 'recent'],
    queryFn: () =>
      api.projects.list({ order_by: 'last_activity_at', sort: 'desc', per_page: 8 }),
  });

  const { data: starredProjects, isLoading: loadingStarred } = useQuery({
    queryKey: ['projects', 'starred'],
    queryFn: () => api.projects.list({ starred: true, per_page: 6 }),
    enabled: !!user,   // requires authentication; skip in guest mode
  });

  const { data: events } = useQuery({
    queryKey: ['events', 'heatmap', user?.id],
    queryFn: () =>
      api.users.getCurrentUserEvents({ per_page: 100, after: `${new Date().getFullYear()}-01-01` }),
    enabled: !!user,
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="flex items-center gap-3">
        {user && <UserAvatar user={user} size="md" showTooltip={false} />}
        <div>
          <h1 className="text-2xl font-bold">{user ? `Welcome back, ${user.name.split(' ')[0]}!` : 'Browse GitLab'}</h1>
          <p className="text-sm text-muted-foreground">
            {user ? "Here's what's happening in your GitLab." : 'Public repositories and projects are available without signing in.'}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Starred Projects',
            value: starredProjects?.pagination.total ?? '—',
            icon: Star,
            to: '/projects?starred=true',
            color: 'text-yellow-500',
          },
          {
            label: 'Recent Activity',
            value: events?.items.length ?? '—',
            icon: Activity,
            to: '/dashboard',
            color: 'text-green-500',
          },
          {
            label: 'My Projects',
            value: recentProjects?.pagination.total ?? '—',
            icon: GitFork,
            to: '/projects',
            color: 'text-purple-500',
          },
        ].map(({ label, value, icon: Icon, to, color }) => (
          <Link key={label} to={to}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-1">{String(value)}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent projects + starred */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contribution heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              {events ? (
                <ContributionHeatmap events={events.items} />
              ) : user ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sign in with a Personal Access Token to see your contribution heatmap.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent projects */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent Projects</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loadingProjects ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                recentProjects?.items.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Activity + Starred */}
        <div className="space-y-6">
          {/* Activity feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ActivityFeed />
            </CardContent>
          </Card>

          {/* Starred projects */}
          {!loadingStarred && (starredProjects?.items.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Starred</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent className="p-0">
                {starredProjects?.items.slice(0, 4).map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
