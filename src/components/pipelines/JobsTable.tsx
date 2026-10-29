import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, RotateCcw, XCircle, Clock, Calendar, GitBranch } from 'lucide-react';
import { Button } from '../ui/button';
import { PipelineBadge } from './PipelineStatus';
import TimeAgo from '../common/TimeAgo';
import UserAvatar from '../common/UserAvatar';
import { useApi } from '../../api';
import { formatDuration } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { GitLabJob } from '../../types/gitlab';

const ACTIVE = ['running', 'pending', 'preparing', 'waiting_for_resource', 'created'];

/** Job list laid out like GitLab's Jobs tab: status, job, stage, pipeline, timing, actions. */
export default function JobsTable({ projectId, jobs, showPipeline = false, selectedJobId, onSelect }: {
  projectId: number;
  jobs: GitLabJob[];
  showPipeline?: boolean;
  selectedJobId?: number | null;
  onSelect?: (job: GitLabJob) => void;
}) {
  const api = useApi();
  const qc = useQueryClient();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pipeline-stages', projectId] });
    qc.invalidateQueries({ queryKey: ['project-jobs', projectId] });
  };
  const play = useMutation({ mutationFn: (jobId: number) => api.pipelines.playJob(projectId, jobId), onSuccess: refresh });
  const retry = useMutation({ mutationFn: (jobId: number) => api.pipelines.retryJob(projectId, jobId), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: (jobId: number) => api.pipelines.cancelJob(projectId, jobId), onSuccess: refresh });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Job</th>
            <th className="px-4 py-2 font-medium">Stage</th>
            {showPipeline && <th className="px-4 py-2 font-medium">Pipeline</th>}
            <th className="px-4 py-2 font-medium">Duration</th>
            <th className="px-4 py-2 font-medium">Coverage</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
            const jobLink = `/projects/${projectId}/pipelines/${job.pipeline.id}?job=${job.id}`;
            return (
              <tr
                key={job.id}
                className={cn('border-b last:border-0 hover:bg-muted/30', selectedJobId === job.id && 'bg-primary/5')}
              >
                <td className="px-4 py-3 align-top"><PipelineBadge status={job.status} /></td>
                <td className="px-4 py-3 align-top min-w-48">
                  <div className="flex items-center gap-2">
                    {onSelect ? (
                      <button type="button" onClick={() => onSelect(job)} className="font-medium hover:text-primary text-left">
                        {job.name}
                      </button>
                    ) : (
                      <Link to={jobLink} className="font-medium hover:text-primary">{job.name}</Link>
                    )}
                    {job.allow_failure && (
                      <span className="text-[10px] rounded border border-orange-300 text-orange-600 px-1">allowed to fail</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>#{job.id}</span>
                    <span className="flex items-center gap-0.5"><GitBranch className="h-3 w-3" />{job.ref}</span>
                    <code className="font-mono">{job.commit?.short_id ?? job.pipeline.sha.slice(0, 8)}</code>
                    {job.user && <UserAvatar user={job.user} size="xs" />}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">{job.stage}</td>
                {showPipeline && (
                  <td className="px-4 py-3 align-top">
                    <Link to={`/projects/${projectId}/pipelines/${job.pipeline.id}`} className="hover:text-primary">
                      #{job.pipeline.id}
                    </Link>
                  </td>
                )}
                <td className="px-4 py-3 align-top text-xs text-muted-foreground whitespace-nowrap">
                  {job.duration ? (
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(job.duration)}</div>
                  ) : null}
                  {job.finished_at && (
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><TimeAgo date={job.finished_at} /></div>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                  {job.coverage != null ? `${job.coverage}%` : ''}
                </td>
                <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                  {job.status === 'manual' && (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => play.mutate(job.id)} aria-label="Run job">
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {ACTIVE.includes(job.status) && (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => cancel.mutate(job.id)} aria-label="Cancel job">
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {['failed', 'canceled', 'success'].includes(job.status) && (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => retry.mutate(job.id)} aria-label="Retry job">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
