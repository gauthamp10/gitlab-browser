import { Link } from 'react-router-dom';
import { MessageSquare, User, Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';
import LabelBadge from './LabelBadge';
import UserAvatar from '../common/UserAvatar';
import TimeAgo from '../common/TimeAgo';
import { cn } from '../../utils/cn';
import type { GitLabIssue } from '../../types/gitlab';

interface IssueCardProps {
  issue: GitLabIssue;
  projectId: number;
  className?: string;
}

export default function IssueCard({ issue, projectId, className }: IssueCardProps) {
  const isOpen = issue.state === 'opened';

  return (
    <div className={cn('flex items-start gap-3 py-3 px-4 hover:bg-muted/50 transition-colors', className)}>
      <div className={cn(
        'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0',
        isOpen ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
      )} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <Link
            to={`/projects/${projectId}/issues/${issue.iid}`}
            className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2"
          >
            {issue.title}
          </Link>
          {issue.confidential && (
            <Badge variant="outline" className="text-xs shrink-0">Confidential</Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {issue.labels.slice(0, 5).map((label) => (
            <LabelBadge key={label} name={label} />
          ))}
          {issue.labels.length > 5 && (
            <span className="text-xs text-muted-foreground">+{issue.labels.length - 5} more</span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>#{issue.iid}</span>
          <span>opened <TimeAgo date={issue.created_at} /></span>
          {issue.milestone && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {issue.milestone.title}
            </span>
          )}
          {issue.assignees.length > 0 && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {issue.assignees.map((a) => a.username).join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 mt-0.5">
        {issue.assignees.slice(0, 3).map((user) => (
          <UserAvatar key={user.id} user={user} size="xs" />
        ))}
        {issue.user_notes_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{issue.user_notes_count}</span>
          </div>
        )}
      </div>
    </div>
  );
}
