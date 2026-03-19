import type { GitLabApiClient } from './client';
import type {
  GitLabProject,
  GitLabBranch,
  GitLabTag,
  GitLabContributor,
  GitLabCommit,
  GitLabNamespace,
} from '../types/gitlab';

export interface CreateProjectParams {
  name: string;
  path?: string;
  namespace_id?: number;
  description?: string;
  visibility?: 'private' | 'internal' | 'public';
  initialize_with_readme?: boolean;
  default_branch?: string;
  auto_devops_enabled?: boolean;
}

export interface ListProjectsParams {
  membership?: boolean;
  owned?: boolean;
  starred?: boolean;
  search?: string;
  order_by?: 'id' | 'name' | 'path' | 'created_at' | 'updated_at' | 'last_activity_at' | 'star_count';
  sort?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  visibility?: 'public' | 'internal' | 'private';
  archived?: boolean;
  statistics?: boolean;
  topic?: string;
}

export function createProjectsApi(client: GitLabApiClient) {
  return {
    list: (params?: ListProjectsParams) =>
      client.requestPaged<GitLabProject>('/projects', { params: params as Record<string, string | number | boolean | undefined | null> }),

    get: (id: number | string) =>
      client.request<GitLabProject>(`/projects/${encodeURIComponent(String(id))}`, {
        params: { statistics: true },
      }),

    star: (id: number) =>
      client.request<GitLabProject>(`/projects/${id}/star`, { method: 'POST' }),

    unstar: (id: number) =>
      client.request<GitLabProject>(`/projects/${id}/unstar`, { method: 'POST' }),

    fork: (id: number) =>
      client.request<GitLabProject>(`/projects/${id}/fork`, { method: 'POST' }),

    getBranches: (id: number, params?: { search?: string; page?: number; per_page?: number }) =>
      client.requestPaged<GitLabBranch>(`/projects/${id}/repository/branches`, { params }),

    getBranch: (id: number, branch: string) =>
      client.request<GitLabBranch>(
        `/projects/${id}/repository/branches/${encodeURIComponent(branch)}`
      ),

    getTags: (id: number, params?: { search?: string; page?: number; per_page?: number }) =>
      client.requestPaged<GitLabTag>(`/projects/${id}/repository/tags`, { params }),

    getCommits: (
      id: number,
      params?: { ref_name?: string; path?: string; author?: string; since?: string; until?: string; page?: number; per_page?: number }
    ) => client.requestPaged<GitLabCommit>(`/projects/${id}/repository/commits`, { params }),

    getCommit: (id: number, sha: string) =>
      client.request<GitLabCommit>(`/projects/${id}/repository/commits/${sha}`),

    getLanguages: (id: number) =>
      client.request<Record<string, number>>(`/projects/${id}/languages`),

    getContributors: (
      id: number,
      params?: { order_by?: 'email' | 'name' | 'commits'; sort?: 'asc' | 'desc' }
    ) =>
      client.requestPaged<GitLabContributor>(
        `/projects/${id}/repository/contributors`,
        { params }
      ),

    create: (params: CreateProjectParams) =>
      client.request<GitLabProject>('/projects', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    listNamespaces: (search?: string) =>
      client.requestPaged<GitLabNamespace>('/namespaces', {
        params: search ? { search } : undefined,
      }),

    compare: (id: number, from: string, to: string) =>
      client.request<{
        commit: GitLabCommit;
        commits: GitLabCommit[];
        diffs: Array<{
          diff: string;
          new_path: string;
          old_path: string;
          new_file: boolean;
          renamed_file: boolean;
          deleted_file: boolean;
        }>;
      }>(`/projects/${id}/repository/compare`, {
        params: { from, to },
      }),
  };
}
