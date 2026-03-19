import type { GitLabApiClient } from './client';
import type { GitLabTodo } from '../types/gitlab';

export function createTodosApi(client: GitLabApiClient) {
  return {
    list: (params?: {
      action?: string;
      author_id?: number;
      project_id?: number;
      group_id?: number;
      state?: 'pending' | 'done';
      type?: string;
      page?: number;
      per_page?: number;
    }) => client.requestPaged<GitLabTodo>('/todos', { params }),

    markDone: (id: number) =>
      client.request<GitLabTodo>(`/todos/${id}/mark_as_done`, { method: 'POST' }),

    markAllDone: () =>
      client.request<void>('/todos/mark_as_done', { method: 'POST' }),

    getCount: () =>
      client.requestPaged<GitLabTodo>('/todos', {
        params: { state: 'pending', per_page: 1 },
      }),
  };
}
