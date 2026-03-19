import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Edit, CheckCircle, XCircle, Calendar,
  User, Tag, Milestone, ChevronRight, AlertCircle, Send
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LabelBadge from '../../components/issues/LabelBadge';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useApi } from '../../api';
import { formatDate } from '../../utils/format';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

export default function IssueDetail() {
  const { id, iid } = useParams<{ id: string; iid: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ['project', id, 'issues', iid],
    queryFn: () => api.issues.get(Number(id), Number(iid)),
    enabled: !!id && !!iid,
  });

  const { data: notes } = useQuery({
    queryKey: ['project', id, 'issues', iid, 'notes'],
    queryFn: () => api.issues.getNotes(Number(id), Number(iid), { sort: 'asc', per_page: 100 }),
    enabled: !!id && !!iid,
  });

  const closeMutation = useMutation({
    mutationFn: () => issue?.state === 'opened'
      ? api.issues.close(Number(id), Number(iid))
      : api.issues.reopen(Number(id), Number(iid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', id, 'issues', iid] }),
  });

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.issues.addNote(Number(id), Number(iid), comment);
      setComment('');
      qc.invalidateQueries({ queryKey: ['project', id, 'issues', iid, 'notes'] });
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

  if (error || !issue) {
    return <ErrorMessage error={error as Error} />;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to={`/projects/${id}/issues`} className="hover:text-foreground transition-colors">Issues</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>#{iid}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Issue header */}
          <div>
            <div className="flex items-start gap-3">
              <Badge
                variant={issue.state === 'opened' ? 'success' : 'secondary'}
                className="mt-1 shrink-0"
              >
                {issue.state === 'opened' ? (
                  <><AlertCircle className="h-3 w-3 mr-1" />Open</>
                ) : (
                  <><CheckCircle className="h-3 w-3 mr-1" />Closed</>
                )}
              </Badge>
              <h1 className="text-2xl font-bold flex-1">{issue.title}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground ml-16">
              <span>#{issue.iid}</span>
              <span>·</span>
              <UserAvatar user={issue.author} size="xs" showTooltip={false} />
              <span>{issue.author.name}</span>
              <span>opened</span>
              <TimeAgo date={issue.created_at} />
              {issue.closed_at && (
                <> <span>· closed</span> <TimeAgo date={issue.closed_at} /></>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
              <UserAvatar user={issue.author} size="sm" showTooltip={false} />
              <span className="font-medium text-sm">{issue.author.name}</span>
              <span className="text-muted-foreground text-sm">·</span>
              <TimeAgo date={issue.created_at} className="text-muted-foreground text-sm" />
            </div>
            <div className="p-4 markdown-body">
              {issue.description ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {issue.description}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground italic">No description provided.</p>
              )}
            </div>
          </div>

          {/* Comments / notes */}
          {notes?.items
            .filter((n) => !n.system)
            .map((note) => (
              <div key={note.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b">
                  <UserAvatar user={note.author} size="sm" showTooltip={false} />
                  <span className="font-medium text-sm">{note.author.name}</span>
                  <span className="text-muted-foreground text-sm">·</span>
                  <TimeAgo date={note.created_at} className="text-muted-foreground text-sm" />
                </div>
                <div className="p-4 markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.body}</ReactMarkdown>
                </div>
              </div>
            ))}

          {/* System notes */}
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

          {/* Add comment */}
          <div className="space-y-2">
            <Textarea
              placeholder="Leave a comment…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
              >
                {issue.state === 'opened' ? (
                  <><XCircle className="h-4 w-4 mr-1 text-red-500" />Close issue</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-1 text-green-500" />Reopen issue</>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleComment}
                disabled={!comment.trim() || submitting}
              >
                <Send className="h-4 w-4 mr-1" />
                Comment
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-4">
            {/* Assignees */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <User className="h-3.5 w-3.5" />Assignees
              </p>
              {issue.assignees.length ? (
                <div className="space-y-2">
                  {issue.assignees.map((u) => (
                    <div key={u.id} className="flex items-center gap-2">
                      <UserAvatar user={u} size="xs" showTooltip={false} />
                      <span className="text-sm">{u.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>

            <Separator />

            {/* Labels */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />Labels
              </p>
              {issue.labels.length ? (
                <div className="flex flex-wrap gap-1">
                  {issue.labels.map((l) => <LabelBadge key={l} name={l} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None</p>
              )}
            </div>

            {issue.milestone && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Milestone className="h-3.5 w-3.5" />Milestone
                  </p>
                  <p className="text-sm">{issue.milestone.title}</p>
                  {issue.milestone.due_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Due {formatDate(issue.milestone.due_date)}
                    </p>
                  )}
                </div>
              </>
            )}

            {issue.due_date && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />Due date
                  </p>
                  <p className="text-sm">{formatDate(issue.due_date)}</p>
                </div>
              </>
            )}
          </div>

          {/* External link */}
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={issue.web_url} target="_blank" rel="noopener noreferrer">
              <Edit className="h-4 w-4 mr-2" />
              Edit on GitLab
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
