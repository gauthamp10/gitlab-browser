import type { GitLabApiClient } from './client';
import type { GitLabGroup, GitLabProject } from '../types/gitlab';

export interface ListGroupsParams {
  search?: string;
  owned?: boolean;
  min_access_level?: number;
  order_by?: 'name' | 'path' | 'id' | 'similarity';
  sort?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  statistics?: boolean;
  with_projects?: boolean;
}

export function createGroupsApi(client: GitLabApiClient) {
  return {
    list: (params?: ListGroupsParams) =>
      client.requestPaged<GitLabGroup>('/groups', { params: params as Record<string, string | number | boolean | undefined | null> }),

    get: (id: number | string) =>
      client.request<GitLabGroup>(`/groups/${encodeURIComponent(String(id))}`, {
        params: { with_projects: false, statistics: true },
      }),

    getSubgroups: (id: number, params?: { page?: number; per_page?: number }) =>
      client.requestPaged<GitLabGroup>(`/groups/${id}/subgroups`, { params }),

    getProjects: (
      id: number,
      params?: {
        search?: string;
        order_by?: string;
        sort?: 'asc' | 'desc';
        page?: number;
        per_page?: number;
        archived?: boolean;
        visibility?: string;
        statistics?: boolean;
      }
    ) => client.requestPaged<GitLabProject>(`/groups/${id}/projects`, { params }),

    getMembers: (id: number, params?: { page?: number; per_page?: number }) =>
      client.requestPaged<{
        id: number;
        name: string;
        username: string;
        avatar_url: string;
        access_level: number;
        expires_at: string | null;
      }>(`/groups/${id}/members`, { params }),
  };
}
