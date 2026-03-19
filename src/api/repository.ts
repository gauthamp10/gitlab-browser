import type { GitLabApiClient } from './client';
import type { GitLabTreeItem, GitLabFile, GitLabBlame, GitLabBranch } from '../types/gitlab';

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

    // Token is sent in the PRIVATE-TOKEN header (inside fetchBlob), never in
    // the URL, so it cannot appear in browser history or server access logs.
    downloadArchive: async (
      projectId: number,
      ref: string,
      filename: string,
      format: 'tar.gz' | 'zip' = 'zip'
    ): Promise<void> => {
      const blob = await client.fetchBlob(
        `/projects/${projectId}/repository/archive.${format}`,
        { ref }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${ref}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    createBranch: (projectId: number, branch: string, ref: string) =>
      client.request<GitLabBranch>(`/projects/${projectId}/repository/branches`, {
        method: 'POST',
        body: JSON.stringify({ branch, ref }),
      }),

    deleteBranch: (projectId: number, branch: string) =>
      client.request<void>(
        `/projects/${projectId}/repository/branches/${encodeURIComponent(branch)}`,
        { method: 'DELETE' }
      ),

  };
}
