import { useQuery } from '@tanstack/react-query';
import { useApi } from '../api';

export interface TokenPermissions {
  /** Full API access — create/update/delete anything */
  canWrite: boolean;
  /** Can read repository contents (files, tree, archive) */
  canReadRepo: boolean;
  /** Can write to repository (create/delete branches, push) */
  canWriteRepo: boolean;
  /** Can read API data (projects, issues, MRs, pipelines, etc.) */
  canReadApi: boolean;
  /** Raw scopes array from the token */
  scopes: string[];
  /** False while the token info is still loading */
  isLoaded: boolean;
  /** Token name for display */
  tokenName: string;
  /** Token expiry */
  expiresAt: string | null;
}

export function useTokenPermissions(): TokenPermissions {
  const api = useApi();

  const { data } = useQuery({
    queryKey: ['token-info'],
    queryFn: () => api.users.getTokenInfo(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const scopes = data?.scopes ?? [];

  return {
    canWrite: scopes.includes('api'),
    canReadRepo: scopes.includes('api') || scopes.includes('read_repository') || scopes.includes('read_api'),
    canWriteRepo: scopes.includes('api') || scopes.includes('write_repository'),
    canReadApi: scopes.includes('api') || scopes.includes('read_api'),
    scopes,
    isLoaded: !!data,
    tokenName: data?.name ?? '',
    expiresAt: data?.expires_at ?? null,
  };
}
