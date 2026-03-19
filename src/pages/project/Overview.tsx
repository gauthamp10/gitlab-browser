import { Link, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitCommit, FileText, Copy, Check, GitBranch, Tag } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import LanguageBar from '../../components/common/LanguageBar';
import TimeAgo from '../../components/common/TimeAgo';
import UserAvatar from '../../components/common/UserAvatar';
import { useApi } from '../../api';
import { formatNumber } from '../../utils/format';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext {
  project: GitLabProject;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function Overview() {
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();

  const { data: commits } = useQuery({
    queryKey: ['project', project.id, 'commits', 'recent'],
    queryFn: () =>
      api.projects.getCommits(project.id, {
        ref_name: project.default_branch,
        per_page: 5,
      }),
  });

  const { data: languages } = useQuery({
    queryKey: ['project', project.id, 'languages'],
    queryFn: () => api.projects.getLanguages(project.id),
  });

  const { data: branches } = useQuery({
    queryKey: ['project', project.id, 'branches', 'count'],
    queryFn: () => api.projects.getBranches(project.id, { per_page: 1 }),
  });

  const { data: tags } = useQuery({
    queryKey: ['project', project.id, 'tags', 'count'],
    queryFn: () => api.projects.getTags(project.id, { per_page: 1 }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* README placeholder */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">README</CardTitle>
            </CardHeader>
            <CardContent>
              {project.readme_url ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-3">
                    README available in repository
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/projects/${project.id}/repository`}>Browse Repository</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No README found</p>
              )}
            </CardContent>
          </Card>

          {/* Recent commits */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCommit className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Recent Commits</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/projects/${project.id}/commits`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {commits ? (
                <div className="divide-y divide-border">
                  {commits.items.map((commit) => (
                    <div key={commit.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                      <UserAvatar
                        user={{ id: 0, name: commit.author_name, username: commit.author_email, avatar_url: '' }}
                        size="sm"
                        showTooltip={false}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{commit.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <code className="bg-muted px-1 py-0.5 rounded font-mono">
                            {commit.short_id}
                          </code>
                          <span>{commit.author_name}</span>
                          <span>·</span>
                          <TimeAgo date={commit.committed_date} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Clone URLs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Clone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">HTTPS</p>
                <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1.5">
                  <code className="text-xs flex-1 truncate font-mono">{project.http_url_to_repo}</code>
                  <CopyButton text={project.http_url_to_repo} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">SSH</p>
                <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1.5">
                  <code className="text-xs flex-1 truncate font-mono">{project.ssh_url_to_repo}</code>
                  <CopyButton text={project.ssh_url_to_repo} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Project stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Project info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <GitBranch className="h-4 w-4" />
                  <span>Branches</span>
                </div>
                <span className="font-medium">{branches?.pagination.total ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Tags</span>
                </div>
                <span className="font-medium">{tags?.pagination.total ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <GitCommit className="h-4 w-4" />
                  <span>Commits</span>
                </div>
                <span className="font-medium">
                  {project.statistics ? formatNumber(project.statistics.commit_count) : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Languages */}
          {languages && Object.keys(languages).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <LanguageBar languages={languages} />
              </CardContent>
            </Card>
          )}

          {/* Topics */}
          {project.topics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {project.topics.map((topic) => (
                    <span
                      key={topic}
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                    >
                      {topic}
                    </span>
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
