import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api';
import { groupStages } from '../utils/pipelineStages';
import type { PipelineStatus } from '../types/gitlab';

const ACTIVE: PipelineStatus[] = ['running', 'pending', 'preparing', 'waiting_for_resource', 'created'];

/**
 * Jobs and trigger jobs of one pipeline, grouped into ordered stages.
 * Polls while the pipeline is still active.
 */
export function usePipelineStages(projectId: number, pipelineId: number, options: { enabled?: boolean; status?: PipelineStatus } = {}) {
  const api = useApi();
  const { enabled = true, status } = options;

  const query = useQuery({
    queryKey: ['pipeline-stages', projectId, pipelineId],
    queryFn: async () => {
      const [jobs, bridges] = await Promise.all([
        api.pipelines.getAllJobs(projectId, pipelineId),
        api.pipelines.getAllBridges(projectId, pipelineId),
      ]);
      return { jobs, bridges, stages: groupStages(jobs, bridges) };
    },
    enabled,
    refetchInterval: (q) => {
      const live = status
        ? ACTIVE.includes(status)
        : q.state.data?.stages.some((s) => ACTIVE.includes(s.status));
      return live ? 10000 : false;
    },
  });

  return query;
}
