import { createContext, useContext, useMemo, type ReactNode, createElement } from 'react';
import { createApiClient } from './client';
import { createProjectsApi } from './projects';
import { createIssuesApi } from './issues';
import { createMergeRequestsApi } from './mergeRequests';
import { createPipelinesApi } from './pipelines';
import { createRepositoryApi } from './repository';
import { createUsersApi } from './users';
import { createGroupsApi } from './groups';
import { createSearchApi } from './search';
import { createTodosApi } from './todos';
import { createWikiApi } from './wiki';
import { useAuthStore } from '../store/auth';

export type GitLabApi = ReturnType<typeof createAllApis>;

function createAllApis(host: string, token: string) {
  const client = createApiClient({ host, token });
  return {
    client,
    projects: createProjectsApi(client),
    issues: createIssuesApi(client),
    mergeRequests: createMergeRequestsApi(client),
    pipelines: createPipelinesApi(client),
    repository: createRepositoryApi(client),
    users: createUsersApi(client),
    groups: createGroupsApi(client),
    search: createSearchApi(client),
    todos: createTodosApi(client),
    wiki: createWikiApi(client),
  };
}

const ApiContext = createContext<GitLabApi | null>(null);

export function ApiProvider({ children }: { children: ReactNode }) {
  const { token, host } = useAuthStore();

  const api = useMemo(() => {
    if (!token || !host) return null;
    return createAllApis(host, token);
  }, [token, host]);

  return createElement(ApiContext.Provider, { value: api }, children);
}

export function useApi(): GitLabApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used within ApiProvider with a valid token');
  return api;
}

export function useOptionalApi(): GitLabApi | null {
  return useContext(ApiContext);
}
