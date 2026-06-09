# @mojimoto/next

Next.js App Router helpers for Mojimoto: a cache-aware delivery client and Draft Mode preview
wiring. Pair with [`@mojimoto/react`](../react) for the render components.

```bash
npm i @mojimoto/next @mojimoto/react
```

> App Router only. For the Pages Router, use [`@mojimoto/client`](../client) directly.

## Cache-aware client

Requests flow through the Next.js `fetch`, so they participate in the Data Cache. Set
`revalidate` (ISR) and `tags` (on-demand revalidation) once on the client:

```ts
// lib/cms.ts
import { createMojimotoClient } from '@mojimoto/next';

export const cms = createMojimotoClient({
  endpoint: process.env.MOJIMOTO_ENDPOINT!,
  project: 'decentenergy',
  token: process.env.MOJIMOTO_TOKEN!,
  revalidate: 60,      // re-fetch at most every 60s
  tags: ['cms'],       // revalidateTag('cms') to purge on publish
});
```

Use it from any Server Component:

```tsx
// app/[uid]/page.tsx
import { notFound } from 'next/navigation';
import { MojiRichText } from '@mojimoto/react';
import { cms } from '@/lib/cms';

export default async function Page({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const doc = await cms.byUid('marketing_page', uid);
  if (!doc) notFound();
  return <MojiRichText field={doc.data.body} linkResolver={(l) => `/${l.uid}`} />;
}
```

### On-demand revalidation (webhook)

Wire a Mojimoto publish webhook to a route that purges the tag:

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  // verify your webhook secret here…
  revalidateTag('cms');
  return Response.json({ revalidated: true });
}
```

## Draft Mode (preview)

`createDraftAwareClient` reads Next.js Draft Mode and requests drafts (and bypasses the cache)
when it's enabled.

```tsx
import { createDraftAwareClient } from '@mojimoto/next';

export default async function Page({ params }) {
  const cms = await createDraftAwareClient({
    endpoint: process.env.MOJIMOTO_ENDPOINT!,
    project: 'decentenergy',
    token: process.env.MOJIMOTO_TOKEN!,   // needs the preview ability
    revalidate: 60,
  });
  const doc = await cms.byUid('marketing_page', (await params).uid);
  // …
}
```

Add the preview route handlers and point your Mojimoto project's preview URL at `/api/preview`:

```ts
// app/api/preview/route.ts
import { createPreviewHandler } from '@mojimoto/next/preview';
export const GET = createPreviewHandler({ secret: process.env.MOJIMOTO_PREVIEW_SECRET! });

// app/api/preview/exit/route.ts
import { createExitPreviewHandler } from '@mojimoto/next/preview';
export const GET = createExitPreviewHandler({ defaultRedirect: '/' });
```

Then visit `…/api/preview?secret=…&redirect=/your-path` to enter preview, and
`…/api/preview/exit` to leave.

## License

MIT © Your Ikigai Ltd
