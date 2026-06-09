# @mojimoto/react

React components and hooks for rendering Mojimoto content. Works with React 18 & 19, in both
Client and Server Components (and therefore Next.js). For Next-specific data fetching and Draft
Mode, add [`@mojimoto/next`](../next).

```bash
npm i @mojimoto/react @mojimoto/client
```

## Components

### `<MojiRichText>`

Renders a `rich_text` field with sensible HTML defaults. Override any block or span via
`components`.

```tsx
import { MojiRichText } from '@mojimoto/react';

<MojiRichText field={doc.data.body} />

// Customize specific nodes — everything else keeps its default:
<MojiRichText
  field={doc.data.body}
  components={{
    heading2: ({ children }) => <h2 className="text-2xl font-serif">{children}</h2>,
    hyperlink: ({ node, children }) => (
      <a className="underline" href={(node.data as any).url}>{children}</a>
    ),
  }}
  linkResolver={(link) => `/${link.uid}`}
  fallback={<p className="text-stone-400">No content yet.</p>}
/>
```

Keys are handled automatically — your override functions never need to set `key`.

| Prop | Type | Description |
| --- | --- | --- |
| `field` | `MojiRichText \| null` | The field value. |
| `components` | `MojiRichTextComponents<ReactNode>` | Per-node overrides. |
| `linkResolver` | `(link) => string` | Resolves document links to hrefs. |
| `fallback` | `ReactNode` | Rendered when the field is empty. |

### `<MojiImage>`

Renders a `media` URL string **or** a rich-text image node.

```tsx
import { MojiImage } from '@mojimoto/react';

<MojiImage field={doc.data.background_image} alt="Hero" className="w-full" />

// Append transform params (when image transforms are enabled on your CMS):
<MojiImage field={doc.data.background_image} transform={{ width: 1280, format: 'webp', quality: 80 }} />
```

### `<MojiText>`

Renders a `rich_text` field as plain text (formatting stripped) — for headings, excerpts, `<title>`.

```tsx
<MojiText field={doc.data.intro} as="h1" />
```

### `<MojiLink>`

Renders a link field/span as `<a>`, or any component via `as` (e.g. Next's `Link`).

```tsx
import Link from 'next/link';
import { MojiLink } from '@mojimoto/react';

<MojiLink field={doc.data.cta_link} as={Link} className="btn">Get started</MojiLink>
```

## Provider (optional)

`<MojimotoProvider>` supplies a default `linkResolver`, default rich-text `components`, and a
`client` for the hooks — so you configure them once.

```tsx
import { MojimotoProvider } from '@mojimoto/react';
import { createClient } from '@mojimoto/client';

const cms = createClient({ endpoint, project, token });

<MojimotoProvider client={cms} linkResolver={(l) => `/${l.uid}`}>
  <App />
</MojimotoProvider>
```

Precedence for rich-text components: **per-call `components` prop** > provider
`richTextComponents` > built-in defaults.

## Hooks (Client Components)

For `'use client'` components. In Server Components, just call the client directly.

```tsx
'use client';
import { useMojiQuery, useMojiDocument } from '@mojimoto/react';

function Posts() {
  const { data, loading, error } = useMojiQuery({ type: 'blog_post', perPage: 10 });
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return data!.map((p) => <Card key={p.id} post={p} />);
}
```

Requires a `client` in `<MojimotoProvider>`. Requests abort automatically on unmount / arg change.

## Next.js (Server Components)

```tsx
// app/[uid]/page.tsx
import { createMojimotoClient } from '@mojimoto/next';
import { MojiRichText } from '@mojimoto/react';

const cms = createMojimotoClient({ endpoint, project, token, revalidate: 60 });

export default async function Page({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const doc = await cms.byUid('marketing_page', uid);
  if (!doc) notFound();
  return <MojiRichText field={doc.data.body} />;
}
```

See [`@mojimoto/next`](../next) for caching and Draft Mode.

## A note on embeds

The default `embed` renderer injects provider oEmbed HTML via `dangerouslySetInnerHTML`. That
HTML originates from your CMS's oEmbed provider (editor-controlled, same trust model as
Prismic/Contentful renderers). If you embed untrusted third-party content, override the `embed`
component to sanitize or render an iframe yourself.

## License

MIT © Your Ikigai Ltd
