# @mojimoto/vue

Vue 3 components and composables for rendering Mojimoto content. For Nuxt, use
[`@mojimoto/nuxt`](../nuxt) instead — it wires this package up for you (auto-imports, SSR, global
components).

```bash
npm i @mojimoto/vue @mojimoto/client
```

## Setup

Register a client (and optional defaults) as a plugin:

```ts
import { createApp } from 'vue';
import { createClient } from '@mojimoto/client';
import { createMojimoto } from '@mojimoto/vue';
import App from './App.vue';

const cms = createClient({ endpoint, project, token });

createApp(App)
  .use(createMojimoto({ client: cms, linkResolver: (l) => `/${l.uid}` }))
  .mount('#app');
```

Or inside a component's `setup()` with `provideMojimoto({ client, linkResolver })`.

## Components

### `<MojiRichText>`

```vue
<script setup>
import { MojiRichText } from '@mojimoto/vue';
import { h } from 'vue';
</script>

<template>
  <MojiRichText :field="doc.data.body" :link-resolver="(l) => `/${l.uid}`">
    <template #fallback>
      <p class="text-stone-400">No content yet.</p>
    </template>
  </MojiRichText>
</template>
```

Override individual nodes with the `components` prop (each returns a VNode or string; keys are
handled for you):

```vue
<script setup>
import { h } from 'vue';
const components = {
  heading2: ({ children }) => h('h2', { class: 'text-2xl font-serif' }, children),
};
</script>

<template>
  <MojiRichText :field="doc.data.body" :components="components" />
</template>
```

### `<MojiImage>`, `<MojiText>`, `<MojiLink>`

```vue
<MojiImage :field="doc.data.background_image" alt="Hero" :transform="{ width: 1280, format: 'webp' }" />
<MojiText :field="doc.data.intro" as="h1" />
<MojiLink :field="doc.data.cta_link" class="btn">Get started</MojiLink>
```

`<MojiLink>` accepts an `as` prop to render through a router link component:

```vue
<MojiLink :field="doc.data.cta_link" :as="RouterLink">Read more</MojiLink>
```

## Composables

Reactive, client-side data fetching (re-runs when args change, aborts on cleanup):

```vue
<script setup>
import { useMojiQuery, useMojiDocument } from '@mojimoto/vue';

const { data: posts, loading } = useMojiQuery({ type: 'blog_post', perPage: 10 });
const { data: home } = useMojiDocument('marketing_page', 'home');
</script>
```

`useMojiQuery` also accepts a getter for reactive options: `useMojiQuery(() => ({ type, uid: uid.value }))`.

> For **SSR** in Nuxt, prefer the `useMojiQuery` / `useMojiDocument` from
> [`@mojimoto/nuxt`](../nuxt), which wrap `useAsyncData` so data is fetched on the server and
> hydrated on the client.

## Embed safety

The default `embed` renderer injects provider oEmbed HTML via `v-html`. That HTML originates from
your CMS's oEmbed provider (editor-controlled, same trust model as Prismic/Contentful renderers).
If you embed untrusted third-party content, override the `embed` component to sanitize it or render
an iframe yourself.

## License

MIT © Your Ikigai Ltd
