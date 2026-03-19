import { useState } from 'react';
import { Link, useOutletContext, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight, GitBranch, GitCommit,
  Download, Clock, ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue, SelectSeparator,
} from '../../components/ui/select';
import TimeAgo from '../../components/common/TimeAgo';
import EmptyState from '../../components/common/EmptyState';
import ErrorMessage from '../../components/common/ErrorMessage';
import { useApi } from '../../api';
import { getFileExtension } from '../../utils/url';
import type { GitLabProject, GitLabTreeItem } from '../../types/gitlab';

interface OutletContext {
  project: GitLabProject;
}

const fileIcons: Record<string, string> = {
  ts: '📄', tsx: '⚛️', js: '📄', jsx: '⚛️', py: '🐍',
  rb: '💎', go: '🐹', rs: '🦀', java: '☕', md: '📝',
  json: '📋', yaml: '📋', yml: '📋', toml: '📋',
  css: '🎨', scss: '🎨', html: '🌐', vue: '💚',
  dockerfile: '🐳', gitignore: '🔒',
};

function getFileEmoji(name: string): string {
  const ext = getFileExtension(name);
  return fileIcons[ext] ?? fileIcons[name.toLowerCase()] ?? '📄';
}

export default function Repository() {
  const { id, '*': wildcardPath } = useParams<{ id: string; '*': string }>();
  const outletCtx = useOutletContext<OutletContext | undefined>();
  const project = outletCtx?.project;
  const location = useLocation();
  const api = useApi();

  const defaultBranch = project?.default_branch || 'main';
  const [ref, setRef] = useState(defaultBranch);

  // Use React Router's wildcard param directly (more reliable than parsing location.pathname)
  const currentPath = wildcardPath ? decodeURIComponent(wildcardPath) : '';

  const { data: branches } = useQuery({
    queryKey: ['project', id, 'branches'],
    queryFn: () => api.projects.getBranches(Number(id), { per_page: 100 }),
    enabled: !!id,
  });

  const { data: tags } = useQuery({
    queryKey: ['project', id, 'tags'],
    queryFn: () => api.projects.getTags(Number(id), { per_page: 50 }),
    enabled: !!id,
  });

  const { data: tree, isLoading, error, refetch } = useQuery({
    queryKey: ['project', id, 'tree', ref, currentPath],
    queryFn: () =>
      api.repository.getTree(Number(id), {
        path: currentPath || undefined,
        ref: ref || undefined,
        per_page: 100,
      }),
    enabled: !!id && !!ref,
  });

  const { data: lastCommit } = useQuery({
    queryKey: ['project', id, 'commits', ref, currentPath, 'last'],
    queryFn: () =>
      api.projects.getCommits(Number(id), {
        ref_name: ref,
        path: currentPath || undefined,
        per_page: 1,
      }),
    enabled: !!id && !!ref,
  });

  const pathParts = currentPath ? currentPath.split('/') : [];
  const parentPath = pathParts.slice(0, -1).join('/');

  const sorted = tree?.items
    ? [
        ...tree.items.filter((i) => i.type === 'tree'),
        ...tree.items.filter((i) => i.type === 'blob'),
      ]
    : [];

  if (!project) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      {/* Branch selector + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={ref} onValueChange={(v) => { if (v) setRef(v); }}>
          <SelectTrigger className="w-48">
            <GitBranch className="h-4 w-4 mr-2" />
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
            {branches?.items.length && tags?.items.length ? (
              <SelectSeparator />
            ) : null}
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

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-1 min-w-0">
          <Link
            to={`/projects/${id}/repository`}
            className="text-primary hover:underline font-medium"
          >
            {project.name}
          </Link>
          {pathParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <Link
                to={`/projects/${id}/repository/tree/${pathParts.slice(0, i + 1).join('/')}`}
                className={i === pathParts.length - 1 ? 'text-foreground font-medium' : 'text-primary hover:underline'}
              >
                {part}
              </Link>
            </span>
          ))}
        </div>

        <Button variant="outline" size="sm" asChild>
          <a
            href={api.repository.getArchive(Number(id), ref)}
            download
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </a>
        </Button>
      </div>

      {/* Last commit info */}
      {lastCommit?.items[0] && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          <GitCommit className="h-4 w-4 shrink-0" />
          <code className="font-mono text-xs text-foreground bg-muted px-1 rounded">
            {lastCommit.items[0].short_id}
          </code>
          <span className="truncate">{lastCommit.items[0].title}</span>
          <span className="shrink-0 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <TimeAgo date={lastCommit.items[0].committed_date} />
          </span>
        </div>
      )}

      {/* File tree */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {currentPath && (
          <Link
            to={parentPath
              ? `/projects/${id}/repository/tree/${parentPath}`
              : `/projects/${id}/repository`}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50 border-b transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">..</span>
          </Link>
        )}

        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4 ml-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorMessage error={error as Error} onRetry={() => refetch()} />
          </div>
        ) : !sorted.length ? (
          <EmptyState title="Empty repository" description="No files found in this directory." />
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((item: GitLabTreeItem) => {
              const isDir = item.type === 'tree';
              const to = isDir
                ? `/projects/${id}/repository/tree/${item.path}`
                : `/projects/${id}/repository/blob/${item.path}${location.search ? `?ref=${ref}` : `?ref=${ref}`}`;

              return (
                <Link
                  key={item.id}
                  to={to}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-base w-5 shrink-0">
                    {isDir ? '📁' : getFileEmoji(item.name)}
                  </span>
                  <span
                    className={`text-sm flex-1 ${isDir ? 'text-foreground font-medium' : 'text-foreground'} group-hover:text-primary transition-colors`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
