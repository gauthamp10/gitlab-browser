import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Mail, Globe, Calendar, GitFork, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import ContributionHeatmap from '../components/common/ContributionHeatmap';
import UserAvatar from '../components/common/UserAvatar';
import TimeAgo from '../components/common/TimeAgo';
import ErrorMessage from '../components/common/ErrorMessage';
import { useApi } from '../api';
import { useAuthStore } from '../store/auth';
import { formatDate, formatNumber } from '../utils/format';

export default function Profile() {
  const { username } = useParams<{ username?: string }>();
  const api = useApi();
  const { user: currentUser } = useAuthStore();

  const { data: profileUser, isLoading, error } = useQuery({
    queryKey: ['user', username ?? 'me'],
    queryFn: async () => {
      if (!username) return currentUser;
      const result = await api.users.getByUsername(username);
      return result.items[0] ?? null;
    },
  });

  const userId = profileUser?.id;

  const { data: events } = useQuery({
    queryKey: ['user', userId, 'events'],
    queryFn: () =>
      api.users.getEvents(userId!, {
        per_page: 100,
        after: `${new Date().getFullYear()}-01-01`,
      }),
    enabled: !!userId,
  });

  const { data: projects } = useQuery({
    queryKey: ['user', userId, 'projects'],
    queryFn: () => api.users.getProjects(userId!, { per_page: 10 }),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-start gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) return <ErrorMessage error={error as Error} />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Profile sidebar */}
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center">
            <UserAvatar user={profileUser} size="lg" showTooltip={false} className="h-24 w-24 mb-3" />
            <h1 className="text-xl font-bold">{profileUser.name}</h1>
            <p className="text-muted-foreground text-sm">@{profileUser.username}</p>
            {profileUser.bio && (
              <p className="text-sm mt-2 text-center">{profileUser.bio}</p>
            )}
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            {profileUser.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{profileUser.location}</span>
              </div>
            )}
            {profileUser.public_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" />
                <a href={`mailto:${profileUser.public_email}`} className="hover:text-foreground">{profileUser.public_email}</a>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Joined {formatDate(profileUser.created_at)}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              {profileUser.followers !== undefined && (
                <div>
                  <span className="font-semibold text-foreground">{formatNumber(profileUser.followers)}</span>
                  <span className="ml-1">followers</span>
                </div>
              )}
              {profileUser.following !== undefined && (
                <div>
                  <span className="font-semibold text-foreground">{formatNumber(profileUser.following)}</span>
                  <span className="ml-1">following</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Contribution heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contributions</CardTitle>
            </CardHeader>
            <CardContent>
              {events ? (
                <ContributionHeatmap events={events.items} />
              ) : (
                <Skeleton className="h-24 w-full" />
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {events?.items.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border-b last:border-0">
                  <UserAvatar user={event.author} size="xs" showTooltip={false} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="text-muted-foreground">{event.action_name}</span>
                      {event.target_title && (
                        <span className="font-medium"> {event.target_title}</span>
                      )}
                      {event.push_data?.ref && (
                        <code className="ml-1 text-xs bg-muted px-1 rounded">{event.push_data.ref}</code>
                      )}
                    </p>
                    <TimeAgo date={event.created_at} className="text-xs text-muted-foreground" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Projects */}
          {(projects?.items.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Projects</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {projects!.items.map((project) => (
                    <a
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {project.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Star className="h-3 w-3" />{formatNumber(project.star_count)}</span>
                          <span className="flex items-center gap-1"><GitFork className="h-3 w-3" />{formatNumber(project.forks_count)}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
