# @mojimoto/nuxt

Nuxt 3 module for Mojimoto. Auto-configures a delivery client, exposes SSR-friendly composables,
and registers `<MojiRichText>` & friends as global components.

```bash
npm i @mojimoto/nuxt
```

## Setup

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@mojimoto/nuxt'],
  mojimoto: {
    endpoint: 'https://mojimoto.com/api/v1',
    project: 'decentenergy',
    // token: '…'  // prefer the MOJIMOTO_TOKEN env var (see below)
  },
});
```

Configure via env vars (recommended) instead of hardcoding:

```bash
MOJIMOTO_ENDPOINT="https://mojimoto.com/api/v1"
MOJIMOTO_PROJECT="decentenergy"
MOJIMOTO_TOKEN="your-read-token"
```

### Options

| Option | Env fallback | Description |
| --- | --- | --- |
| `endpoint` | `MOJIMOTO_ENDPOINT` | Delivery endpoint. |
| `project` | `MOJIMOTO_PROJECT` | Project slug. |
| `token` | `MOJIMOTO_TOKEN` | **Read** token. |
| `lang` | — | Default locale. |
| `preview` | — | Request drafts by default. |
| `components` | — | Register global components (default `true`). |

> **Token visibility:** the read token is placed in **public** runtime config, so it's available
> for client-side navigation — exactly like a Contentful CDN token. Use a read-only token. For
> preview, see below.

## Composables (auto-imported, SSR)

These wrap Nuxt's `useAsyncData`: content is fetched on the server, serialized into the payload,
and hydrated on the client.

```vue
<script setup lang="ts">
const { data: home } = await useMojiDocument('marketing_page', 'home');
const { data: posts } = await useMojiQuery({ type: 'blog_post', perPage: 12 });

// Raw client for imperative use:
const cms = useMojimoto();
</script>

<template>
  <article v-if="home">
    <MojiImage :field="home.data.background_image" alt="" />
    <MojiRichText :field="home.data.body" />
  </article>
</template>
```

Pass an explicit cache key as the last argument when you need control:
`useMojiQuery({ type: 'blog_post' }, 'all-posts')`.

## Typed content

```ts
import type { MojimotoDocument } from '@mojimoto/client';
import type { MarketingPageData } from '~/mojimoto.generated';

const { data } = await useMojiDocument<MojimotoDocument<'marketing_page', MarketingPageData>>(
  'marketing_page',
  'home',
);
```

## Preview / draft mode

The module enables preview when the `preview` option is set, or when a `mojimoto_preview` cookie
equals `'1'`. Add small server routes to toggle it, then point your Mojimoto project's preview
URL at `/api/preview`:

```ts
// server/api/preview.get.ts
export default defineEventHandler((event) => {
  const { secret, redirect } = getQuery(event);
  if (secret !== process.env.MOJIMOTO_PREVIEW_SECRET) {
    throw createError({ statusCode: 401 });
  }
  setCookie(event, 'mojimoto_preview', '1', { httpOnly: false, path: '/' });
  return sendRedirect(event, (redirect as string) ?? '/');
});

// server/api/preview/exit.get.ts
export default defineEventHandler((event) => {
  deleteCookie(event, 'mojimoto_preview');
  return sendRedirect(event, '/');
});
```

> Use a **preview-capable** token (`MOJIMOTO_TOKEN`) so draft requests are authorized.

## License

MIT © Your Ikigai Ltd
