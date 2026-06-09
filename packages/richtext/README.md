# @mojimoto/richtext

The framework-agnostic core for rendering Mojimoto `rich_text` fields. Provides the type
definitions, a serializer engine, and `asText` / `asHTML` helpers. The React and Vue packages
are thin adapters over this.

```bash
npm i @mojimoto/richtext
```

> Most apps don't import this directly — use [`@mojimoto/react`](../react) or
> [`@mojimoto/vue`](../vue). Reach for it when you need plain text, an HTML string, or a custom
> non-DOM renderer (RSS, emails, React Native, terminal output…).

## The rich-text model

A `rich_text` value is an ordered array of **block nodes**. Inline formatting is expressed as
**spans** — character ranges layered over a block's plain `text`.

```ts
import type { MojiRichText } from '@mojimoto/richtext';

const doc: MojiRichText = [
  { type: 'heading2', text: 'Hello', spans: [] },
  {
    type: 'paragraph',
    text: 'Bold link',
    spans: [
      { start: 0, end: 4, type: 'strong' },
      { start: 5, end: 9, type: 'hyperlink', data: { link_type: 'Web', url: 'https://x.test' } },
    ],
  },
];
```

### Node types

| Block `type` | Notes |
| --- | --- |
| `paragraph` | |
| `heading1` … `heading6` | |
| `preformatted` | rendered as `<pre>` |
| `list-item` | consecutive items group into a `<ul>` |
| `o-list-item` | consecutive items group into an `<ol>` |
| `image` | `{ url, alt?, copyright?, dimensions?, linkTo? }` |
| `embed` | `{ oembed: { html?, embed_url?, … } }` |

### Span types

| Span `type` | `data` |
| --- | --- |
| `strong`, `em` | — |
| `label` | `{ label: string }` (used as a class name) |
| `hyperlink` | a `MojiLink` (`{ link_type, url?, target?, id?, uid?, type? }`) |

## `asText`

Flatten to plain text — ideal for meta descriptions, excerpts, and search indexing.

```ts
import { asText } from '@mojimoto/richtext';

asText(doc);                         // "Hello\nBold link"
asText(doc, { separator: ' — ' });   // "Hello — Bold link"
```

## `asHTML`

Render to an HTML string. Text is escaped; `_blank` links get `rel="noopener noreferrer"`.

```ts
import { asHTML } from '@mojimoto/richtext';

asHTML(doc, {
  // Resolve document links to URLs (web/media links already carry a `url`).
  linkResolver: (link) => `/${link.uid}`,
  // Override any node. `children` is the already-serialized inner HTML.
  components: {
    heading2: ({ children }) => `<h2 class="text-2xl">${children.join('')}</h2>`,
  },
});
```

> When overriding nodes that interpolate untrusted text, escape it yourself with the exported
> `escapeHTML(value)`.

## `serialize` — build your own renderer

`serialize` walks the document, groups list items, composes spans into nested children, and
calls your serializer bottom-up. It's generic over the output type `T`, so it can produce
strings, React elements, Vue VNodes, or anything else.

```ts
import { serialize, type MojiRichTextSerializer } from '@mojimoto/richtext';

const toMarkdown: MojiRichTextSerializer<string> = {
  paragraph: ({ children }) => `${children.join('')}\n\n`,
  heading1: ({ children }) => `# ${children.join('')}\n\n`,
  // …implement every node kind…
  strong: ({ children }) => `**${children.join('')}**`,
  text: ({ text }) => text,
  // (other node kinds omitted for brevity)
} as MojiRichTextSerializer<string>;

const markdown = serialize(doc, toMarkdown).join('');
```

Each serializer method receives `{ node, children, key }` (blocks/spans), `{ children, key }`
(list wrappers), `{ node, key }` (image/embed), or `{ text, key }` (plain runs).

## License

MIT © Your Ikigai Ltd
