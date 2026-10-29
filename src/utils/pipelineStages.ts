import type { GitLabBridge, GitLabJob, PipelineStatus } from '../types/gitlab';

export type PipelineItem = (GitLabJob & { kind: 'job' }) | (GitLabBridge & { kind: 'bridge' });

export interface PipelineStage {
  name: string;
  status: PipelineStatus;
  items: PipelineItem[];
}

export function isBridge(item: PipelineItem): item is GitLabBridge & { kind: 'bridge' } {
  return item.kind === 'bridge';
}

/**
 * Roll up job statuses into one stage status, the way GitLab's stage icon does:
 * active states win, then a blocking failure, and allowed failures count as passed.
 */
export function compositeStatus(items: Array<{ status: PipelineStatus; allow_failure: boolean }>): PipelineStatus {
  const has = (...s: PipelineStatus[]) => items.some((i) => s.includes(i.status));
  if (items.length === 0) return 'created';
  if (has('running', 'preparing')) return 'running';
  if (has('pending', 'waiting_for_resource')) return 'pending';
  if (items.some((i) => i.status === 'failed' && !i.allow_failure)) return 'failed';
  if (has('canceled')) return 'canceled';
  if (has('scheduled')) return 'scheduled';
  if (has('created')) return 'created';
  if (items.every((i) => i.status === 'skipped')) return 'skipped';
  if (items.every((i) => i.status === 'manual' || i.status === 'skipped')) return 'manual';
  return 'success';
}

/**
 * Group jobs and trigger jobs into stages in pipeline order. GitLab creates a
 * pipeline's jobs stage by stage, so the lowest job id in a stage gives its
 * position — this keeps custom stage names in their .gitlab-ci.yml order.
 */
export function groupStages(jobs: GitLabJob[], bridges: GitLabBridge[] = []): PipelineStage[] {
  const items: PipelineItem[] = [
    ...jobs.map((j) => ({ ...j, kind: 'job' as const })),
    ...bridges.map((b) => ({ ...b, kind: 'bridge' as const })),
  ];
  const byStage = new Map<string, PipelineItem[]>();
  for (const item of items) {
    const list = byStage.get(item.stage) ?? [];
    list.push(item);
    byStage.set(item.stage, list);
  }
  return Array.from(byStage, ([name, stageItems]) => ({
    name,
    status: compositeStatus(stageItems),
    items: stageItems.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
  })).sort((a, b) => minId(a.items) - minId(b.items));
}

function minId(items: PipelineItem[]): number {
  return Math.min(...items.map((i) => i.id));
}

/** "group/project" from a pipeline web_url, for display only. */
export function projectPathFromWebUrl(webUrl: string): string | null {
  try {
    const path = new URL(webUrl).pathname;
    const idx = path.indexOf('/-/');
    return idx > 0 ? path.slice(1, idx) : null;
  } catch {
    return null;
  }
}
