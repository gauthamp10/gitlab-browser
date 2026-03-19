import type { GitLabApiClient } from './client';
import type { GitLabMergeRequest, GitLabNote, GitLabDiff, GitLabPipeline, GitLabCommit } from '../types/gitlab';

export interface ListMRsParams {
  state?: 'opened' | 'closed' | 'locked' | 'merged' | 'all';
  labels?: string;
  milestone?: string;
  assignee_id?: number;
  reviewer_id?: number;
  author_id?: number;
  search?: string;
  source_branch?: string;
  target_branch?: string;
  order_by?: 'created_at' | 'updated_at';
  sort?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  wip?: 'yes' | 'no';
}

export interface CreateMRParams {
  source_branch: string;
  target_branch: string;
  title: string;
  description?: string;
  labels?: string;
  milestone_id?: number;
  assignee_ids?: number[];
  reviewer_ids?: number[];
  remove_source_branch?: boolean;
  squash?: boolean;
}

export interface UpdateMRParams {
  title?: string;
  description?: string;
  state_event?: 'close' | 'reopen';
  labels?: string;
  milestone_id?: number;
  assignee_ids?: number[];
  reviewer_ids?: number[];
  target_branch?: string;
}

export function createMergeRequestsApi(client: GitLabApiClient) {
  return {
    list: (projectId: number, params?: ListMRsParams) =>
      client.requestPaged<GitLabMergeRequest>(`/projects/${projectId}/merge_requests`, { params: params as Record<string, string | number | boolean | undefined | null> }),

    get: (projectId: number, iid: number) =>
      client.request<GitLabMergeRequest>(`/projects/${projectId}/merge_requests/${iid}`),

    create: (projectId: number, params: CreateMRParams) =>
      client.request<GitLabMergeRequest>(`/projects/${projectId}/merge_requests`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    update: (projectId: number, iid: number, params: UpdateMRParams) =>
      client.request<GitLabMergeRequest>(`/projects/${projectId}/merge_requests/${iid}`, {
        method: 'PUT',
        body: JSON.stringify(params),
      }),

    merge: (
      projectId: number,
      iid: number,
      params?: { merge_commit_message?: string; squash?: boolean; should_remove_source_branch?: boolean }
    ) =>
      client.request<GitLabMergeRequest>(`/projects/${projectId}/merge_requests/${iid}/merge`, {
        method: 'PUT',
        body: JSON.stringify(params ?? {}),
      }),

    approve: (projectId: number, iid: number) =>
      client.request(`/projects/${projectId}/merge_requests/${iid}/approve`, {
        method: 'POST',
      }),

    unapprove: (projectId: number, iid: number) =>
      client.request(`/projects/${projectId}/merge_requests/${iid}/unapprove`, {
        method: 'POST',
      }),

    getDiffs: (projectId: number, iid: number, params?: { page?: number; per_page?: number }) =>
      client.requestPaged<GitLabDiff>(`/projects/${projectId}/merge_requests/${iid}/diffs`, {
        params,
      }),

    getCommits: (projectId: number, iid: number) =>
      client.request<GitLabCommit[]>(`/projects/${projectId}/merge_requests/${iid}/commits`),

    getNotes: (projectId: number, iid: number, params?: { sort?: 'asc' | 'desc'; page?: number; per_page?: number }) =>
      client.requestPaged<GitLabNote>(`/projects/${projectId}/merge_requests/${iid}/notes`, { params }),

    addNote: (projectId: number, iid: number, body: string) =>
      client.request<GitLabNote>(`/projects/${projectId}/merge_requests/${iid}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),

    getPipelines: (projectId: number, iid: number) =>
      client.request<GitLabPipeline[]>(`/projects/${projectId}/merge_requests/${iid}/pipelines`),

    close: (projectId: number, iid: number) =>
      client.request<GitLabMergeRequest>(`/projects/${projectId}/merge_requests/${iid}`, {
        method: 'PUT',
        body: JSON.stringify({ state_event: 'close' }),
      }),

    reopen: (projectId: number, iid: number) =>
      client.request<GitLabMergeRequest>(`/projects/${projectId}/merge_requests/${iid}`, {
        method: 'PUT',
        body: JSON.stringify({ state_event: 'reopen' }),
      }),
  };
}
