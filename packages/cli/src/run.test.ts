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
      exists: () => false,
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

  describe('add-preview', () => {
    it('scaffolds the preview page and a components stub', async () => {
      const { logs, writes, opts } = io();

      expect(await run(['add-preview'], opts)).toBe(0);

      const page = writes.find((w) => w.path === '/work/app/preview/[type]/[uid]/page.tsx');
      const sections = writes.find((w) => w.path === '/work/cms/sections.tsx');

      expect(page?.contents).toContain("from '@mojimoto/next/preview'");
      expect(page?.contents).toContain("import { cms } from '@/lib/cms'");
      expect(page?.contents).toContain("import { components } from '@/cms/sections'");
      expect(sections?.contents).toContain('export const components: SliceComponents');
      expect(logs.join('\n')).toContain('Next steps:');
    });

    it('honours custom import paths and app dir', async () => {
      const { writes, opts } = io();

      await run(
        ['add-preview', '--app-dir', 'src/app', '--client-import', '~/cms', '--components-import', '~/sections'],
        opts,
      );

      const page = writes.find((w) => w.path === '/work/src/app/preview/[type]/[uid]/page.tsx');
      expect(page?.contents).toContain("import { cms } from '~/cms'");
      expect(page?.contents).toContain("import { components } from '~/sections'");
    });

    it('skips existing files unless --force is passed', async () => {
      const existing = io({ exists: () => true });
      expect(await run(['add-preview'], existing.opts)).toBe(0);
      expect(existing.writes).toHaveLength(0);
      expect(existing.logs.join('\n')).toContain('Skipped');

      const forced = io({ exists: () => true });
      await run(['add-preview', '--force'], forced.opts);
      expect(forced.writes).toHaveLength(2);
    });
  });
});
