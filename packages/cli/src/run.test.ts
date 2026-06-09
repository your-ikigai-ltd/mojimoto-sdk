import { describe, expect, it, vi } from 'vitest';
import { run, VERSION } from './run';

function io(overrides: Parameters<typeof run>[1] = {}) {
  const logs: string[] = [];
  const errors: string[] = [];
  const writes: Array<{ path: string; contents: string }> = [];
  return {
    logs,
    errors,
    writes,
    opts: {
      out: (m: string) => logs.push(m),
      err: (m: string) => errors.push(m),
      write: async (path: string, contents: string) => {
        writes.push({ path, contents });
      },
      env: {},
      cwd: '/work',
      ...overrides,
    },
  };
}

const okFetch = (body = 'export interface FooData {}') =>
  vi.fn().mockResolvedValue(new Response(body, { status: 200 }));

describe('cli run', () => {
  it('prints the version', async () => {
    const { logs, opts } = io();
    expect(await run(['--version'], opts)).toBe(0);
    expect(logs[0]).toBe(VERSION);
  });

  it('prints help and exits non-zero when no command is given', async () => {
    const { logs, opts } = io();
    expect(await run([], opts)).toBe(1);
    expect(logs[0]).toContain('Usage:');
  });

  it('errors on unknown command', async () => {
    const { errors, opts } = io();
    expect(await run(['frobnicate'], opts)).toBe(1);
    expect(errors[0]).toContain('Unknown command');
  });

  it('reports missing required options', async () => {
    const { errors, opts } = io();
    expect(await run(['types'], opts)).toBe(1);
    expect(errors[0]).toContain('Missing required option');
  });

  it('fetches types and writes them to the output file', async () => {
    const fetch = okFetch('export interface MarketingPageData {}');
    const { logs, writes, opts } = io({ fetch });

    const code = await run(
      ['types', '--endpoint', 'https://cms.test/api/v1/', '--project', 'demo', '--token', 'secret', '-o', 'gen/types.ts'],
      opts,
    );

    expect(code).toBe(0);
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://cms.test/api/v1/demo/types');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer secret' });
    expect(writes[0]).toEqual({ path: '/work/gen/types.ts', contents: 'export interface MarketingPageData {}' });
    expect(logs[0]).toContain('gen/types.ts');
  });

  it('reads config from the environment', async () => {
    const fetch = okFetch();
    const { writes, opts } = io({
      fetch,
      env: { MOJIMOTO_ENDPOINT: 'https://cms.test/api/v1', MOJIMOTO_PROJECT: 'demo', MOJIMOTO_TOKEN: 'secret' },
    });

    expect(await run(['types'], opts)).toBe(0);
    expect(writes[0]!.path).toBe('/work/mojimoto.generated.ts');
  });

  it('surfaces HTTP errors', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('forbidden', { status: 403, statusText: 'Forbidden' }));
    const { errors, opts } = io({ fetch });

    const code = await run(['types', '--endpoint', 'https://cms.test/api/v1', '--project', 'demo', '--token', 'bad'], opts);
    expect(code).toBe(1);
    expect(errors[0]).toContain('403');
  });
});
