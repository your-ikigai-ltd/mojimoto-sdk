export interface AgentDocsOptions {
  endpoint: string;
  project: string;
  contentModel?: string;
}

export const MARKER_START = '<!-- mojimoto:start -->';
export const MARKER_END = '<!-- mojimoto:end -->';

function siteRoot(endpoint: string): string {
  return endpoint.replace(/\/api\/v1\/?$/, '');
}

export function mcpUrl({ endpoint, project }: AgentDocsOptions): string {
  return `${siteRoot(endpoint)}/mcp/${project}`;
}

export function llmsTxtUrl(endpoint: string): string {
  return `${siteRoot(endpoint)}/llms.txt`;
}

export function skillMarkdown(options: AgentDocsOptions): string {
  const { endpoint, project } = options;

  return `---
name: mojimoto
description: Read and write content in this project's Mojimoto headless CMS (project "${project}"). Use when fetching content for pages, changing content models, writing or publishing entries, uploading media, or wiring previews and webhooks.
---

# Mojimoto

This site reads its content from Mojimoto, a headless CMS. Project: \`${project}\`. Delivery endpoint: \`${endpoint}\`.

## Before you change anything

1. Read the content model first: \`reference/content-model.md\`, or the MCP resource \`mojimoto://content-model\`.
2. Prefer editing drafts. Publish only when the user asked for it.
3. Never delete published entries or remove fields without the user saying so. Field removal is explicit (\`remove-field-tool\`) and can break the live site.
4. Every write is logged against the token that made it, so the user can see what you changed.
5. For anything this skill doesn't cover (every field type's write format, the full Write API, assets, migrating from Prismic), read \`${llmsTxtUrl(endpoint)}\`. It is Mojimoto's documentation for agents and is kept in step with the API.

## Reading content (delivery API)

\`GET ${endpoint}/${project}/documents\` with \`Authorization: Bearer <read token>\`.

| Query | Meaning |
| --- | --- |
| \`type\` | Content type api id, e.g. \`blog_post\` |
| \`uid\` | One entry by its slug |
| \`lang\` | Locale code, e.g. \`en-gb\` (defaults to the project's default) |
| \`page\`, \`per_page\` | Pagination, \`per_page\` up to 100 |
| \`sort\` | \`id\`, \`uid\`, \`created_at\` or \`updated_at\`; prefix \`-\` for descending |
| \`depth\` | How deep references are resolved inline, 1 to 3 |
| \`ref=preview\` | Drafts instead of published content (needs a token with preview) |

Each result looks like \`{ id, uid, type, lang, status, published_at, updated_at, data: { ...fields } }\`. Read fields from \`data\`.

\`GET ${endpoint}/${project}/types\` returns generated TypeScript types for the whole model.

## In code

Next.js (App Router):

\`\`\`ts
import { createMojimotoClient } from '@mojimoto/next'

export const cms = createMojimotoClient({
  endpoint: process.env.MOJIMOTO_ENDPOINT!,
  project: process.env.MOJIMOTO_PROJECT!,
  token: process.env.MOJIMOTO_TOKEN!,
  revalidate: 60,
  tags: ['cms'],
})

const posts = await cms.all({ type: 'blog_post', sort: '-created_at' })
const post = await cms.byUid('blog_post', 'hello-world')
\`\`\`

Render rich text with \`<MojiRichText field={post.data.body} />\` from \`@mojimoto/react\`. It works in Server Components. Nuxt uses \`@mojimoto/nuxt\`, Vue \`@mojimoto/vue\`, anything else \`@mojimoto/client\`.

Regenerate types after a model change: \`npx @mojimoto/cli types -o mojimoto.generated.ts\`.

## Writing content

Use the MCP server (\`mojimoto\`) when it is connected. Read the \`mojimoto://content-model\` resource first. Its tools: \`list-content-types-tool\`, \`list-documents-tool\`, \`create-document-tool\`, \`update-document-tool\`, \`publish-document-tool\`, \`unpublish-document-tool\`, \`delete-document-tool\`, \`upload-asset-tool\`, \`create-content-type-tool\`, \`update-content-type-tool\`, \`add-field-tool\`, \`update-field-tool\`, \`remove-field-tool\`. Your token may not have all of them: a token can be limited to certain operations and content types.

Without MCP, the write API mirrors them under \`${endpoint}/${project}/manage\`, e.g. \`POST /manage/documents\` with \`{ "type", "uid", "data" }\`, then \`POST /manage/documents/{id}/publish\`.

Field values:
- Rich text accepts HTML (\`<p>\`, \`<h2>\`, \`<strong>\`, \`<a>\`, lists).
- Media fields take \`{ "asset_id": <id> }\` from \`upload-asset-tool\`.
- A reference is a document id; a references field is an ordered list of ids.
- \`page\` types need a \`uid\` (the URL slug). \`single\` types have one entry. \`component\` types are sections other entries reference.

## Modelling

Give a page its sections with a \`blocks\` field: \`config.blocks\` maps each block type to \`{ label, fields }\`, and the value is an ordered list of \`{ "type": "hero", "data": { ... } }\` stored inside the entry. Block fields can be symbol, text, rich_text, number, boolean, date, select, media, location or json. Delivered blocks are \`{ id, type, data }\`, so \`<SliceZone>\` from \`@mojimoto/react\` renders them.

Use a references field pointing at \`component\` entries only for content shared between pages. Don't store page structure in a JSON field.

See \`reference/content-model.md\` for this project's types.
`;
}

