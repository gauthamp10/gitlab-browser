import type { GitLabApiClient } from './client';
import type { GitLabUser, GitLabEvent, GitLabProject } from '../types/gitlab';

export function createUsersApi(client: GitLabApiClient) {
  return {
    getCurrentUser: () => client.request<GitLabUser>('/user'),

    get: (id: number) => client.request<GitLabUser>(`/users/${id}`),

    getByUsername: (username: string) =>
      client.requestPaged<GitLabUser>('/users', { params: { username, per_page: 1 } }),

    getEvents: (
      id: number,
      params?: {
        action?: string;
        target_type?: string;
        before?: string;
        after?: string;
        page?: number;
        per_page?: number;
      }
    ) => client.requestPaged<GitLabEvent>(`/users/${id}/events`, { params }),

    getCurrentUserEvents: (params?: {
      action?: string;
      target_type?: string;
      before?: string;
      after?: string;
      page?: number;
      per_page?: number;
    }) => client.requestPaged<GitLabEvent>('/events', { params }),

    getProjects: (id: number, params?: { page?: number; per_page?: number }) =>
      client.requestPaged<GitLabProject>(`/users/${id}/projects`, { params }),

    getStarredProjects: (id: number, params?: { page?: number; per_page?: number }) =>
      client.requestPaged<GitLabProject>(`/users/${id}/starred_projects`, { params }),

    search: (query: string) =>
      client.requestPaged<GitLabUser>('/users', { params: { search: query, per_page: 20 } }),

    getSshKeys: () =>
      client.request<Array<{ id: number; title: string; key: string; created_at: string }>>('/user/keys'),
  };
}
