import { useState, useRef, useEffect } from 'react';
import { useOutletContext, useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  GitCommit, GitBranch, Search, ChevronDown, ChevronRight,
  Plus, Minus, Copy, Check, ExternalLink,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectSeparator, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import UserAvatar from '../../components/common/UserAvatar';
import TimeAgo from '../../components/common/TimeAgo';
import { useApi } from '../../api';
import { useDebounce } from '../../hooks/useDebounce';
import { buildGraphRows, type GraphRow, type GraphSegment, type GraphState } from '../../utils/gitGraph';
import type { GitLabProject } from '../../types/gitlab';

// ─── Graph rendering constants ────────────────────────────────────────────────
const ROW_H = 40;
const COL_W = 18;
const DOT_R = 4.5;
const STROKE_W = 2;
const MAX_COLS = 12; // cap graph width

interface OutletContext { project: GitLabProject }

// ─── SVG segment → path string ────────────────────────────────────────────────
function segmentPath(seg: GraphSegment): string {
  const x1 = seg.x1 * COL_W + COL_W / 2;
  const x2 = seg.x2 * COL_W + COL_W / 2;
  const y1 = seg.y1 === 0 ? 0 : seg.y1 === 1 ? ROW_H / 2 : ROW_H;
  const y2 = seg.y2 === 0 ? 0 : seg.y2 === 1 ? ROW_H / 2 : ROW_H;
  if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`;
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

// ─── Graph cell (SVG for one row) ─────────────────────────────────────────────
function GraphCell({ row }: { row: GraphRow }) {
  const cols = Math.min(row.numCols, MAX_COLS);
  const w = cols * COL_W;
  const cx = row.col * COL_W + COL_W / 2;
  const cy = ROW_H / 2;

  return (
    <svg
      width={w}
      height={ROW_H}
      className="shrink-0 overflow-visible"
      style={{ minWidth: w }}
      aria-hidden
    >
      {row.segments.map((seg, i) => (
        <path
          key={i}
          d={segmentPath(seg)}
          stroke={seg.color}
          strokeWidth={STROKE_W}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      {/* Commit dot */}
      <circle cx={cx} cy={cy} r={DOT_R} fill={row.color} />
      {/* Inner dot for merge commits */}
      {(row.commit.parent_ids?.length ?? 0) > 1 && (
        <circle cx={cx} cy={cy} r={DOT_R - 2} fill="var(--background)" />
      )}
    </svg>
  );
}

// ─── Diff hunk viewer ─────────────────────────────────────────────────────────
function DiffHunk({ diff }: { diff: string }) {
  const lines = diff.split('\n');
  return (
    <div className="font-mono text-[11px] leading-5 overflow-x-auto">
      {lines.map((line, i) => {
        const isAdd = line.startsWith('+') && !line.startsWith('+++');
        const isDel = line.startsWith('-') && !line.startsWith('---');
        const isHunk = line.startsWith('@@');
        return (
          <div
            key={i}
            className={
              isAdd ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
              isDel ? 'bg-red-500/10 text-red-700 dark:text-red-400' :
              isHunk ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
              'text-muted-foreground'
            }
          >
            <span className="select-none pr-2 text-muted-foreground/40">
              {isAdd ? '+' : isDel ? '-' : ' '}
            </span>
            {line.slice(1)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Expanded commit detail panel ─────────────────────────────────────────────
function CommitDetail({ sha, projectId }: { sha: string; projectId: number }) {
  const api = useApi();
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const { data: commit, isLoading: loadingCommit } = useQuery({
    queryKey: ['commit', projectId, sha],
    queryFn: () => api.projects.getCommit(projectId, sha),
  });

  const { data: diff, isLoading: loadingDiff } = useQuery({
    queryKey: ['commit-diff', projectId, sha],
    queryFn: () => api.projects.getCommitDiff(projectId, sha),
  });

  const toggleFile = (path: string) =>
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  if (loadingCommit || loadingDiff) {
    return (
      <div className="p-4 space-y-3 border-t bg-muted/20">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="border-t bg-muted/10">
      {/* Full message */}
      {commit && commit.message.trim() !== commit.title.trim() && (
        <div className="px-4 pt-3 pb-2">
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
            {commit.message.trim()}
          </pre>
        </div>
      )}

      {/* Stats bar */}
      {commit?.stats && (
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b">
          <span className="flex items-center gap-1">
            <GitCommit className="h-3.5 w-3.5" />
            {diff?.items.length ?? '?'} files changed
          </span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Plus className="h-3 w-3" />
            {commit.stats.additions.toLocaleString()} additions
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <Minus className="h-3 w-3" />
            {commit.stats.deletions.toLocaleString()} deletions
          </span>
        </div>
      )}

      {/* Files */}
      <div className="divide-y">
        {diff?.items.map((file) => {
          const isExpanded = expandedFiles.has(file.new_path);
          const statusLabel = file.new_file ? 'A' : file.deleted_file ? 'D' : file.renamed_file ? 'R' : 'M';
          const statusColor =
            file.new_file ? 'text-green-600 dark:text-green-400' :
            file.deleted_file ? 'text-red-600 dark:text-red-400' :
            file.renamed_file ? 'text-yellow-600 dark:text-yellow-400' :
            'text-blue-600 dark:text-blue-400';

          return (
            <div key={file.new_path}>
              <button
                onClick={() => toggleFile(file.new_path)}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-muted/50 transition-colors text-left"
              >
                {isExpanded
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <span className={`font-mono font-bold w-4 shrink-0 ${statusColor}`}>{statusLabel}</span>
                <span className="font-mono flex-1 truncate">
                  {file.renamed_file && file.old_path !== file.new_path
                    ? `${file.old_path} → ${file.new_path}`
                    : file.new_path}
                </span>
              </button>
              {isExpanded && file.diff && (
                <div className="px-4 pb-3 border-t bg-card">
                  <DiffHunk diff={file.diff} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Single commit row ─────────────────────────────────────────────────────────
function CommitRow({
  row,
  projectId,
  isExpanded,
  onToggle,
  graphWidth,
}: {
  row: GraphRow;
  projectId: number;
  isExpanded: boolean;
  onToggle: () => void;
  graphWidth: number;
}) {
  const [copied, setCopied] = useState(false);

  const copyHash = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(row.commit.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const authorUser = {
    id: 0,
    name: row.commit.author_name,
    username: row.commit.author_email,
    avatar_url: `https://www.gravatar.com/avatar/${row.commit.author_email}?d=identicon&s=32`,
    email: row.commit.author_email,
    web_url: '',
    bio: null,
    location: null,
    public_email: null,
    created_at: '',
    state: 'active' as const,
  };

  return (
    <div className="border-b last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-0 hover:bg-muted/30 transition-colors text-left"
        style={{ height: ROW_H }}
      >
        {/* Graph SVG — fixed-width left column */}
        <div className="shrink-0 overflow-hidden" style={{ width: graphWidth }}>
          <GraphCell row={row} />
        </div>

        {/* Commit info */}
        <div className="flex-1 min-w-0 flex items-center gap-3 px-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">
              {row.commit.title}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              <span className="font-medium">{row.commit.author_name}</span>
              {' · '}
              <TimeAgo date={row.commit.authored_date} />
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <UserAvatar user={authorUser} size="xs" showTooltip={false} />

            {/* Short hash */}
            <button
              onClick={copyHash}
              title="Copy full SHA"
              className="flex items-center gap-1 font-mono text-xs px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors"
            >
              {copied
                ? <Check className="h-3 w-3 text-green-500" />
                : <Copy className="h-3 w-3 text-muted-foreground" />}
              {row.commit.short_id}
            </button>

            {/* Link to GitLab */}
            <a
              href={row.commit.web_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="View on GitLab"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {/* Expand indicator */}
            {isExpanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <CommitDetail sha={row.commit.id} projectId={projectId} />
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
const PER_PAGE = 50;

export default function Commits() {
  const { id } = useParams<{ id: string }>();
  const outletCtx = useOutletContext<OutletContext | undefined>();
  const project = outletCtx?.project;
  const api = useApi();

  const defaultRef = project?.default_branch ?? 'main';
  const [ref, setRef] = useState(defaultRef);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  // ── Graph accumulation ───────────────────────────────────────────────────
  const [rows, setRows] = useState<GraphRow[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const graphStateRef = useRef<GraphState>({ lanes: [], nextColorIdx: 0 });

  // Expanded row
  const [expandedSha, setExpandedSha] = useState<string | null>(null);

  // Max columns seen so far — fixes graph SVG width across all rows
  const maxColsRef = useRef(1);

  // ── Initial / ref-change fetch ───────────────────────────────────────────
  const { data: initialData, isLoading, error } = useQuery({
    queryKey: ['project', id, 'commits-graph', ref, debouncedSearch],
    queryFn: () =>
      api.projects.getCommits(Number(id), {
        ref_name: ref,
        search: debouncedSearch || undefined,
        per_page: PER_PAGE,
        page: 1,
        with_stats: true,
      } as Parameters<typeof api.projects.getCommits>[1]),
    enabled: !!id && !!ref,
  });

  // Reset and compute graph when initial data arrives
  useEffect(() => {
    if (!initialData) return;
    graphStateRef.current = { lanes: [], nextColorIdx: 0 };
    maxColsRef.current = 1;
    const { rows: newRows, state } = buildGraphRows(initialData.items, graphStateRef.current);
    graphStateRef.current = state;
    newRows.forEach((r) => { maxColsRef.current = Math.max(maxColsRef.current, r.numCols); });
    setRows(newRows);
    setHasMore(!!initialData.pagination.nextPage);
    setNextPage(2);
    setExpandedSha(null);
  }, [initialData]);

  // Reset state when ref or search changes
  useEffect(() => {
    graphStateRef.current = { lanes: [], nextColorIdx: 0 };
    maxColsRef.current = 1;
    setRows([]);
    setHasMore(true);
    setNextPage(1);
    setExpandedSha(null);
  }, [ref, debouncedSearch]);

  // ── Branches / tags for selector ────────────────────────────────────────
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

  // ── Load more ────────────────────────────────────────────────────────────
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const more = await api.projects.getCommits(Number(id!), {
        ref_name: ref,
        search: debouncedSearch || undefined,
        per_page: PER_PAGE,
        page: nextPage,
        with_stats: true,
      } as Parameters<typeof api.projects.getCommits>[1]);
      const { rows: newRows, state } = buildGraphRows(more.items, graphStateRef.current);
      graphStateRef.current = state;
      newRows.forEach((r) => { maxColsRef.current = Math.max(maxColsRef.current, r.numCols); });
      setRows((prev) => [...prev, ...newRows]);
      setHasMore(!!more.pagination.nextPage);
      setNextPage((p) => p + 1);
    } catch { /* ignore */ }
    setIsLoadingMore(false);
  };

  // Fixed SVG graph panel width — based on max columns seen
  const graphWidth = Math.min(maxColsRef.current, MAX_COLS) * COL_W;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b bg-card flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <GitCommit className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Commit Graph</h2>
          {rows.length > 0 && (
            <Badge variant="secondary">{rows.length}{hasMore ? '+' : ''} commits</Badge>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {/* Branch / Tag selector */}
          <Select value={ref} onValueChange={(v) => { if (v) setRef(v); }}>
            <SelectTrigger className="w-52">
              <GitBranch className="h-4 w-4 mr-2 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {branches?.items.length ? (
                <SelectGroup>
                  <SelectLabel>Branches</SelectLabel>
                  {branches.items.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      {b.name}{b.default ? ' ✓' : ''}
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

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search commits…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-56"
            />
          </div>

          {/* Link to repository */}
          {project && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/projects/${id}/repository`}>
                <GitBranch className="h-4 w-4 mr-1.5" />
                Repository
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Graph ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-6" style={{ height: ROW_H }}>
                <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-muted-foreground">
            <p className="font-medium">Failed to load commits</p>
            <p className="text-sm mt-1">{(error as Error).message}</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No commits found.</p>
          </div>
        ) : (
          <div>
            {rows.map((row) => (
              <CommitRow
                key={row.commit.id}
                row={row}
                projectId={Number(id)}
                isExpanded={expandedSha === row.commit.id}
                onToggle={() =>
                  setExpandedSha((prev) =>
                    prev === row.commit.id ? null : row.commit.id
                  )
                }
                graphWidth={graphWidth}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-6">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading…' : 'Load more commits'}
                </Button>
              </div>
            )}

            {!hasMore && rows.length > 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">
                All {rows.length} commits loaded
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
