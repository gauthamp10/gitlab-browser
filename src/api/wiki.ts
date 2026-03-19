import type { GitLabApiClient } from './client';
import type { GitLabWikiPage } from '../types/gitlab';

export function createWikiApi(client: GitLabApiClient) {
  return {
    list: (projectId: number) =>
      client.request<GitLabWikiPage[]>(`/projects/${projectId}/wikis`, {
        params: { with_content: false },
      }),

    get: (projectId: number, slug: string) =>
      client.request<GitLabWikiPage>(
        `/projects/${projectId}/wikis/${encodeURIComponent(slug)}`,
        { params: { render_html: false } }
      ),

    create: (projectId: number, params: { title: string; content: string; format?: string }) =>
      client.request<GitLabWikiPage>(`/projects/${projectId}/wikis`, {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    update: (
      projectId: number,
      slug: string,
      params: { title?: string; content?: string; format?: string }
    ) =>
      client.request<GitLabWikiPage>(`/projects/${projectId}/wikis/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        body: JSON.stringify(params),
      }),

    delete: (projectId: number, slug: string) =>
      client.request<void>(`/projects/${projectId}/wikis/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      }),
  };
}
