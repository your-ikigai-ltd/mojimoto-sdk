import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

export const VERSION = '0.1.0';

export const HELP = `mojimoto — CLI for the Mojimoto headless CMS

Usage:
  mojimoto types [options]       Download generated TypeScript types for your project

Options:
  --endpoint <url>      Delivery endpoint        (env: MOJIMOTO_ENDPOINT)
  --project <slug>      Project slug             (env: MOJIMOTO_PROJECT)
  --token <token>       Read API token           (env: MOJIMOTO_TOKEN)
  -o, --output <file>   Output file              (default: mojimoto.generated.ts)
  -h, --help            Show this help
  -v, --version         Show the CLI version

Examples:
  MOJIMOTO_TOKEN=… mojimoto types \\
    --endpoint https://mojimoto.com/api/v1 --project decentenergy

  # With MOJIMOTO_ENDPOINT / MOJIMOTO_PROJECT / MOJIMOTO_TOKEN in your env:
  mojimoto types -o types/mojimoto.ts
`;

export interface RunIO {
  /** Defaults to the real `fetch`; injectable for tests. */
  fetch?: typeof fetch;
  /** Defaults to writing the file to disk; injectable for tests. */
  write?: (path: string, contents: string) => Promise<void>;
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
  const write = io.write ?? ((path, contents) => writeFile(path, contents, 'utf8'));
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
