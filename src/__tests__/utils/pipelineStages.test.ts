import { describe, it, expect } from 'vitest';
import { compositeStatus, groupStages, projectPathFromWebUrl } from '../../utils/pipelineStages';
import type { GitLabBridge, GitLabJob, PipelineStatus } from '../../types/gitlab';

function job(id: number, stage: string, status: PipelineStatus = 'success', name = `job-${id}`, allow_failure = false) {
  return { id, stage, status, name, allow_failure } as GitLabJob;
}

function bridge(id: number, stage: string, status: PipelineStatus = 'success') {
  return { id, stage, status, name: `trigger-${id}`, allow_failure: false, downstream_pipeline: null } as GitLabBridge;
}

describe('compositeStatus', () => {
  const s = (status: PipelineStatus, allow_failure = false) => ({ status, allow_failure });

  it('is success when all jobs passed', () => {
    expect(compositeStatus([s('success'), s('success')])).toBe('success');
  });

  it('prefers running over failed', () => {
    expect(compositeStatus([s('failed'), s('running')])).toBe('running');
  });

  it('is failed when a blocking job failed', () => {
    expect(compositeStatus([s('success'), s('failed')])).toBe('failed');
  });

  it('treats allowed failures as passed', () => {
    expect(compositeStatus([s('success'), s('failed', true)])).toBe('success');
  });

  it('is manual when only manual and skipped jobs remain', () => {
    expect(compositeStatus([s('manual'), s('skipped')])).toBe('manual');
  });

  it('is success when manual jobs sit beside passed ones', () => {
    expect(compositeStatus([s('success'), s('manual')])).toBe('success');
  });

  it('is skipped when every job was skipped', () => {
    expect(compositeStatus([s('skipped'), s('skipped')])).toBe('skipped');
  });
});

describe('groupStages', () => {
  it('orders custom stages by their first job id, not by name', () => {
    const stages = groupStages([job(30, 'publish'), job(10, 'lint'), job(20, 'compile')]);
    expect(stages.map((st) => st.name)).toEqual(['lint', 'compile', 'publish']);
  });

  it('puts trigger jobs in their stage alongside regular jobs', () => {
    const stages = groupStages([job(1, 'build')], [bridge(2, 'downstream')]);
    expect(stages).toHaveLength(2);
    expect(stages[1].items[0].kind).toBe('bridge');
  });

  it('sorts jobs within a stage by name, numerically', () => {
    const stages = groupStages([job(1, 'test', 'success', 'rspec 10/10'), job(2, 'test', 'success', 'rspec 2/10')]);
    expect(stages[0].items.map((i) => i.name)).toEqual(['rspec 2/10', 'rspec 10/10']);
  });

  it('computes each stage status', () => {
    const stages = groupStages([job(1, 'build'), job(2, 'test', 'failed')]);
    expect(stages.map((st) => st.status)).toEqual(['success', 'failed']);
  });
});

describe('projectPathFromWebUrl', () => {
  it('extracts a nested project path', () => {
    expect(projectPathFromWebUrl('https://gitlab.example.com/group/sub/app/-/pipelines/42')).toBe('group/sub/app');
  });

  it('returns null for unparseable input', () => {
    expect(projectPathFromWebUrl('not a url')).toBeNull();
  });
});
