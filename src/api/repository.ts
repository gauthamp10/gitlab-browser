import type { GitLabApiClient } from './client';
import type { GitLabTreeItem, GitLabFile, GitLabBlame } from '../types/gitlab';

export function createRepositoryApi(client: GitLabApiClient) {
  return {
    getTree: (
      projectId: number,
      params?: {
        path?: string;
        ref?: string;
        recursive?: boolean;
        per_page?: number;
        page?: number;
        pagination?: 'keyset' | 'offset';
      }
    ) => client.requestPaged<GitLabTreeItem>(`/projects/${projectId}/repository/tree`, { params }),

    getFile: (projectId: number, filePath: string, ref: string) => {
      const encodedPath = filePath
        .split('/')
        .map(encodeURIComponent)
        .join('%2F');
      return client.request<GitLabFile>(
        `/projects/${projectId}/repository/files/${encodedPath}`,
        { params: { ref } }
      );
    },

    getRawFile: (projectId: number, filePath: string, ref: string) => {
      const encodedPath = filePath
        .split('/')
        .map(encodeURIComponent)
        .join('%2F');
      return client.requestText(
        `/projects/${projectId}/repository/files/${encodedPath}/raw`,
        { params: { ref } }
      );
    },

    getBlame: (projectId: number, filePath: string, ref: string) => {
      const encodedPath = filePath
        .split('/')
        .map(encodeURIComponent)
        .join('%2F');
      return client.request<GitLabBlame[]>(
        `/projects/${projectId}/repository/files/${encodedPath}/blame`,
        { params: { ref } }
      );
    },

    getArchive: (projectId: number, ref: string, format: 'tar.gz' | 'zip' = 'tar.gz') =>
      `${client.base}/projects/${projectId}/repository/archive.${format}?ref=${encodeURIComponent(ref)}`,
  };
}
