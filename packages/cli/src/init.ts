import { resolve } from 'node:path';
import {
  type AgentDocsOptions,
  claudeMcpConfig,
  contentModelMarkdown,
  cursorMcpConfig,
  cursorRule,
  mcpUrl,
  mergeMcpConfig,
  projectNote,
  skillMarkdown,
  upsertSection,
} from './agent-docs';

export const AGENTS = ['claude', 'cursor', 'codex'] as const;

export type Agent = (typeof AGENTS)[number];

export interface InitValues {
  endpoint?: string;
  project?: string;
  token?: string;
  agent?: string;
  force?: boolean;
}

export interface InitIO {
  fetch: typeof fetch;
  write: (path: string, contents: string) => Promise<void>;
  read: (path: string) => Promise<string | null>;
  out: (message: string) => void;
  err: (message: string) => void;
  env: NodeJS.ProcessEnv;
  cwd: string;
}

function parseAgents(value: string | undefined): Agent[] | string {
  if (!value || value === 'all') {
    return [...AGENTS];
  }

  const requested = value.split(',').map((agent) => agent.trim().toLowerCase());
  const unknown = requested.filter((agent) => !(AGENTS as readonly string[]).includes(agent));

  if (unknown.length > 0) {
    return `Unknown agent(s): ${unknown.join(', ')}. Choose from ${AGENTS.join(', ')} or all.`;
  }

  return requested as Agent[];
}

async function downloadContentModel(options: AgentDocsOptions, token: string, io: InitIO): Promise<string | undefined> {
  const url = `${options.endpoint}/${options.project}/types`;

  try {
    const response = await io.fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/typescript, text/plain' },
    });

    if (!response.ok) {
      io.err(`• Could not download the content model (${response.status}). The skill will tell the agent to use list-content-types instead.`);

      return undefined;
    }

    return await response.text();
  } catch (error) {
    io.err(`• Could not reach ${url}: ${(error as Error).message}`);

    return undefined;
  }
}

export async function init(values: InitValues, io: InitIO): Promise<number> {
  const endpoint = (values.endpoint ?? io.env.MOJIMOTO_ENDPOINT ?? 'https://mojimoto.com/api/v1').replace(/\/+$/, '');
  const project = values.project ?? io.env.MOJIMOTO_PROJECT;
  const token = values.token ?? io.env.MOJIMOTO_TOKEN;

  if (!project) {
    io.err('Missing --project (or MOJIMOTO_PROJECT): the project slug from its URL in Mojimoto.');

    return 1;
  }

  const agents = parseAgents(values.agent);

  if (typeof agents === 'string') {
    io.err(agents);

    return 1;
  }

  const options: AgentDocsOptions = { endpoint, project };

  if (token) {
    options.contentModel = await downloadContentModel(options, token, io);
  }

  const writeFile = async (path: string, contents: string, { overwrite }: { overwrite: boolean }) => {
    const absolute = resolve(io.cwd, path);
    const existing = await io.read(absolute);

    if (existing !== null && !overwrite) {
      io.out(`• Skipped ${path} (already exists; pass --force to overwrite).`);

      return;
    }

    await io.write(absolute, contents);
    io.out(`✓ Wrote ${path}`);
  };

  const upsertNote = async (path: string) => {
    const absolute = resolve(io.cwd, path);
    const existing = (await io.read(absolute)) ?? '';

    await io.write(absolute, upsertSection(existing, projectNote(options)));
    io.out(`✓ Updated ${path}`);
  };

  const mergeMcp = async (path: string, addition: object) => {
    const absolute = resolve(io.cwd, path);
    const existing = await io.read(absolute);

    try {
      await io.write(absolute, mergeMcpConfig(existing, addition as { mcpServers: Record<string, unknown> }));
      io.out(`✓ Added the mojimoto server to ${path}`);
    } catch {
      io.err(`• Skipped ${path}: it isn't valid JSON, so add the mojimoto server by hand.`);
    }
  };

  const overwrite = values.force ?? false;

  if (agents.includes('claude')) {
    await writeFile('.claude/skills/mojimoto/SKILL.md', skillMarkdown(options), { overwrite });
    await writeFile('.claude/skills/mojimoto/reference/content-model.md', contentModelMarkdown(options), { overwrite: overwrite || Boolean(options.contentModel) });
    await upsertNote('CLAUDE.md');
    await mergeMcp('.mcp.json', claudeMcpConfig(options));
  }

  if (agents.includes('cursor')) {
    await writeFile('.cursor/rules/mojimoto.mdc', cursorRule(options), { overwrite });
    await mergeMcp('.cursor/mcp.json', cursorMcpConfig(options));
  }

  if (agents.includes('codex')) {
    await upsertNote('AGENTS.md');
  }

  io.out(
    `\nNext steps:\n` +
      `  1. In Mojimoto, open the project's API keys page and create a token with write access.\n` +
      `  2. Export it before starting your agent: export MOJIMOTO_WRITE_TOKEN=<token>\n` +
      `     The MCP config reads it from the environment, so it never sits in your repo.\n` +
      `  3. MCP server: ${mcpUrl(options)}`,
  );

  return 0;
}
