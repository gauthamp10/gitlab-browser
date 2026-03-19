import type { GitLabApiClient } from './client';
import type { GitLabIssue, GitLabNote, GitLabLabel, GitLabMilestone } from '../types/gitlab';

export interface ListIssuesParams {
  state?: 'opened' | 'closed' | 'all';
  labels?: string;
  milestone?: string;
  assignee_id?: number;
  author_id?: number;
  search?: string;
  order_by?: 'created_at' | 'updated_at' | 'priority' | 'due_date' | 'relative_position';
  sort?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  confidential?: boolean;
}

export interface CreateIssueParams {
  title: string;
  description?: string;
  labels?: string;
  milestone_id?: number;
  assignee_ids?: number[];
  due_date?: string;
  confidential?: boolean;
}

export interface UpdateIssueParams {
  title?: string;
  description?: string;
  state_event?: 'close' | 'reopen';
  labels?: string;
  milestone_id?: number;
  assignee_ids?: number[];
  due_date?: string;
}

export function createIssuesApi(client: GitLabApiClient) {
  return {
    list: (projectId: number, params?: ListIssuesParams) =>
      client.requestPaged<GitLabIssue>(`/projects/${projectId}/issues`, { params: params as Record<string, string | number | boolean | undefined | null> }),

    listAll: (params?: ListIssuesParams) =>
      client.requestPaged<GitLabIssue>('/issues', { params: params as Record<string, string | number | boolean | undefined | null> }),

    get: (projectId: number, iid: number) =>
      client.request<GitLabIssue>(`/projects/${projectId}/issues/${iid}`),

    create: (projectId: number, params: CreateIssueParams) =>
      client.request<GitLabIssue>(`/projects/${projectId}/issues`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    update: (projectId: number, iid: number, params: UpdateIssueParams) =>
      client.request<GitLabIssue>(`/projects/${projectId}/issues/${iid}`, {
        method: 'PUT',
        body: JSON.stringify(params),
      }),

    close: (projectId: number, iid: number) =>
      client.request<GitLabIssue>(`/projects/${projectId}/issues/${iid}`, {
        method: 'PUT',
        body: JSON.stringify({ state_event: 'close' }),
      }),

    reopen: (projectId: number, iid: number) =>
      client.request<GitLabIssue>(`/projects/${projectId}/issues/${iid}`, {
        method: 'PUT',
        body: JSON.stringify({ state_event: 'reopen' }),
      }),

    getNotes: (projectId: number, iid: number, params?: { sort?: 'asc' | 'desc'; page?: number; per_page?: number }) =>
      client.requestPaged<GitLabNote>(`/projects/${projectId}/issues/${iid}/notes`, { params }),

    addNote: (projectId: number, iid: number, body: string) =>
      client.request<GitLabNote>(`/projects/${projectId}/issues/${iid}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),

    updateNote: (projectId: number, iid: number, noteId: number, body: string) =>
      client.request<GitLabNote>(`/projects/${projectId}/issues/${iid}/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify({ body }),
      }),

    deleteNote: (projectId: number, iid: number, noteId: number) =>
      client.request<void>(`/projects/${projectId}/issues/${iid}/notes/${noteId}`, {
        method: 'DELETE',
      }),

    getLabels: (projectId: number) =>
      client.requestPaged<GitLabLabel>(`/projects/${projectId}/labels`, {
        params: { per_page: 100 },
      }),

    getMilestones: (projectId: number, params?: { state?: 'active' | 'closed' }) =>
      client.requestPaged<GitLabMilestone>(`/projects/${projectId}/milestones`, { params }),

    award: (projectId: number, iid: number, awardable_type: 'issues', emoji: string) =>
      client.request(`/projects/${projectId}/issues/${iid}/award_emoji`, {
        method: 'POST',
        body: JSON.stringify({ name: emoji }),
      }),
  };
}
