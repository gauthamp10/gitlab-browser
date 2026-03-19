import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue, SelectSeparator,
} from '../ui/select';
import { useApi } from '../../api';

interface CreateBranchDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  currentRef: string;
  onCreated: (branchName: string) => void;
}

export default function CreateBranchDialog({
  open,
  onClose,
  projectId,
  currentRef,
  onCreated,
}: CreateBranchDialogProps) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [branchName, setBranchName] = useState('');
  const [sourceRef, setSourceRef] = useState(currentRef);
  const [error, setError] = useState('');

  const { data: branches } = useQuery({
    queryKey: ['project', projectId, 'branches'],
    queryFn: () => api.projects.getBranches(projectId, { per_page: 100 }),
    enabled: open,
  });

  const { data: tags } = useQuery({
    queryKey: ['project', projectId, 'tags'],
    queryFn: () => api.projects.getTags(projectId, { per_page: 50 }),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: () => api.repository.createBranch(projectId, branchName.trim(), sourceRef),
    onSuccess: (branch) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId, 'branches'] });
      onCreated(branch.name);
      setBranchName('');
      setError('');
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to create branch');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setError('Branch name is required');
      return;
    }
    setError('');
    createMutation.mutate();
  };

  const handleClose = () => {
    setBranchName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Create new branch
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">Branch name</Label>
            <Input
              id="branch-name"
              placeholder="feature/my-new-feature"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError('');
              }}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Create from</Label>
            <Select value={sourceRef} onValueChange={(v) => { if (v) setSourceRef(v); }}>
              <SelectTrigger>
                <GitBranch className="h-4 w-4 mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {branches?.items.length ? (
                  <SelectGroup>
                    <SelectLabel>Branches</SelectLabel>
                    {branches.items.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name}
                        {b.default && ' ✓'}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                {branches?.items.length && tags?.items.length ? <SelectSeparator /> : null}
                {tags?.items.length ? (
                  <SelectGroup>
                    <SelectLabel>Tags</SelectLabel>
                    {tags.items.map((t) => (
                      <SelectItem key={`tag-${t.name}`} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !branchName.trim()}>
              {createMutation.isPending ? 'Creating…' : 'Create branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
