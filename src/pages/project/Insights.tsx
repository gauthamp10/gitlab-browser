import { useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import UserAvatar from '../../components/common/UserAvatar';
import LanguageBar from '../../components/common/LanguageBar';
import { useApi } from '../../api';
import { getLanguageColor } from '../../utils/format';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

export default function Insights() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();

  const { data: contributors, isLoading: loadingContributors } = useQuery({
    queryKey: ['project', id, 'contributors'],
    queryFn: () => api.projects.getContributors(Number(id), { order_by: 'commits', sort: 'desc' }),
  });

  const { data: languages, isLoading: loadingLanguages } = useQuery({
    queryKey: ['project', id, 'languages'],
    queryFn: () => api.projects.getLanguages(Number(id)),
  });

  const { data: commits, isLoading: loadingCommits } = useQuery({
    queryKey: ['project', id, 'commits', 'insights'],
    queryFn: () =>
      api.projects.getCommits(Number(id), {
        ref_name: project.default_branch,
        per_page: 100,
      }),
  });

  // Group commits by month for the chart
  const commitsByMonth = commits?.items.reduce<Record<string, number>>((acc, commit) => {
    const month = commit.committed_date.slice(0, 7);
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const commitChartData = Object.entries(commitsByMonth ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month: month.slice(5), count }));

  const languagePieData = Object.entries(languages ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Repository Insights</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commit frequency */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commit Activity (last 12 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingCommits ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={commitChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Commits" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Language breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Language Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLanguages ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-4">
                {languages && <LanguageBar languages={languages} />}
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={languagePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {languagePieData.map((entry) => (
                        <Cell key={entry.name} fill={getLanguageColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }}
                      formatter={(value: number, name: string) => {
                        const total = languagePieData.reduce((s, d) => s + d.value, 0);
                        return [`${((value / total) * 100).toFixed(1)}%`, name];
                      }}
                    />
                    <Legend iconSize={10} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top contributors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Contributors</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingContributors ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {contributors?.items.slice(0, 10).map((contributor, i) => {
                const maxCommits = contributors.items[0]?.commits ?? 1;
                const pct = (contributor.commits / maxCommits) * 100;
                return (
                  <div key={contributor.email} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {contributor.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{contributor.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {contributor.commits.toLocaleString()} commits
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
