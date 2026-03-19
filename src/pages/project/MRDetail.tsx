import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GitPullRequest, GitMerge, GitBranch, MessageSquare,
  ChevronRight, Check, Send, XCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DiffViewer from '../../components/code/DiffViewer';
import LabelBadge from '../../components/issues/LabelBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useApi } from '../../api';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

export default function MRDetail() {
  const { id, iid } = useParams<{ id: string; iid: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: mr, isLoading, error } = useQuery({
    queryKey: ['project', id, 'mr', iid],
    queryFn: () => api.mergeRequests.get(Number(id), Number(iid)),
    enabled: !!id && !!iid,
  });

  const { data: diffs } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'diffs'],
    queryFn: () => api.mergeRequests.getDiffs(Number(id), Number(iid), { per_page: 50 }),
    enabled: !!id && !!iid,
  });

  const { data: notes } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'notes'],
    queryFn: () => api.mergeRequests.getNotes(Number(id), Number(iid), { sort: 'asc', per_page: 100 }),
    enabled: !!id && !!iid,
  });

  const { data: commits } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'commits'],
    queryFn: () => api.mergeRequests.getCommits(Number(id), Number(iid)),
    enabled: !!id && !!iid,
  });

  const mergeMutation = useMutation({
    mutationFn: () => api.mergeRequests.merge(Number(id), Number(iid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'mr', iid] }),
  });

  const approveMutation = useMutation({
    mutationFn: () => api.mergeRequests.approve(Number(id), Number(iid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'mr', iid] }),
  });

  const closeMutation = useMutation({
    mutationFn: () => mr?.state === 'opened'
      ? api.mergeRequests.close(Number(id), Number(iid))
      : api.mergeRequests.reopen(Number(id), Number(iid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'mr', iid] }),
  });

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.mergeRequests.addNote(Number(id), Number(iid), comment);
      setComment('');
      qc.invalidateQueries({ queryKey: ['project', id, 'mr', iid, 'notes'] });
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !mr) return <ErrorMessage error={error as Error} />;

  const stateColor = mr.state === 'opened' ? 'info' : mr.state === 'merged' ? 'success' : 'secondary';
  const StateIcon = mr.state === 'merged' ? GitMerge : GitPullRequest;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to={`/projects/${id}/merge_requests`} className="hover:text-foreground">Merge Requests</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>!{iid}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-start gap-3">
          <Badge variant={stateColor} className="mt-1 shrink-0 gap-1">
            <StateIcon className="h-3 w-3" />
            <span className="capitalize">{mr.state}</span>
          </Badge>
          <h1 className="text-2xl font-bold">{mr.title}</h1>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground ml-16">
          <UserAvatar user={mr.author} size="xs" showTooltip={false} />
          <span>{mr.author.name}</span>
          <span>wants to merge</span>
          <code className="bg-muted px-1 rounded">{mr.source_branch}</code>
          <span>into</span>
          <code className="bg-muted px-1 rounded">{mr.target_branch}</code>
          <span>·</span>
          <TimeAgo date={mr.created_at} />
        </div>
        {mr.head_pipeline && (
          <div className="mt-2 ml-16">
            <PipelineBadge status={mr.head_pipeline.status} />
          </div>
        )}
      </div>

      {/* Actions */}
      {mr.state === 'opened' && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={() => mergeMutation.mutate()}
            disabled={mergeMutation.isPending}
          >
            <GitMerge className="h-4 w-4 mr-1" />
            Merge
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1 text-green-500" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => closeMutation.mutate()}
            disabled={closeMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1 text-red-500" />
            Close MR
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="diffs">
            Changes
            {diffs && <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{diffs.items.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="commits">
            Commits
            {commits && <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{commits.length}</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Description */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
              <UserAvatar user={mr.author} size="sm" showTooltip={false} />
              <span className="font-medium text-sm">{mr.author.name}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <TimeAgo date={mr.created_at} className="text-muted-foreground text-sm" />
            </div>
            <div className="p-4 markdown-body">
              {mr.description ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{mr.description}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Notes */}
          {notes?.items
            .filter((n) => !n.system)
            .map((note) => (
              <div key={note.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
                  <UserAvatar user={note.author} size="sm" showTooltip={false} />
                  <span className="font-medium text-sm">{note.author.name}</span>
                  <TimeAgo date={note.created_at} className="text-muted-foreground text-sm ml-1" />
                </div>
                <div className="p-4 markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
                </div>
              </div>
            ))}

          {notes?.items
            .filter((n) => n.system)
            .map((note) => (
              <div key={note.id} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <div className="h-px flex-1 bg-border" />
                <span>{note.body}</span>
                <TimeAgo date={note.created_at} />
                <div className="h-px flex-1 bg-border" />
              </div>
            ))}

          {/* Comment box */}
          <div className="space-y-2">
            <Textarea
              placeholder="Leave a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleComment} disabled={!comment.trim() || submitting}>
                <Send className="h-4 w-4 mr-1" />Comment
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="diffs" className="mt-4">
          {diffs ? (
            <DiffViewer diffs={diffs.items} />
          ) : (
            <div className="py-8 text-center text-muted-foreground">Loading diffs…</div>
          )}
        </TabsContent>

        <TabsContent value="commits" className="mt-4">
          <div className="border rounded-lg divide-y">
            {commits?.map((commit) => (
              <div key={commit.id} className="flex items-start gap-3 p-3">
                <code className="font-mono text-xs bg-muted px-1.5 py-1 rounded shrink-0">
                  {commit.short_id}
                </code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{commit.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {commit.author_name} · <TimeAgo date={commit.committed_date} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sidebar info */}
      <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase mb-1">Reviewers</p>
          {mr.reviewers.length ? (
            <div className="flex gap-1">
              {mr.reviewers.map((u) => <UserAvatar key={u.id} user={u} size="sm" />)}
            </div>
          ) : <p className="text-muted-foreground">None</p>}
        </div>
        <div>
          <p className="text-muted-foreground text-xs font-semibold uppercase mb-1">Labels</p>
          {mr.labels.length ? (
            <div className="flex flex-wrap gap-1">
              {mr.labels.map((l) => <LabelBadge key={l} name={l} />)}
            </div>
          ) : <p className="text-muted-foreground">None</p>}
        </div>
      </div>
    </div>
  );
}
