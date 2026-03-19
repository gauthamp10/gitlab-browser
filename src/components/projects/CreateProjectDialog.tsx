import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderGit2, Globe, Lock, Unlock, FileText, Loader2 } from 'lucide-react';
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
import { useAuthStore } from '../../store/auth';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 255);
}

const visibilityOptions = [
  {
    value: 'private',
    icon: <Lock className="h-4 w-4" />,
    label: 'Private',
    desc: 'Only you and members you explicitly grant access can see this project.',
  },
  {
    value: 'internal',
    icon: <Unlock className="h-4 w-4" />,
    label: 'Internal',
    desc: 'All users who are logged in can see this project.',
  },
  {
    value: 'public',
    icon: <Globe className="h-4 w-4" />,
    label: 'Public',
    desc: 'Anyone can see and clone this project without authentication.',
  },
] as const;

export default function CreateProjectDialog({ open, onClose }: CreateProjectDialogProps) {
  const api = useApi();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [pathTouched, setPathTouched] = useState(false);
  const [namespaceId, setNamespaceId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'internal' | 'public'>('private');
  const [description, setDescription] = useState('');
  const [initReadme, setInitReadme] = useState(true);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [apiError, setApiError] = useState('');

  // Fetch namespaces (personal + groups)
  const { data: namespaces, isLoading: nsLoading } = useQuery({
    queryKey: ['namespaces'],
    queryFn: () => api.projects.listNamespaces(),
    enabled: open,
  });

  // Default namespace to current user's personal namespace
  useEffect(() => {
    if (namespaces?.items.length && !namespaceId) {
      const personal = namespaces.items.find((n) => n.kind === 'user');
      if (personal) setNamespaceId(String(personal.id));
    }
  }, [namespaces, namespaceId]);

  // Auto-derive path from name
  useEffect(() => {
    if (!pathTouched) {
      setPath(toSlug(name));
    }
  }, [name, pathTouched]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.projects.create({
        name: name.trim(),
        path: path.trim() || undefined,
        namespace_id: namespaceId ? Number(namespaceId) : undefined,
        description: description.trim() || undefined,
        visibility,
        initialize_with_readme: initReadme,
        default_branch: defaultBranch,
        auto_devops_enabled: false,
      }),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      handleClose();
      navigate(`/projects/${project.id}`);
    },
    onError: (err: Error) => {
      setApiError(err.message);
    },
  });

  const handleClose = () => {
    setName('');
    setPath('');
    setPathTouched(false);
    setNamespaceId('');
    setVisibility('private');
    setDescription('');
    setInitReadme(true);
    setDefaultBranch('main');
    setApiError('');
    onClose();
  };

  const selectedNs = namespaces?.items.find((n) => String(n.id) === namespaceId);
  const fullPath = selectedNs && path ? `${selectedNs.path}/${path}` : path;

  const canSubmit = !!name.trim() && !!path.trim() && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5 text-primary" />
            New Project
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); setApiError(''); createMutation.mutate(); }}
          className="space-y-5"
        >
          {/* Name + Path */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name">Project name <span className="text-destructive">*</span></Label>
              <Input
                id="proj-name"
                placeholder="My awesome project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-path">Project slug <span className="text-destructive">*</span></Label>
              <Input
                id="proj-path"
                placeholder="my-awesome-project"
                value={path}
                onChange={(e) => { setPathTouched(true); setPath(toSlug(e.target.value)); }}
                required
              />
            </div>
          </div>

          {fullPath && (
            <p className="text-xs text-muted-foreground -mt-2">
              Project URL: <code className="bg-muted px-1 py-0.5 rounded">{fullPath}</code>
            </p>
          )}

          {/* Namespace */}
          <div className="space-y-1.5">
            <Label>Namespace (owner)</Label>
            <Select
              value={namespaceId}
              onValueChange={(v) => { if (v) setNamespaceId(v); }}
            >
              <SelectTrigger>
                <SelectValue placeholder={nsLoading ? 'Loading namespaces…' : 'Select namespace'} />
              </SelectTrigger>
              <SelectContent>
                {namespaces?.items
                  .filter((n) => n.kind === 'user')
                  .map((n) => (
                    <SelectGroup key="personal">
                      <SelectItem value={String(n.id)}>
                        👤 {n.name} (Personal)
                      </SelectItem>
                    </SelectGroup>
                  ))}
                {namespaces?.items.some((n) => n.kind === 'group') && (
                  <SelectGroup>
                    {namespaces.items
                      .filter((n) => n.kind === 'group')
                      .map((n) => (
                        <SelectItem key={n.id} value={String(n.id)}>
                          👥 {n.full_path}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc">
              Description{' '}
              <span className="text-muted-foreground font-normal text-xs">(optional)</span>
            </Label>
            <Textarea
              id="proj-desc"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <Label>Visibility level</Label>
            <div className="space-y-2">
              {visibilityOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                    visibility === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={opt.value}
                    checked={visibility === opt.value}
                    onChange={() => setVisibility(opt.value)}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="text-muted-foreground">{opt.icon}</span>
                      {opt.label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Initialization options */}
          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Initialization</p>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={initReadme}
                onChange={(e) => setInitReadme(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-primary"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Initialize repository with a README
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Creates an initial commit so you can clone the repository immediately.
                </p>
              </div>
            </label>

            {initReadme && (
              <div className="space-y-1.5 pl-6">
                <Label htmlFor="default-branch" className="text-xs">Default branch</Label>
                <Input
                  id="default-branch"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="h-8 text-sm w-40"
                />
              </div>
            )}
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
              {createMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Creating…</>
              ) : (
                <><FolderGit2 className="h-4 w-4 mr-1.5" />Create project</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
