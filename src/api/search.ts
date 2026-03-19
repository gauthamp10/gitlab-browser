import type { GitLabApiClient } from './client';
import type { GitLabSearchResult } from '../types/gitlab';

export type SearchScope =
  | 'projects'
  | 'issues'
  | 'merge_requests'
  | 'milestones'
  | 'snippet_titles'
  | 'users'
  | 'commits'
  | 'blobs'
  | 'notes'
  | 'wiki_blobs';

export function createSearchApi(client: GitLabApiClient) {
  return {
    global: (scope: SearchScope, search: string, params?: { page?: number; per_page?: number }) =>
      client.requestPaged<GitLabSearchResult>('/search', {
        params: { scope, search, ...params },
      }),

    inProject: (
      projectId: number,
      scope: SearchScope,
      search: string,
      params?: { page?: number; per_page?: number; ref?: string }
    ) =>
      client.requestPaged<GitLabSearchResult>(`/projects/${projectId}/search`, {
        params: { scope, search, ...params },
      }),

    inGroup: (
      groupId: number,
      scope: SearchScope,
      search: string,
      params?: { page?: number; per_page?: number }
    ) =>
      client.requestPaged<GitLabSearchResult>(`/groups/${groupId}/search`, {
        params: { scope, search, ...params },
      }),
  };
}
