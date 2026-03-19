import type { GitLabApiClient } from './client';
import type { GitLabPipeline, GitLabJob } from '../types/gitlab';

export interface ListPipelinesParams {
  status?: string;
  ref?: string;
  sha?: string;
  username?: string;
  order_by?: 'id' | 'status' | 'ref' | 'updated_at' | 'user_id';
  sort?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  source?: string;
}

export function createPipelinesApi(client: GitLabApiClient) {
  return {
    list: (projectId: number, params?: ListPipelinesParams) =>
      client.requestPaged<GitLabPipeline>(`/projects/${projectId}/pipelines`, { params: params as Record<string, string | number | boolean | undefined | null> }),

    get: (projectId: number, pipelineId: number) =>
      client.request<GitLabPipeline>(`/projects/${projectId}/pipelines/${pipelineId}`),

    getJobs: (
      projectId: number,
      pipelineId: number,
      params?: { scope?: string; per_page?: number; page?: number }
    ) => client.requestPaged<GitLabJob>(`/projects/${projectId}/pipelines/${pipelineId}/jobs`, { params }),

    retry: (projectId: number, pipelineId: number) =>
      client.request<GitLabPipeline>(`/projects/${projectId}/pipelines/${pipelineId}/retry`, {
        method: 'POST',
      }),

    cancel: (projectId: number, pipelineId: number) =>
      client.request<GitLabPipeline>(`/projects/${projectId}/pipelines/${pipelineId}/cancel`, {
        method: 'POST',
      }),

    delete: (projectId: number, pipelineId: number) =>
      client.request<void>(`/projects/${projectId}/pipelines/${pipelineId}`, {
        method: 'DELETE',
      }),

    getJob: (projectId: number, jobId: number) =>
      client.request<GitLabJob>(`/projects/${projectId}/jobs/${jobId}`),

    getJobTrace: (projectId: number, jobId: number) =>
      client.requestText(`/projects/${projectId}/jobs/${jobId}/trace`),

    retryJob: (projectId: number, jobId: number) =>
      client.request<GitLabJob>(`/projects/${projectId}/jobs/${jobId}/retry`, {
        method: 'POST',
      }),

    cancelJob: (projectId: number, jobId: number) =>
      client.request<GitLabJob>(`/projects/${projectId}/jobs/${jobId}/cancel`, {
        method: 'POST',
      }),

    playJob: (projectId: number, jobId: number) =>
      client.request<GitLabJob>(`/projects/${projectId}/jobs/${jobId}/play`, {
        method: 'POST',
      }),

    trigger: (projectId: number, ref: string, variables?: Record<string, string>) =>
      client.request<GitLabPipeline>(`/projects/${projectId}/pipeline`, {
        method: 'POST',
        body: JSON.stringify({
          ref,
          variables: variables
            ? Object.entries(variables).map(([key, value]) => ({ key, value }))
            : undefined,
        }),
      }),
  };
}