export function contentModelMarkdown(options: AgentDocsOptions): string {
  if (!options.contentModel) {
    return `# Content model

Not downloaded yet. Run \`npx @mojimoto/cli init --token <read token>\` again, or read the MCP resource \`mojimoto://content-model\`.
`;
  }

  return `# Content model for "${options.project}"

Generated from the project's TypeScript types. Regenerate with \`npx @mojimoto/cli init --token <read token> --force\`.

\`\`\`ts
${options.contentModel.trim()}
\`\`\`
`;
}

export function projectNote(options: AgentDocsOptions): string {
  return `${MARKER_START}
## Content (Mojimoto)

This site's content comes from the Mojimoto headless CMS, project \`${options.project}\`. Read and write it with the \`mojimoto\` skill (\`.claude/skills/mojimoto/SKILL.md\`) or the \`mojimoto\` MCP server. Read the content model before changing it, keep changes as drafts unless asked to publish, and never delete published content or remove fields without asking. The full API reference for agents is at ${llmsTxtUrl(options.endpoint)}.
${MARKER_END}`;
}

export function cursorRule(options: AgentDocsOptions): string {
  return `---
description: Mojimoto headless CMS - reading and writing this site's content
alwaysApply: false
---

${skillMarkdown(options).replace(/^---[\s\S]*?---\n\n/, '')}`;
}

export function claudeMcpConfig(options: AgentDocsOptions): object {
  return {
    mcpServers: {
      mojimoto: {
        type: 'http',
        url: mcpUrl(options),
        headers: { Authorization: 'Bearer ${MOJIMOTO_WRITE_TOKEN}' },
      },
    },
  };
}

export function cursorMcpConfig(options: AgentDocsOptions): object {
  return {
    mcpServers: {
      mojimoto: {
        url: mcpUrl(options),
        headers: { Authorization: 'Bearer ${env:MOJIMOTO_WRITE_TOKEN}' },
      },
    },
  };
}

/** Replace an existing marked section, or append one. */
export function upsertSection(existing: string, section: string): string {
  const start = existing.indexOf(MARKER_START);
  const end = existing.indexOf(MARKER_END);

  if (start !== -1 && end > start) {
    return existing.slice(0, start) + section + existing.slice(end + MARKER_END.length);
  }

  const separator = existing.length === 0 || existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';

  return `${existing}${separator}${section}\n`;
}

/** Add the mojimoto server to an MCP config, keeping every other server. */
export function mergeMcpConfig(existing: string | null, addition: { mcpServers: Record<string, unknown> }): string {
  const parsed = existing ? JSON.parse(existing) : {};
  const servers = { ...(parsed.mcpServers ?? {}), ...addition.mcpServers };

  return `${JSON.stringify({ ...parsed, mcpServers: servers }, null, 2)}\n`;
}
