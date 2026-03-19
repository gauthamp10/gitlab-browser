import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiClient, ApiError } from '../../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function makeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
    blob: () => Promise.resolve(new Blob([String(body)])),
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
  });
}

const HOST = 'https://gitlab.example.com';
const TOKEN = 'glpat-test-token-123';

beforeEach(() => {
  vi.stubGlobal('fetch', makeFetch(200, { id: 1 }));
});

// ─────────────────────────────────────────────────────────────────────────────
// base URL construction
// ─────────────────────────────────────────────────────────────────────────────
describe('createApiClient — base URL', () => {
  it('sets base to host/api/v4', () => {
    const client = createApiClient({ host: HOST, token: TOKEN });
    expect(client.base).toBe('https://gitlab.example.com/api/v4');
  });

  it('strips trailing slash from host', () => {
    const client = createApiClient({ host: `${HOST}/`, token: TOKEN });
    expect(client.base).toBe('https://gitlab.example.com/api/v4');
  });

  it('does NOT expose token as a public property', () => {
    const client = createApiClient({ host: HOST, token: TOKEN });
    expect((client as Record<string, unknown>).token).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// request — PRIVATE-TOKEN header
// ─────────────────────────────────────────────────────────────────────────────
describe('createApiClient.request — token header', () => {
  it('always sends PRIVATE-TOKEN in the request header', async () => {
    const fetchMock = makeFetch(200, { id: 1 });
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ host: HOST, token: TOKEN });
    await client.request('/projects/1');
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit & { headers: Record<string, string> }).headers['PRIVATE-TOKEN']).toBe(TOKEN);
  });

  it('never embeds the token in the URL query string', async () => {
    const fetchMock = makeFetch(200, { id: 1 });
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ host: HOST, token: TOKEN });
    await client.request('/projects/1');
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('private_token');
    expect(String(url)).not.toContain(TOKEN);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// request — HTTP error handling
// ─────────────────────────────────────────────────────────────────────────────
describe('createApiClient.request — error handling', () => {
  it('throws ApiError with correct status on 401', async () => {
    vi.stubGlobal('fetch', makeFetch(401, { message: 'Unauthorized' }));
    const client = createApiClient({ host: HOST, token: 'bad-token' });
    await expect(client.request('/user')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
  });

  it('throws ApiError with correct status on 404', async () => {
    vi.stubGlobal('fetch', makeFetch(404, { message: 'Not Found' }));
    const client = createApiClient({ host: HOST, token: TOKEN });
    await expect(client.request('/projects/999')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('uses the API error message from the response body', async () => {
    vi.stubGlobal('fetch', makeFetch(403, { message: 'Forbidden - missing scope' }));
    const client = createApiClient({ host: HOST, token: TOKEN });
    try {
      await client.request('/projects/1');
    } catch (e) {
      expect((e as ApiError).message).toBe('Forbidden - missing scope');
    }
  });

  it('falls back to HTTP <status> message when body has no message field', async () => {
    vi.stubGlobal('fetch', makeFetch(500, {}));
    const client = createApiClient({ host: HOST, token: TOKEN });
    try {
      await client.request('/projects/1');
    } catch (e) {
      expect((e as ApiError).message).toBe('HTTP 500');
    }
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', makeFetch(204, null));
    const client = createApiClient({ host: HOST, token: TOKEN });
    const result = await client.request('/projects/1/star');
    expect(result).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// request — query parameters
// ─────────────────────────────────────────────────────────────────────────────
describe('createApiClient.request — query params', () => {
  it('appends params to the URL', async () => {
    const fetchMock = makeFetch(200, []);
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ host: HOST, token: TOKEN });
    await client.request('/projects', { params: { page: 2, per_page: 20 } });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('page=2');
    expect(String(url)).toContain('per_page=20');
  });

  it('omits undefined params', async () => {
    const fetchMock = makeFetch(200, []);
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ host: HOST, token: TOKEN });
    await client.request('/projects', { params: { state: undefined, search: 'foo' } });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('state');
    expect(String(url)).toContain('search=foo');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requestPaged — pagination metadata
// ─────────────────────────────────────────────────────────────────────────────
describe('createApiClient.requestPaged — pagination', () => {
  it('parses x-next-page and x-total headers', async () => {
    vi.stubGlobal('fetch', makeFetch(200, [{ id: 1 }], {
      'x-next-page': '2',
      'x-prev-page': '',
      'x-total-pages': '5',
      'x-total': '98',
    }));
    const client = createApiClient({ host: HOST, token: TOKEN });
    const result = await client.requestPaged('/projects');
    expect(result.pagination.nextPage).toBe(2);
    expect(result.pagination.totalPages).toBe(5);
    expect(result.pagination.total).toBe(98);
  });

  it('parses Link header for next URL when x-next-page is absent', async () => {
    const nextUrl = 'https://gitlab.example.com/api/v4/projects?page=3';
    vi.stubGlobal('fetch', makeFetch(200, [], {
      link: `<${nextUrl}>; rel="next"`,
    }));
    const client = createApiClient({ host: HOST, token: TOKEN });
    const result = await client.requestPaged('/projects');
    expect(result.pagination.nextUrl).toBe(nextUrl);
    expect(result.pagination.nextPage).toBe(3);
  });

  it('returns null pagination when headers are absent', async () => {
    vi.stubGlobal('fetch', makeFetch(200, []));
    const client = createApiClient({ host: HOST, token: TOKEN });
    const result = await client.requestPaged('/projects');
    expect(result.pagination.nextPage).toBeNull();
    expect(result.pagination.total).toBeNull();
  });

  it('returns items array from the response body', async () => {
    vi.stubGlobal('fetch', makeFetch(200, [{ id: 1 }, { id: 2 }]));
    const client = createApiClient({ host: HOST, token: TOKEN });
    const result = await client.requestPaged('/projects');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ id: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchBlob — token header, no token in URL
// ─────────────────────────────────────────────────────────────────────────────
describe('createApiClient.fetchBlob', () => {
  it('sends PRIVATE-TOKEN header', async () => {
    const fetchMock = makeFetch(200, 'binary-data');
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ host: HOST, token: TOKEN });
    await client.fetchBlob('/projects/1/repository/archive.zip', { ref: 'main' });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit & { headers: Record<string, string> }).headers['PRIVATE-TOKEN']).toBe(TOKEN);
  });

  it('does NOT include private_token in the URL', async () => {
    const fetchMock = makeFetch(200, 'binary-data');
    vi.stubGlobal('fetch', fetchMock);
    const client = createApiClient({ host: HOST, token: TOKEN });
    await client.fetchBlob('/projects/1/repository/archive.zip', { ref: 'main' });
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('private_token');
  });

  it('throws ApiError on non-200 response', async () => {
    vi.stubGlobal('fetch', makeFetch(403, 'forbidden'));
    const client = createApiClient({ host: HOST, token: TOKEN });
    await expect(
      client.fetchBlob('/projects/1/repository/archive.zip')
    ).rejects.toMatchObject({ status: 403 });
  });
});
