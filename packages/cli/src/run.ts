import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';

export const VERSION = '0.1.0';

export const HELP = `mojimoto — CLI for the Mojimoto headless CMS

Usage:
  mojimoto types [options]       Download generated TypeScript types for your project
  mojimoto add-preview [options] Scaffold the Next.js slice-preview route

Options (types):
  --endpoint <url>      Delivery endpoint        (env: MOJIMOTO_ENDPOINT)
  --project <slug>      Project slug             (env: MOJIMOTO_PROJECT)
  --token <token>       Read API token           (env: MOJIMOTO_TOKEN)
  -o, --output <file>   Output file              (default: mojimoto.generated.ts)

Options (add-preview):
  --app-dir <path>      Next.js app directory    (default: app)
  --client-import <m>   Module exporting \`cms\`    (default: @/lib/cms)
  --components-import <m> Module exporting \`components\` (default: @/cms/sections)
  --force               Overwrite existing files

Common:
  -h, --help            Show this help
  -v, --version         Show the CLI version

Examples:
  MOJIMOTO_TOKEN=… mojimoto types \\
    --endpoint https://mojimoto.com/api/v1 --project decentenergy

  # With MOJIMOTO_ENDPOINT / MOJIMOTO_PROJECT / MOJIMOTO_TOKEN in your env:
  mojimoto types -o types/mojimoto.ts

  # Scaffold app/preview/[type]/[uid]/page.tsx + a components stub:
  mojimoto add-preview
`;

export interface RunIO {
  /** Defaults to the real `fetch`; injectable for tests. */
  fetch?: typeof fetch;
  /** Defaults to writing the file to disk (creating parent dirs); injectable for tests. */
  write?: (path: string, contents: string) => Promise<void>;
  /** Defaults to checking the filesystem; injectable for tests. */
  exists?: (path: string) => boolean | Promise<boolean>;
  /** Defaults to `console.log`. */
  out?: (message: string) => void;
  /** Defaults to `console.error`. */
  err?: (message: string) => void;
  /** Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Defaults to `process.cwd()`. */
  cwd?: string;
}

/**
 * Run the CLI with the given arguments. Returns a process exit code (0 = ok).
 * I/O is injectable so the command can be unit-tested without touching the
 * network or filesystem.
 */
export async function run(argv: string[], io: RunIO = {}): Promise<number> {
  const doFetch = io.fetch ?? fetch;
  const write =
    io.write ??
    (async (path, contents) => {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, contents, 'utf8');
    });
  const exists = io.exists ?? ((path) => existsSync(path));
  const out = io.out ?? ((m) => console.log(m));
  const err = io.err ?? ((m) => console.error(m));
  const env = io.env ?? process.env;
  const cwd = io.cwd ?? process.cwd();

  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      endpoint: { type: 'string' },
      project: { type: 'string' },
      token: { type: 'string' },
      output: { type: 'string', short: 'o' },
      'app-dir': { type: 'string' },
      'client-import': { type: 'string' },
      'components-import': { type: 'string' },
      force: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.version) {
    out(VERSION);
    return 0;
  }

  const command = positionals[0];

  if (values.help || !command) {
    out(HELP);
    return values.help ? 0 : 1;
  }

  if (command === 'add-preview') {
    return addPreview(values, { write, exists, out, err, cwd });
  }

  if (command !== 'types' && command !== 'generate-types') {
    err(`Unknown command: ${command}\nRun \`mojimoto --help\` for usage.`);
    return 1;
  }

  const endpoint = values.endpoint ?? env.MOJIMOTO_ENDPOINT;
  const project = values.project ?? env.MOJIMOTO_PROJECT;
  const token = values.token ?? env.MOJIMOTO_TOKEN;
  const output = values.output ?? 'mojimoto.generated.ts';

  const missing = [
    !endpoint && '--endpoint (or MOJIMOTO_ENDPOINT)',
    !project && '--project (or MOJIMOTO_PROJECT)',
    !token && '--token (or MOJIMOTO_TOKEN)',
  ].filter(Boolean);

  if (missing.length > 0) {
    err(`Missing required option(s):\n  ${missing.join('\n  ')}`);
    return 1;
  }

  const url = `${endpoint!.replace(/\/+$/, '')}/${project}/types`;

  let response: Response;
  try {
    response = await doFetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/typescript, text/plain',
      },
    });
  } catch (error) {
    err(`Could not reach ${url}\n  ${(error as Error).message}`);
    return 1;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    err(`Request failed (${response.status} ${response.statusText}) for ${url}\n${body}`.trimEnd());
    return 1;
  }

  const types = await response.text();
  await write(resolve(cwd, output), types);

  out(`✓ Wrote ${output} for project "${project}" (${types.split('\n').length} lines).`);
  return 0;
}

interface AddPreviewValues {
  'app-dir'?: string;
  'client-import'?: string;
  'components-import'?: string;
  force?: boolean;
}

interface AddPreviewIO {
  write: (path: string, contents: string) => Promise<void>;
  exists: (path: string) => boolean | Promise<boolean>;
  out: (message: string) => void;
  err: (message: string) => void;
  cwd: string;
}

/** The slice-preview page that the CMS screenshots, one section at a time. */
function previewPageSource(clientImport: string, componentsImport: string): string {
  return `import { createSlicePreviewPage } from '@mojimoto/next/preview';
import { cms } from '${clientImport}';
import { components } from '${componentsImport}';

// Renders a single Mojimoto section in isolation so the CMS can screenshot it.
// Point each model's preview path at "/preview/{type}/{uid}".
export default createSlicePreviewPage({ client: cms, components });
`;
}

/** A starter component registry mapping content-type api ids to components. */
function sectionsStubSource(): string {
  return `import type { SliceComponents } from '@mojimoto/react';

// Map each Mojimoto model's api id to the React component that renders it.
// Keys must match your model api ids exactly.
export const components: SliceComponents = {
  // marketing_hero: MarketingHero,
  // content_block: ContentBlock,
  // team_grid: TeamGrid,
};
`;
}

/**
 * Scaffold the Next.js slice-preview route and a components-registry stub. The
 * page path lines up with the CMS preview template "/preview/{type}/{uid}".
 * Existing files are left untouched unless `--force` is passed.
 */
async function addPreview(values: AddPreviewValues, io: AddPreviewIO): Promise<number> {
  const appDir = values['app-dir'] ?? 'app';
  const clientImport = values['client-import'] ?? '@/lib/cms';
  const componentsImport = values['components-import'] ?? '@/cms/sections';
  const force = values.force ?? false;

  const targets = [
    { path: `${appDir}/preview/[type]/[uid]/page.tsx`, contents: previewPageSource(clientImport, componentsImport) },
    { path: 'cms/sections.tsx', contents: sectionsStubSource() },
  ];

  for (const target of targets) {
    const absolute = resolve(io.cwd, target.path);

    if (!force && (await io.exists(absolute))) {
      io.out(`• Skipped ${target.path} (already exists; pass --force to overwrite).`);
      continue;
    }

    await io.write(absolute, target.contents);
    io.out(`✓ Wrote ${target.path}`);
  }

  io.out(
    `\nNext steps:\n` +
      `  1. Fill in ${componentsImport} with your section components.\n` +
      `  2. Ensure ${clientImport} exports a \`cms\` delivery client.\n` +
      `  3. Set each model's preview path to "/preview/{type}/{uid}" and the project's preview base URL in Mojimoto.`,
  );

  return 0;
}
