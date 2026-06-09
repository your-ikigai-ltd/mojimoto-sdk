# @mojimoto/client

Typed, dependency-light client for the **Mojimoto** content delivery API. Works in any
environment with `fetch` (Node 18+, browsers, edge runtimes, Deno, Bun).

```bash
npm i @mojimoto/client
```

## Create a client

```ts
import { createClient } from '@mojimoto/client';

const cms = createClient({
  endpoint: 'https://cms.yourikigai.co.uk/api/v1', // your delivery endpoint
  project: 'decentenergy',                          // project slug
  token: process.env.MOJIMOTO_TOKEN!,               // read token
});
```

### Options

| Option | Type | Description |
| --- | --- | --- |
| `endpoint` | `string` | **Required.** Base delivery endpoint (no trailing project slug). |
| `project` | `string` | **Required.** Project slug. |
| `token` | `string` | **Required.** Read token (`preview` ability for drafts). |
| `lang` | `string` | Default locale applied when a call omits one. |
| `preview` | `boolean` | Request drafts (`?ref=preview`) by default. |
| `fetch` | `typeof fetch` | Custom fetch (e.g. for Node < 18 or instrumentation). |
| `headers` | `Record<string,string>` | Extra headers merged into every request. |

## Methods

```ts
// List a single page; returns the full paginated envelope.
const { results, total_pages } = await cms.query({ type: 'blog_post', page: 1, perPage: 20 });

// Fetch every page and flatten (uses per_page=100 internally).
const allPosts = await cms.all({ type: 'blog_post' });

// First match for a query, or null.
const latest = await cms.first({ type: 'blog_post' });

// First document of a type with a given uid, or null.
const home = await cms.byUid('marketing_page', 'home');

// A single document by numeric id (throws MojimotoError if missing).
const doc = await cms.byId(42);
```

Every method accepts per-call `lang`, `preview`, and an `AbortSignal`:

```ts
const controller = new AbortController();
const posts = await cms.query({ type: 'blog_post', lang: 'fr-fr', signal: controller.signal });
```

## Typed documents

Pair with the per-project types from `php artisan mojimoto:generate-types`:

```ts
import type { MojimotoDocument } from '@mojimoto/client';
import type { BlogPostData } from './mojimoto.generated';

type BlogPost = MojimotoDocument<'blog_post', BlogPostData>;

const post = await cms.byUid<BlogPost>('blog_post', 'why-switch');
post?.data.title; // ✅ fully typed, including resolved references
```

### Resolved references

`reference` / `references` fields arrive already resolved to the linked document's `data`
(one level deep). Type them with `MojiReference`:

```ts
import type { MojiReference, MojimotoDocument } from '@mojimoto/client';

interface PageData {
  author: MojiReference<MojimotoDocument<'author', AuthorData>>;
  related: MojiReference<MojimotoDocument<'blog_post', BlogPostData>>[];
}
```

## Error handling

Non-2xx responses throw a `MojimotoError`:

```ts
import { MojimotoError } from '@mojimoto/client';

try {
  await cms.byId(999999);
} catch (err) {
  if (err instanceof MojimotoError) {
    console.error(err.status, err.body); // e.g. 404, { message: '…' }
  }
}
```

The token is never included in `err.url`.

## License

MIT © Your Ikigai Ltd
