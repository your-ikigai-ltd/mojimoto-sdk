import { describe, expect, it, vi } from 'vitest';
import { createClient } from './client';
import { MojimotoError } from './error';
import type { MojimotoListResponse } from './types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function page(results: unknown[], page: number, totalPages: number): MojimotoListResponse {
  return {
    results: results as never,
    page,
    per_page: 100,
    total_results: totalPages * 100,
    total_pages: totalPages,
    lang: 'en-gb',
    ref: 'published',
  };
}

const base = {
  endpoint: 'https://cms.test/api/v1',
  project: 'demo',
  token: 'secret-token',
};

describe('createClient', () => {
  it('validates required options', () => {
    expect(() => createClient({ ...base, endpoint: '' })).toThrow(/endpoint/);
    expect(() => createClient({ ...base, project: '' })).toThrow(/project/);
    expect(() => createClient({ ...base, token: '' })).toThrow(/token/);
  });

  it('builds query URLs with filters and auth header', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(page([], 1, 1)));
    const cms = createClient({ ...base, fetch, lang: 'en-gb' });

    await cms.query({ type: 'page', uid: 'home', perPage: 5 });

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://cms.test/api/v1/demo/documents?type=page&uid=home&lang=en-gb&per_page=5');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret-token' });
  });

  it('adds ref=preview when preview is enabled', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(page([], 1, 1)));
    const cms = createClient({ ...base, fetch, preview: true });
    await cms.query({ type: 'page' });
    expect(fetch.mock.calls[0]![0]).toContain('ref=preview');
  });

  it('byUid returns the first result or null', async () => {
    const doc = { id: 1, uid: 'home', type: 'page', lang: 'en-gb', status: 'published', published_at: null, updated_at: '', data: {} };
    const fetch = vi.fn().mockResolvedValue(jsonResponse(page([doc], 1, 1)));
    const cms = createClient({ ...base, fetch });
    expect(await cms.byUid('page', 'home')).toEqual(doc);

    fetch.mockResolvedValueOnce(jsonResponse(page([], 1, 1)));
    expect(await cms.byUid('page', 'missing')).toBeNull();
  });

  it('all() follows pagination to the last page', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(page([{ id: 1 }, { id: 2 }], 1, 2)))
      .mockResolvedValueOnce(jsonResponse(page([{ id: 3 }], 2, 2)));
    const cms = createClient({ ...base, fetch });
    const all = await cms.all({ type: 'page' });
    expect(all.map((d) => (d as { id: number }).id)).toEqual([1, 2, 3]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws MojimotoError with redacted url on non-2xx', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ message: 'nope' }, 403)));
    const cms = createClient({ ...base, fetch });
    await expect(cms.query()).rejects.toMatchObject({
      name: 'MojimotoError',
      status: 403,
      body: { message: 'nope' },
    });
    await expect(cms.query()).rejects.toBeInstanceOf(MojimotoError);
  });
});
