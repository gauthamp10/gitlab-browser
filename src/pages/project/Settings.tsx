import { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings, GitBranch, GitMerge, AlertTriangle, Check, Trash2,
  Archive, ArchiveRestore, Copy, ExternalLink, Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { useApi } from '../../api';
import { useTokenPermissions } from '../../hooks/useTokenPermissions';
import PermGate from '../../components/common/PermGate';
import type { GitLabProject } from '../../types/gitlab';

interface OutletContext { project: GitLabProject }

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function BranchRow({ branch, projectId, defaultBranch, canWrite, onSetDefault, onDelete }: {
  branch: { name: string; protected: boolean; default: boolean };
  projectId: number;
  defaultBranch: string;
  canWrite: boolean;
  onSetDefault: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const isDefault = branch.name === defaultBranch;
  return (
    <div className="flex items-center gap-3 py-2.5 px-4 border-b last:border-0 hover:bg-muted/20 transition-colors">
      <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="flex-1 font-mono text-sm">{branch.name}</span>
      <div className="flex items-center gap-2">
        {isDefault && <Badge variant="outline" className="text-xs">default</Badge>}
        {branch.protected && <Badge variant="secondary" className="text-xs gap-1"><Lock className="h-3 w-3" />protected</Badge>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <PermGate allowed={canWrite} reason='Requires "api" scope to change default branch'>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => onSetDefault(branch.name)}
            disabled={isDefault}
          >
            {isDefault ? <Check className="h-3 w-3 mr-1" /> : null}
            {isDefault ? 'Default' : 'Set default'}
          </Button>
        </PermGate>
        <PermGate allowed={canWrite && !isDefault && !branch.protected} reason={
          !canWrite ? 'Requires "api" scope to delete branches'
          : isDefault ? 'Cannot delete the default branch'
          : branch.protected ? 'Cannot delete protected branches'
          : 'Delete branch'
        }>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(branch.name)}
            disabled={isDefault || branch.protected}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </PermGate>
      </div>
    </div>
  );
}

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const { project } = useOutletContext<OutletContext>();
  const api = useApi();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canWrite } = useTokenPermissions();

  // General settings form state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [visibility, setVisibility] = useState(project.visibility);
  const [saved, setSaved] = useState(false);

  // MR settings state
  const [mergeMethod, setMergeMethod] = useState(
    (project as GitLabProject & { merge_method?: string }).merge_method ?? 'merge'
  );
  const [removeSourceBranch, setRemoveSourceBranch] = useState(
    (project as GitLabProject & { remove_source_branch_after_merge?: boolean }).remove_source_branch_after_merge ?? false
  );
  const [requirePipelineSuccess, setRequirePipelineSuccess] = useState(
    (project as GitLabProject & { only_allow_merge_if_pipeline_succeeds?: boolean }).only_allow_merge_if_pipeline_succeeds ?? false
  );

  // Danger zone confirmation state
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // Sync form when project changes
  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? '');
    setVisibility(project.visibility);
  }, [project]);

  const { data: branches, refetch: refetchBranches } = useQuery({
    queryKey: ['project', id, 'branches', 'all'],
    queryFn: () => api.projects.getBranches(Number(id), { per_page: 100 }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (params: Parameters<typeof api.projects.update>[1]) =>
      api.projects.update(Number(id), params),
    onSuccess: (updated) => {
      queryClient.setQueryData(['project', id], updated);
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => project.archived ? api.projects.unarchive(Number(id)) : api.projects.archive(Number(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.projects.deleteProject(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  const setDefaultBranchMutation = useMutation({
    mutationFn: (branch: string) => api.projects.update(Number(id), { default_branch: branch }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['project', id], updated);
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (branch: string) => api.repository.deleteBranch(Number(id), branch),
    onSuccess: () => {
      refetchBranches();
      queryClient.invalidateQueries({ queryKey: ['project', id, 'branches'] });
    },
  });

  const handleSaveGeneral = () => {
    updateMutation.mutate({ name, description, visibility });
  };

  const handleSaveMRSettings = () => {
    updateMutation.mutate({
      merge_method: mergeMethod as 'merge' | 'rebase_merge' | 'ff',
      remove_source_branch_after_merge: removeSourceBranch,
      only_allow_merge_if_pipeline_succeeds: requirePipelineSuccess,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-10">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Project Settings</h2>
      </div>

      {/* Token scope banner */}
      {!canWrite && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-sm">
          <Lock className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Read-only mode</p>
            <p className="mt-0.5 text-amber-700 dark:text-amber-400">
              Your Personal Access Token does not have the <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">api</code> scope.
              Settings are shown for reference only — changes require a token with full API write access.
            </p>
          </div>
        </div>
      )}

      {/* ── General ─────────────────────────────────────────── */}
      <Section title="General" description="Basic project information.">
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canWrite}
              placeholder="Project name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canWrite}
              placeholder="A short description of your project."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <PermGate allowed={canWrite} reason='Requires "api" scope to change visibility'>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as typeof visibility)} disabled={!canWrite}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </PermGate>
          </div>

          <div className="space-y-1.5">
            <Label>Project URL</Label>
            <div className="flex items-center gap-2">
              <Input value={project.path_with_namespace} readOnly className="font-mono text-sm bg-muted" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(project.path_with_namespace)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy path</TooltipContent>
              </Tooltip>
              <Button variant="outline" size="sm" asChild>
                <a href={project.web_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <PermGate allowed={canWrite}>
            <Button
              onClick={handleSaveGeneral}
              disabled={updateMutation.isPending || !canWrite}
            >
              {saved ? <><Check className="h-4 w-4 mr-1.5" />Saved</> : updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </PermGate>
        </div>
      </Section>

      <Separator />

      {/* ── Branches ────────────────────────────────────────── */}
      <Section
        title="Branches"
        description={`${branches?.items.length ?? 0} branches · default: ${project.default_branch}`}
      >
        <div className="border rounded-lg overflow-hidden bg-card">
          {!branches?.items.length ? (
            <p className="p-4 text-sm text-muted-foreground">No branches found.</p>
          ) : (
            branches.items.map((b) => (
              <BranchRow
                key={b.name}
                branch={b}
                projectId={Number(id)}
                defaultBranch={project.default_branch}
                canWrite={canWrite}
                onSetDefault={(name) => setDefaultBranchMutation.mutate(name)}
                onDelete={(name) => {
                  if (confirm(`Delete branch "${name}"? This cannot be undone.`)) {
                    deleteBranchMutation.mutate(name);
                  }
                }}
              />
            ))
          )}
        </div>
      </Section>

      <Separator />

      {/* ── Merge Requests ──────────────────────────────────── */}
      <Section title="Merge Request settings" description="Control how merge requests behave in this project.">
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <div className="space-y-1.5">
            <Label>Merge method</Label>
            <PermGate allowed={canWrite} reason='Requires "api" scope to change merge method'>
              <Select value={mergeMethod} onValueChange={setMergeMethod} disabled={!canWrite}>
                <SelectTrigger className="w-64">
                  <GitMerge className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge commit</SelectItem>
                  <SelectItem value="rebase_merge">Rebase and merge</SelectItem>
                  <SelectItem value="ff">Fast-forward merge</SelectItem>
                </SelectContent>
              </Select>
            </PermGate>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'remove-src',
                label: 'Delete source branch after merge',
                description: 'Automatically delete the source branch when a MR is merged.',
                value: removeSourceBranch,
                onChange: setRemoveSourceBranch,
              },
              {
                id: 'require-pipeline',
                label: 'Only allow merging if pipeline succeeds',
                description: 'Prevent merging if the latest pipeline did not pass.',
                value: requirePipelineSuccess,
                onChange: setRequirePipelineSuccess,
              },
            ].map(({ id: cbId, label, description, value, onChange }) => (
              <label key={cbId} className={`flex items-start gap-3 cursor-pointer group ${!canWrite ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="checkbox"
                  id={cbId}
                  checked={value}
                  onChange={(e) => canWrite && onChange(e.target.checked)}
                  disabled={!canWrite}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </label>
            ))}
          </div>

          <PermGate allowed={canWrite}>
            <Button
              onClick={handleSaveMRSettings}
              disabled={updateMutation.isPending || !canWrite}
            >
              {saved ? <><Check className="h-4 w-4 mr-1.5" />Saved</> : 'Save MR settings'}
            </Button>
          </PermGate>
        </div>
      </Section>

      <Separator />

      {/* ── Danger Zone ─────────────────────────────────────── */}
      <Section title="Danger Zone" description="Irreversible or destructive actions.">
        <div className="border border-destructive/40 rounded-lg divide-y divide-destructive/20 overflow-hidden">

          {/* Archive / Unarchive */}
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">
                {project.archived ? 'Unarchive this project' : 'Archive this project'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {project.archived
                  ? 'Restores the project to active state.'
                  : 'Mark the project as archived. It becomes read-only.'}
              </p>
            </div>
            <PermGate allowed={canWrite} reason='Requires "api" scope to archive projects'>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => archiveMutation.mutate()}
                disabled={archiveMutation.isPending || !canWrite}
              >
                {project.archived
                  ? <><ArchiveRestore className="h-4 w-4 mr-1.5" />Unarchive</>
                  : <><Archive className="h-4 w-4 mr-1.5" />Archive</>}
              </Button>
            </PermGate>
          </div>

          {/* Delete */}
          <div className="flex items-start justify-between gap-4 p-4 bg-destructive/5">
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Delete this project
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently deletes the project, its repository, issues, and all data.
                This action <strong>cannot be undone</strong>.
              </p>
              {canWrite && (
                <div className="mt-3 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Type <code className="bg-muted px-1 rounded">{project.path_with_namespace}</code> to confirm
                  </Label>
                  <Input
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={project.path_with_namespace}
                    className="max-w-sm text-sm font-mono"
                  />
                </div>
              )}
            </div>
            <PermGate allowed={canWrite} reason='Requires "api" scope to delete projects'>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  if (confirm(`This will permanently delete "${project.name_with_namespace}" and all its data. Are you absolutely sure?`)) {
                    deleteMutation.mutate();
                  }
                }}
                disabled={
                  !canWrite ||
                  deleteMutation.isPending ||
                  deleteConfirmName !== project.path_with_namespace
                }
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {deleteMutation.isPending ? 'Deleting…' : 'Delete project'}
              </Button>
            </PermGate>
          </div>
        </div>
      </Section>
    </div>
  );
}
