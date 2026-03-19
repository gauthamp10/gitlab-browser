import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitPullRequest, GitBranch, ArrowRight } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue,
} from '../ui/select';
import { useApi } from '../../api';
import type { GitLabProject } from '../../types/gitlab';

interface CreateMRDialogProps {
  open: boolean;
  onClose: () => void;
  project: GitLabProject;
}

function branchToTitle(branch: string): string {
  return branch
    .replace(/^(feature|fix|bugfix|hotfix|chore|docs|refactor|test|feat)\//, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const emptyForm = {
  sourceBranch: '',
  targetBranch: '',
  title: '',
  description: '',
  removeSourceBranch: false,
  squash: false,
  isDraft: false,
};

export default function CreateMRDialog({ open, onClose, project }: CreateMRDialogProps) {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({ ...emptyForm, targetBranch: project.default_branch || 'main' });
  const [apiError, setApiError] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  const { data: branches, isLoading: branchesLoading } = useQuery({
    queryKey: ['project', project.id, 'branches'],
    queryFn: () => api.projects.getBranches(project.id, { per_page: 100 }),
    enabled: open,
  });

  // Auto-suggest title from branch name when title hasn't been manually edited
  useEffect(() => {
    if (form.sourceBranch && !titleTouched) {
      setForm((f) => ({ ...f, title: branchToTitle(f.sourceBranch) }));
    }
  }, [form.sourceBranch, titleTouched]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.mergeRequests.create(project.id, {
        source_branch: form.sourceBranch,
        target_branch: form.targetBranch,
        title: form.isDraft ? `Draft: ${form.title}` : form.title,
        description: form.description || undefined,
        remove_source_branch: form.removeSourceBranch,
        squash: form.squash,
      }),
    onSuccess: (mr) => {
      qc.invalidateQueries({ queryKey: ['project', String(project.id), 'merge_requests'] });
      handleClose();
      navigate(`/projects/${project.id}/merge_requests/${mr.iid}`);
    },
    onError: (err: Error) => {
      setApiError(err.message);
    },
  });

  const handleClose = () => {
    setForm({ ...emptyForm, targetBranch: project.default_branch || 'main' });
    setApiError('');
    setTitleTouched(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (form.sourceBranch === form.targetBranch) {
      setApiError('Source and target branch cannot be the same.');
      return;
    }
    createMutation.mutate();
  };

  const canSubmit =
    !!form.sourceBranch &&
    !!form.targetBranch &&
    !!form.title.trim() &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            New Merge Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Branch selectors */}
          <div>
            <Label className="mb-2 block">Branches</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={form.sourceBranch}
                  onValueChange={(v) => setForm((f) => ({ ...f, sourceBranch: v }))}
                >
                  <SelectTrigger>
                    <GitBranch className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Source branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {branchesLoading ? (
                        <SelectItem value="_loading" disabled>Loading branches…</SelectItem>
                      ) : (
                        branches?.items
                          .filter((b) => b.name !== form.targetBranch)
                          .map((b) => (
                            <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                          ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

              <div className="flex-1">
                <Select
                  value={form.targetBranch}
                  onValueChange={(v) => setForm((f) => ({ ...f, targetBranch: v }))}
                >
                  <SelectTrigger>
                    <GitBranch className="h-3.5 w-3.5 mr-2 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Target branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {branches?.items
                        .filter((b) => b.name !== form.sourceBranch)
                        .map((b) => (
                          <SelectItem key={b.name} value={b.name}>
                            {b.name}{b.default ? ' ✓' : ''}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Merging <strong>{form.sourceBranch || '(source)'}</strong> into{' '}
              <strong>{form.targetBranch || '(target)'}</strong>
            </p>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="mr-title">Title</Label>
            <div className="flex gap-2 items-center">
              {form.isDraft && (
                <span className="shrink-0 text-sm font-medium text-muted-foreground bg-muted px-2 py-1.5 rounded-md">
                  Draft:
                </span>
              )}
              <Input
                id="mr-title"
                placeholder="What does this MR do?"
                value={form.title}
                onChange={(e) => {
                  setTitleTouched(true);
                  setForm((f) => ({ ...f, title: e.target.value }));
                }}
                required
                className="flex-1"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="mr-desc">
              Description{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional, supports Markdown)</span>
            </Label>
            <Textarea
              id="mr-desc"
              placeholder="Describe the changes in this merge request…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={5}
            />
          </div>

          {/* Options */}
          <div className="rounded-md border p-3 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Options</p>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={form.isDraft}
                onChange={(e) => setForm((f) => ({ ...f, isDraft: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>Mark as <strong>Draft</strong> (work in progress, not ready to merge)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={form.removeSourceBranch}
                onChange={(e) => setForm((f) => ({ ...f, removeSourceBranch: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>Delete source branch when merge request is accepted</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={form.squash}
                onChange={(e) => setForm((f) => ({ ...f, squash: e.target.checked }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span>Squash commits when merge request is accepted</span>
            </label>
          </div>

          {apiError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20">
              {apiError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <GitPullRequest className="h-4 w-4 mr-1.5" />
              {createMutation.isPending ? 'Creating…' : 'Create merge request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
