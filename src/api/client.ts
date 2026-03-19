export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiConfig {
  host: string;
  token: string;
}

export type RequestParams = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions extends Omit<RequestInit, 'headers'> {
  params?: RequestParams;
  headers?: Record<string, string>;
}

function buildUrl(base: string, path: string, params?: RequestParams): string {
  const url = new URL(`${base}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function parseLinkHeader(link: string | null): Record<string, string> {
  if (!link) return {};
  const result: Record<string, string> = {};
  link.split(',').forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) result[match[2]] = match[1];
  });
  return result;
}

export interface PaginationMeta {
  nextPage: number | null;
  prevPage: number | null;
  totalPages: number | null;
  total: number | null;
  nextUrl: string | null;
}

export interface PagedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function createApiClient(config: ApiConfig) {
  const base = `${config.host.replace(/\/$/, '')}/api/v4`;

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers = {}, ...init } = options;
    const url = buildUrl(base, path, params);

    const res = await fetch(url, {
      ...init,
      headers: {
        'PRIVATE-TOKEN': config.token,
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        message = data.message || data.error || message;
      } catch { /* ignore */ }
      throw new ApiError(res.status, message);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  async function requestPaged<T>(path: string, options: RequestOptions = {}): Promise<PagedResult<T>> {
    const { params, headers = {}, ...init } = options;
    const url = buildUrl(base, path, params);

    const res = await fetch(url, {
      ...init,
      headers: {
        'PRIVATE-TOKEN': config.token,
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        message = data.message || data.error || message;
      } catch { /* ignore */ }
      throw new ApiError(res.status, message);
    }

    const links = parseLinkHeader(res.headers.get('link'));
    const nextUrl = links.next ?? null;

    const toInt = (v: string | null) => (v ? parseInt(v, 10) : null);
    const getPageFromUrl = (u: string | null): number | null => {
      if (!u) return null;
      try {
        return parseInt(new URL(u).searchParams.get('page') ?? '', 10) || null;
      } catch { return null; }
    };

    const items = (await res.json()) as T[];
    return {
      items,
      pagination: {
        nextPage: toInt(res.headers.get('x-next-page')) ?? getPageFromUrl(nextUrl),
        prevPage: toInt(res.headers.get('x-prev-page')),
        totalPages: toInt(res.headers.get('x-total-pages')),
        total: toInt(res.headers.get('x-total')),
        nextUrl,
      },
    };
  }

  async function requestText(path: string, options: RequestOptions = {}): Promise<string> {
    const { params, headers = {}, ...init } = options;
    const url = buildUrl(base, path, params);

    const res = await fetch(url, {
      ...init,
      headers: { 'PRIVATE-TOKEN': config.token, ...headers },
    });

    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return res.text();
  }

  async function fetchBlob(path: string, params?: RequestParams): Promise<Blob> {
    const url = buildUrl(base, path, params);
    const res = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': config.token },
    });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    return res.blob();
  }

  return { request, requestPaged, requestText, fetchBlob, base, token: config.token };
}

export type GitLabApiClient = ReturnType<typeof createApiClient>;
