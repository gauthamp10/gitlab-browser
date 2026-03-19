import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GitPullRequest, GitMerge, GitBranch, MessageSquare,
  ChevronRight, Check, Send, XCircle, RefreshCw,
  Edit2, Save, X, ExternalLink, Play, AlertTriangle,
  CheckCircle2, Clock, GitCommit,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import DiffViewer from '../../components/code/DiffViewer';
import LabelBadge from '../../components/issues/LabelBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import { PipelineBadge } from '../../components/pipelines/PipelineStatus';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useApi } from '../../api';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

function MergeSection({
  mr,
  onMerge,
  onMergeWhenPipelineSucceeds,
  merging,
}: {
  mr: { state: string; merge_status: string; detailed_merge_status?: string; draft: boolean; head_pipeline: { status: string } | null };
  onMerge: (opts: { squash: boolean; removeSourceBranch: boolean; message: string }) => void;
  onMergeWhenPipelineSucceeds: () => void;
  merging: boolean;
}) {
  const [squash, setSquash] = useState(false);
  const [removeSource, setRemoveSource] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  const isPipelineRunning = mr.head_pipeline?.status === 'running' || mr.head_pipeline?.status === 'pending';
  const isPipelineFailed = mr.head_pipeline?.status === 'failed';
  const canMerge =
    mr.merge_status === 'can_be_merged' ||
    mr.detailed_merge_status === 'mergeable' ||
    mr.detailed_merge_status === 'not_approved';

  const statusInfo = (() => {
    const s = mr.detailed_merge_status ?? mr.merge_status;
    if (s === 'mergeable' || s === 'can_be_merged') return { icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, text: 'Ready to merge', color: 'text-green-600 dark:text-green-400' };
    if (s === 'checking' || s === 'unchecked') return { icon: <Clock className="h-4 w-4 text-yellow-500" />, text: 'Checking merge status…', color: 'text-yellow-600' };
    if (s === 'conflicts' || s === 'conflict') return { icon: <AlertTriangle className="h-4 w-4 text-red-500" />, text: 'Merge conflicts — resolve before merging', color: 'text-red-600' };
    if (s === 'draft_status' || mr.draft) return { icon: <Edit2 className="h-4 w-4 text-muted-foreground" />, text: 'Draft — mark as ready before merging', color: 'text-muted-foreground' };
    return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, text: `Cannot merge: ${s}`, color: 'text-yellow-600' };
  })();

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b text-sm ${statusInfo.color}`}>
        {statusInfo.icon}
        <span>{statusInfo.text}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={squash} onChange={(e) => setSquash(e.target.checked)}
              className="h-4 w-4 rounded accent-primary" />
            Squash commits
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={removeSource} onChange={(e) => setRemoveSource(e.target.checked)}
              className="h-4 w-4 rounded accent-primary" />
            Delete source branch
          </label>
          <button
            type="button"
            onClick={() => setShowMessage((v) => !v)}
            className="text-primary hover:underline text-sm"
          >
            {showMessage ? 'Hide' : 'Edit'} merge commit message
          </button>
        </div>

        {showMessage && (
          <Textarea
            placeholder="Merge commit message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="text-sm font-mono"
          />
        )}

        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => onMerge({ squash, removeSourceBranch: removeSource, message })}
            disabled={!canMerge || merging}
          >
            <GitMerge className="h-4 w-4 mr-1.5" />
            {merging ? 'Merging…' : 'Merge'}
          </Button>
          {isPipelineRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMergeWhenPipelineSucceeds}
              disabled={merging}
            >
              <Play className="h-4 w-4 mr-1.5" />
              Merge when pipeline succeeds
            </Button>
          )}
          {isPipelineFailed && (
            <Badge variant="destructive" className="self-center">Pipeline failed</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MRDetail() {
  const { id, iid } = useParams<{ id: string; iid: string }>();
  const outletCtx = useOutletContext<{ project: GitLabProject } | undefined>();
  const project = outletCtx?.project;
  const api = useApi();
  const qc = useQueryClient();

  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');

  const invalidateMR = () => qc.invalidateQueries({ queryKey: ['project', id, 'mr', iid] });

  const { data: mr, isLoading, error, refetch } = useQuery({
    queryKey: ['project', id, 'mr', iid],
    queryFn: () => api.mergeRequests.get(Number(id), Number(iid)),
    enabled: !!id && !!iid,
  });

  const { data: diffs, isLoading: diffsLoading } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'diffs'],
    queryFn: () => api.mergeRequests.getDiffs(Number(id), Number(iid), { per_page: 50 }),
    enabled: !!id && !!iid,
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'notes'],
    queryFn: () => api.mergeRequests.getNotes(Number(id), Number(iid), { sort: 'asc', per_page: 100 }),
    enabled: !!id && !!iid,
  });

  const { data: commits } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'commits'],
    queryFn: () => api.mergeRequests.getCommits(Number(id), Number(iid)),
    enabled: !!id && !!iid,
  });

  const { data: pipelines } = useQuery({
    queryKey: ['project', id, 'mr', iid, 'pipelines'],
    queryFn: () => api.mergeRequests.getPipelines(Number(id), Number(iid)),
    enabled: !!id && !!iid,
  });

  const mergeMutation = useMutation({
    mutationFn: (opts: { squash: boolean; removeSourceBranch: boolean; message: string }) =>
      api.mergeRequests.merge(Number(id), Number(iid), {
        squash: opts.squash,
        should_remove_source_branch: opts.removeSourceBranch,
        merge_commit_message: opts.message || undefined,
      }),
    onSuccess: invalidateMR,
  });

  const mergeWhenPipelineMutation = useMutation({
    mutationFn: () =>
      api.mergeRequests.update(Number(id), Number(iid), {} as never),
    onSuccess: invalidateMR,
  });

  const approveMutation = useMutation({
    mutationFn: () => api.mergeRequests.approve(Number(id), Number(iid)),
    onSuccess: invalidateMR,
  });

  const unapproveMutation = useMutation({
    mutationFn: () => api.mergeRequests.unapprove(Number(id), Number(iid)),
    onSuccess: invalidateMR,
  });

  const closeMutation = useMutation({
    mutationFn: () => api.mergeRequests.close(Number(id), Number(iid)),
    onSuccess: invalidateMR,
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.mergeRequests.reopen(Number(id), Number(iid)),
    onSuccess: invalidateMR,
  });

  const updateTitleMutation = useMutation({
    mutationFn: (title: string) =>
      api.mergeRequests.update(Number(id), Number(iid), { title }),
    onSuccess: () => { setEditingTitle(false); invalidateMR(); },
  });

  const updateDescMutation = useMutation({
    mutationFn: (description: string) =>
      api.mergeRequests.update(Number(id), Number(iid), { description }),
    onSuccess: () => { setEditingDesc(false); invalidateMR(); },
  });

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);
    try {
      await api.mergeRequests.addNote(Number(id), Number(iid), comment);
      setComment('');
      qc.invalidateQueries({ queryKey: ['project', id, 'mr', iid, 'notes'] });
    } catch { /* silently ignore */ }
    setSubmittingComment(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !mr) {
    return (
      <div className="p-6">
        <ErrorMessage error={error as Error} onRetry={() => refetch()} />
      </div>
    );
  }

  const stateVariant = mr.state === 'opened' ? 'info' : mr.state === 'merged' ? 'success' : 'secondary';
  const StateIcon = mr.state === 'merged' ? GitMerge : GitPullRequest;

  const systemNotes = notes?.items.filter((n) => n.system) ?? [];
  const userNotes = notes?.items.filter((n) => !n.system) ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to={`/projects/${id}/merge_requests`} className="hover:text-foreground transition-colors">
          Merge Requests
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">!{iid}</span>
      </div>

      {/* Title */}
      <div className="flex items-start gap-3">
        <Badge variant={stateVariant} className="mt-1.5 shrink-0 gap-1">
          <StateIcon className="h-3 w-3" />
          <span className="capitalize">{mr.state}</span>
        </Badge>

        {editingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-lg font-bold h-auto py-1"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => updateTitleMutation.mutate(editTitle)}
              disabled={!editTitle.trim() || updateTitleMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1" />Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingTitle(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-start gap-2 group">
            <h1 className="text-2xl font-bold leading-snug">
              {mr.draft && <span className="text-muted-foreground">Draft: </span>}
              {mr.title}
            </h1>
            <button
              onClick={() => { setEditTitle(mr.title); setEditingTitle(true); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-muted-foreground hover:text-foreground"
              title="Edit title"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <UserAvatar user={mr.author} size="xs" showTooltip={false} />
        <span className="text-foreground font-medium">{mr.author.name}</span>
        <span>wants to merge</span>
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">{mr.source_branch}</code>
        <span>into</span>
        <code className="bg-muted px-1.5 py-0.5 rounded text-xs text-foreground">{mr.target_branch}</code>
        <span>·</span>
        <TimeAgo date={mr.created_at} />
        {mr.head_pipeline && (
          <>
            <span>·</span>
            <PipelineBadge status={mr.head_pipeline.status} />
          </>
        )}
        <a
          href={mr.web_url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View on GitLab
        </a>
      </div>

      {/* Main layout: content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        {/* Left: tabs */}
        <div className="min-w-0 space-y-4">
          {/* Merge / Reopen / Close actions */}
          {mr.state === 'opened' && (
            <MergeSection
              mr={mr}
              onMerge={(opts) => mergeMutation.mutate(opts)}
              onMergeWhenPipelineSucceeds={() => mergeWhenPipelineMutation.mutate()}
              merging={mergeMutation.isPending}
            />
          )}

          {mr.state === 'closed' && (
            <div className="flex items-center gap-2 border rounded-lg px-4 py-3 bg-muted/30">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground flex-1">This merge request is closed.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                {reopenMutation.isPending ? 'Reopening…' : 'Reopen MR'}
              </Button>
            </div>
          )}

          {mr.state === 'merged' && (
            <div className="flex items-center gap-2 border rounded-lg px-4 py-3 bg-green-500/5 border-green-500/20">
              <GitMerge className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-600 dark:text-green-400 flex-1">
                Merged{mr.merged_at ? <> · <TimeAgo date={mr.merged_at} /></> : null}
              </span>
            </div>
          )}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Overview
                {userNotes.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{userNotes.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="diffs">
                Changes
                {diffs && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{diffs.items.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="commits">
                <GitCommit className="h-3.5 w-3.5 mr-1.5" />
                Commits
                {commits && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{commits.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pipelines">
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Pipelines
                {pipelines && pipelines.length > 0 && (
                  <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5">{pipelines.length}</span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Description */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={mr.author} size="sm" showTooltip={false} />
                    <span className="font-medium text-sm">{mr.author.name}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <TimeAgo date={mr.created_at} className="text-muted-foreground text-xs" />
                  </div>
                  {!editingDesc && (
                    <button
                      onClick={() => { setEditDesc(mr.description ?? ''); setEditingDesc(true); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit description"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {editingDesc ? (
                  <div className="p-4 space-y-2">
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={8}
                      placeholder="Describe your changes…"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDesc(false)}
                      >
                        <X className="h-4 w-4 mr-1" />Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => updateDescMutation.mutate(editDesc)}
                        disabled={updateDescMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 markdown-body">
                    {mr.description ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{mr.description}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground italic text-sm">No description provided.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Activity: system notes as timeline, user notes as comments */}
              {notesLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : (
                <>
                  {notes?.items.map((note) =>
                    note.system ? (
                      <div key={note.id} className="flex items-center gap-2 text-xs text-muted-foreground py-0.5">
                        <div className="h-px flex-1 bg-border" />
                        <span className="shrink-0">{note.body}</span>
                        <TimeAgo date={note.created_at} />
                        <div className="h-px flex-1 bg-border" />
                      </div>
                    ) : (
                      <div key={note.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
                          <UserAvatar user={note.author} size="sm" showTooltip={false} />
                          <span className="font-medium text-sm">{note.author.name}</span>
                          <TimeAgo date={note.created_at} className="text-muted-foreground text-xs ml-1" />
                        </div>
                        <div className="p-4 markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
                        </div>
                      </div>
                    )
                  )}
                </>
              )}

              {/* Comment box */}
              <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b text-sm font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Leave a comment
                </div>
                <div className="p-4 space-y-3">
                  <Textarea
                    placeholder="Write a comment… (Markdown supported)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    {mr.state === 'opened' && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1.5 text-green-500" />
                          {approveMutation.isPending ? 'Approving…' : 'Approve'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => closeMutation.mutate()}
                          disabled={closeMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1.5 text-red-500" />
                          {closeMutation.isPending ? 'Closing…' : 'Close MR'}
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="ml-auto"
                      onClick={handleComment}
                      disabled={!comment.trim() || submittingComment}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      {submittingComment ? 'Posting…' : 'Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Changes / Diffs */}
            <TabsContent value="diffs" className="mt-4">
              {diffsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                </div>
              ) : diffs?.items.length ? (
                <DiffViewer diffs={diffs.items} />
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">No changes found.</div>
              )}
            </TabsContent>

            {/* Commits */}
            <TabsContent value="commits" className="mt-4">
              {commits?.length ? (
                <div className="border rounded-lg divide-y">
                  {commits.map((commit) => (
                    <div key={commit.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                      <code className="font-mono text-xs bg-muted px-2 py-1 rounded shrink-0 text-foreground">
                        {commit.short_id}
                      </code>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{commit.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {commit.author_name} · <TimeAgo date={commit.committed_date} />
                        </p>
                      </div>
                      {project && (
                        <Link
                          to={`/projects/${id}/repository/blob/${commit.id}`}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title="Browse repository at this commit"
                        >
                          <GitBranch className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">No commits found.</div>
              )}
            </TabsContent>

            {/* Pipelines */}
            <TabsContent value="pipelines" className="mt-4">
              {pipelines?.length ? (
                <div className="border rounded-lg divide-y">
                  {pipelines.map((pipeline) => (
                    <div key={pipeline.id} className="flex items-center gap-3 p-3">
                      <PipelineBadge status={pipeline.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">Pipeline #{pipeline.id}</p>
                        <p className="text-xs text-muted-foreground font-mono">{pipeline.sha.slice(0, 8)}</p>
                      </div>
                      <Link
                        to={`/projects/${id}/pipelines/${pipeline.id}`}
                        className="text-xs text-primary hover:underline shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">No pipelines for this MR.</div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4 text-sm">
          {/* Assignees */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assignees</p>
            {mr.assignees.length ? (
              <div className="flex flex-wrap gap-2">
                {mr.assignees.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5">
                    <UserAvatar user={u} size="sm" showTooltip={false} />
                    <span className="text-sm">{u.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">None</p>
            )}
          </div>

          <Separator />

          {/* Reviewers */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reviewers</p>
            {mr.reviewers.length ? (
              <div className="flex flex-wrap gap-2">
                {mr.reviewers.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5">
                    <UserAvatar user={u} size="sm" showTooltip={false} />
                    <span className="text-sm">{u.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">None</p>
            )}
          </div>

          <Separator />

          {/* Labels */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Labels</p>
            {mr.labels.length ? (
              <div className="flex flex-wrap gap-1">
                {mr.labels.map((l) => <LabelBadge key={l} name={l} />)}
              </div>
            ) : (
              <p className="text-muted-foreground">None</p>
            )}
          </div>

          <Separator />

          {/* Milestone */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Milestone</p>
            {mr.milestone ? (
              <span className="inline-flex items-center gap-1 text-sm">
                <span>{mr.milestone.title}</span>
              </span>
            ) : (
              <p className="text-muted-foreground">None</p>
            )}
          </div>

          <Separator />

          {/* Branches */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Branches</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">Source:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs truncate">{mr.source_branch}</code>
              </div>
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-xs">Target:</span>
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs truncate">{mr.target_branch}</code>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Created</span>
              <TimeAgo date={mr.created_at} />
            </div>
            <div className="flex items-center justify-between">
              <span>Updated</span>
              <TimeAgo date={mr.updated_at} />
            </div>
            {mr.merged_at && (
              <div className="flex items-center justify-between">
                <span>Merged</span>
                <TimeAgo date={mr.merged_at} />
              </div>
            )}
            {mr.closed_at && (
              <div className="flex items-center justify-between">
                <span>Closed</span>
                <TimeAgo date={mr.closed_at} />
              </div>
            )}
          </div>

          {/* Changes count */}
          {mr.changes_count && (
            <>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{mr.changes_count}</span> files changed
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
