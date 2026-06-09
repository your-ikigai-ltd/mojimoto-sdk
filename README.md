# Mojimoto SDK

Official client SDK and framework component libraries for the **[Mojimoto](https://yourikigai.co.uk)** headless CMS — built and maintained by **Your Ikigai Ltd**.

Pull content from the Mojimoto delivery API with full TypeScript types, and render rich text, images, and links in **React / Next.js** and **Vue / Nuxt** with a single import.

---

## Packages

| Package | What it's for | Install |
| --- | --- | --- |
| [`@mojimoto/client`](./packages/client) | Framework-agnostic typed delivery client. Start here. | `npm i @mojimoto/client` |
| [`@mojimoto/richtext`](./packages/richtext) | Rich-text core: types, `serialize`, `asText`, `asHTML`. | `npm i @mojimoto/richtext` |
| [`@mojimoto/react`](./packages/react) | React components & hooks (`<MojiRichText>`, `<MojiImage>`, …). | `npm i @mojimoto/react` |
| [`@mojimoto/vue`](./packages/vue) | Vue 3 components & composables. | `npm i @mojimoto/vue` |
| [`@mojimoto/nuxt`](./packages/nuxt) | Nuxt 3 module: auto-config, SSR composables, global components. | `npm i @mojimoto/nuxt` |
| [`@mojimoto/next`](./packages/next) | Next.js App Router helpers: cache-aware client + Draft Mode. | `npm i @mojimoto/next` |

You only need the packages for your stack — they layer cleanly:

```
@mojimoto/richtext  ──┐
                      ├──>  @mojimoto/react  ──>  @mojimoto/next
@mojimoto/client  ────┤
                      └──>  @mojimoto/vue    ──>  @mojimoto/nuxt
```

---

## Quick start

### 1. Get your credentials

From your Mojimoto project, go to **Settings → API tokens** and create a **read** token
(add the **preview** ability too if you want to fetch drafts). You'll need:

- **Endpoint** — `https://<your-mojimoto-host>/api/v1`
- **Project slug** — e.g. `decentenergy`
- **Token** — the once-shown read token

> Read tokens are scoped to a single project and are safe to ship to the browser, the same
> way Contentful CDN tokens and Prismic access tokens are. **Never** expose a write or
> preview-secret token client-side.

### 2. Fetch content (any JS runtime)

```ts
import { createClient } from '@mojimoto/client';

const cms = createClient({
  endpoint: 'https://cms.yourikigai.co.uk/api/v1',
  project: 'decentenergy',
  token: process.env.MOJIMOTO_TOKEN!,
});

const home = await cms.byUid('marketing_page', 'home');
const posts = await cms.all({ type: 'blog_post' }); // every page, flattened
```

### 3. Render it

<details open>
<summary><strong>React / Next.js</strong></summary>

```tsx
import { MojiRichText, MojiImage } from '@mojimoto/react';

export default function Page({ doc }) {
  return (
    <article>
      <MojiImage field={doc.data.background_image} alt="" />
      <MojiRichText field={doc.data.body} />
    </article>
  );
}
```
</details>

<details>
<summary><strong>Vue / Nuxt</strong></summary>

```vue
<script setup>
const { data: doc } = await useMojiDocument('marketing_page', 'home'); // @mojimoto/nuxt
</script>

<template>
  <article v-if="doc">
    <MojiImage :field="doc.data.background_image" alt="" />
    <MojiRichText :field="doc.data.body" />
  </article>
</template>
```
</details>

---

## The delivery contract

Every document is delivered in this shape:

```jsonc
{
  "id": 42,
  "uid": "home",                 // human slug, unique per content type
  "type": "marketing_page",      // content type api id
  "lang": "en-gb",
  "status": "published",         // or "draft" under ?ref=preview
  "published_at": "2026-06-08T10:00:00+00:00",
  "updated_at": "2026-06-08T10:00:00+00:00",
  "data": { /* your fields, keyed by field id */ }
}
```

List endpoints wrap results in a paginated envelope:

```jsonc
{ "results": [ /* documents */ ], "page": 1, "per_page": 20, "total_results": 24, "total_pages": 2, "lang": "en-gb", "ref": "published" }
```

### Field types on the wire

Mojimoto uses a Contentful-style flat field model. Here's how each field type appears in `data`:

| Field type | Delivered as | SDK helper |
| --- | --- | --- |
| `symbol`, `text`, `slug`, `select` | `string` | — |
| `number` | `number` | — |
| `boolean` | `boolean` | — |
| `date` | ISO `string` | — |
| `rich_text` | array of structured-text nodes | `<MojiRichText>`, `asText`, `asHTML` |
| `media` | URL `string` | `<MojiImage>` |
| `location` | `{ lat, lon }` | — |
| `json` | arbitrary object | — |
| `reference` | the **fully-resolved linked document** (depth 1), or `null` | treat as a nested document |
| `references` | array of resolved linked documents | map over them |

> **References are resolved for you.** The delivery API inlines a referenced entry's full
> `data` one level deep. Beyond that depth a reference is a stub: `{ id, type, uid }`.

### Rich text

`rich_text` is an ordered array of block nodes; inline formatting is expressed as `spans`
(character ranges) layered over each block's `text`:

```jsonc
[
  { "type": "heading2", "text": "Tailored to your home", "spans": [] },
  { "type": "paragraph", "text": "Built for smart tariffs.",
    "spans": [{ "start": 0, "end": 5, "type": "strong" }] }
]
```

You almost never parse this by hand — render it with `<MojiRichText>` (React/Vue) or turn it
into a string with `asText` / `asHTML`. See [`@mojimoto/richtext`](./packages/richtext) for the
full node reference and customization model.

---

## TypeScript types per project

For end-to-end autocomplete against *your* content model, generate a typed declaration file
from the CMS and pass the types into the client:

```bash
php artisan mojimoto:generate-types   # run in your Mojimoto project → mojimoto.generated.ts
```

```ts
import { createClient, type MojimotoDocument } from '@mojimoto/client';
import type { MarketingPageData } from './mojimoto.generated';

type MarketingPage = MojimotoDocument<'marketing_page', MarketingPageData>;

const home = await cms.byUid<MarketingPage>('marketing_page', 'home');
home?.data.headline; // ✅ typed
```

---

## Preview / draft content

Fetch drafts with a **preview-capable** token:

- **Client SDK** — `createClient({ ..., preview: true })` or per-call `{ preview: true }`.
- **Next.js** — use Draft Mode via [`@mojimoto/next`](./packages/next) (`createDraftAwareClient`, preview route handlers).
- **Nuxt** — set a `mojimoto_preview` cookie from a preview route; the module picks it up. See [`@mojimoto/nuxt`](./packages/nuxt).

---

## Local development (this monorepo)

```bash
pnpm install
pnpm build        # build every package
pnpm test         # run all unit tests
pnpm typecheck    # type-check every package
pnpm dev          # watch-build all packages
```

This is a pnpm workspace. Releases are managed with [Changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset            # describe your change
pnpm version-packages     # bump versions + changelogs
pnpm release              # build + publish to npm
```

## License

MIT © Your Ikigai Ltd
