import { describe, expect, it, vi } from 'vitest';
import { run } from './run';
import { MARKER_START } from './agent-docs';

function memoryFs(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const logs: string[] = [];
  const errors: string[] = [];

  return {
    files,
    logs,
    errors,
    io: {
      out: (message: string) => logs.push(message),
      err: (message: string) => errors.push(message),
      write: async (path: string, contents: string) => {
        files.set(path, contents);
      },
      read: async (path: string) => files.get(path) ?? null,
      exists: (path: string) => files.has(path),
      env: {},
      cwd: '/site',
      fetch: vi.fn().mockResolvedValue(new Response('export interface BlogPostData { title: string }', { status: 200 })),
    },
  };
}

describe('init', () => {
  it('needs a project', async () => {
    const fs = memoryFs();

    expect(await run(['init'], fs.io)).toBe(1);
    expect(fs.errors.join()).toContain('--project');
  });

  it('rejects unknown agents', async () => {
    const fs = memoryFs();

    expect(await run(['init', '--project', 'my-site', '--agent', 'claude,emacs'], fs.io)).toBe(1);
    expect(fs.errors.join()).toContain('emacs');
  });

  it('sets up every agent by default', async () => {
    const fs = memoryFs();

    expect(await run(['init', '--project', 'my-site'], fs.io)).toBe(0);

    expect([...fs.files.keys()].sort()).toEqual([
      '/site/.claude/skills/mojimoto/SKILL.md',
      '/site/.claude/skills/mojimoto/reference/content-model.md',
      '/site/.cursor/mcp.json',
      '/site/.cursor/rules/mojimoto.mdc',
      '/site/.mcp.json',
      '/site/AGENTS.md',
      '/site/CLAUDE.md',
    ]);

    expect(fs.files.get('/site/.claude/skills/mojimoto/SKILL.md')).toContain('Project: `my-site`');
    expect(fs.io.fetch).not.toHaveBeenCalled();
  });

  it('includes the content model when given a read token', async () => {
    const fs = memoryFs();

    await run(['init', '--project', 'my-site', '--agent', 'claude', '--token', 'mjmt_read'], fs.io);

    expect(fs.io.fetch).toHaveBeenCalledWith('https://mojimoto.com/api/v1/my-site/types', expect.anything());
    expect(fs.files.get('/site/.claude/skills/mojimoto/reference/content-model.md')).toContain('BlogPostData');
  });

  it('never writes a token to disk', async () => {
    const fs = memoryFs();

    await run(['init', '--project', 'my-site', '--token', 'mjmt_secret_read'], fs.io);

    for (const contents of fs.files.values()) {
      expect(contents).not.toContain('mjmt_secret_read');
    }

    expect(JSON.parse(fs.files.get('/site/.mcp.json')!).mcpServers.mojimoto).toEqual({
      type: 'http',
      url: 'https://mojimoto.com/mcp/my-site',
      headers: { Authorization: 'Bearer ${MOJIMOTO_WRITE_TOKEN}' },
    });
  });

  it('keeps existing MCP servers and notes, and does not duplicate on a second run', async () => {
    const fs = memoryFs({
      '/site/.mcp.json': JSON.stringify({ mcpServers: { github: { type: 'http', url: 'https://example.com' } } }),
      '/site/CLAUDE.md': '# My site\n\nUse pnpm.\n',
    });

    await run(['init', '--project', 'my-site', '--agent', 'claude'], fs.io);
    await run(['init', '--project', 'my-site', '--agent', 'claude'], fs.io);

    const servers = JSON.parse(fs.files.get('/site/.mcp.json')!).mcpServers;
    expect(Object.keys(servers).sort()).toEqual(['github', 'mojimoto']);

    const claudeMd = fs.files.get('/site/CLAUDE.md')!;
    expect(claudeMd.startsWith('# My site\n\nUse pnpm.\n')).toBe(true);
    expect(claudeMd.split(MARKER_START)).toHaveLength(2);
  });

  it('leaves an edited skill alone unless forced', async () => {
    const fs = memoryFs({ '/site/.claude/skills/mojimoto/SKILL.md': 'my edits' });

    await run(['init', '--project', 'my-site', '--agent', 'claude'], fs.io);
    expect(fs.files.get('/site/.claude/skills/mojimoto/SKILL.md')).toBe('my edits');

    await run(['init', '--project', 'my-site', '--agent', 'claude', '--force'], fs.io);
    expect(fs.files.get('/site/.claude/skills/mojimoto/SKILL.md')).toContain('# Mojimoto');
  });

  it('does not break an MCP config it cannot parse', async () => {
    const fs = memoryFs({ '/site/.cursor/mcp.json': '{ not json' });

    expect(await run(['init', '--project', 'my-site', '--agent', 'cursor'], fs.io)).toBe(0);
    expect(fs.files.get('/site/.cursor/mcp.json')).toBe('{ not json');
    expect(fs.errors.join()).toContain('.cursor/mcp.json');
  });
});
