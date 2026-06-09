import { serialize, type MojiRichTextComponents, type MojiRichTextSerializer } from './serialize';
import type { MojiLink, MojiLinkResolver, MojiRichText } from './types';

export interface AsHTMLOptions {
  /** Resolves document links to hrefs. Web/media links already carry a `url`. */
  linkResolver?: MojiLinkResolver;
  /**
   * Per-node HTML overrides. Each returns an HTML string; `children` is the
   * already-serialized inner HTML. Escape any untrusted text you interpolate.
   */
  components?: MojiRichTextComponents<string>;
}

/** Escape a string for safe interpolation into HTML text/attribute context. */
export function escapeHTML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveHref(link: MojiLink | undefined, resolver?: MojiLinkResolver): string {
  if (!link) {
    return '';
  }
  if (link.link_type === 'Document' && resolver) {
    return resolver(link) ?? '';
  }
  return link.url ?? resolver?.(link) ?? '';
}

function linkAttributes(link: MojiLink | undefined, resolver?: MojiLinkResolver): string {
  const href = resolveHref(link, resolver);
  const target = link?.target ? ` target="${escapeHTML(link.target)}"` : '';
  const rel = link?.target === '_blank' ? ' rel="noopener noreferrer"' : '';
  return `href="${escapeHTML(href)}"${target}${rel}`;
}

/**
 * Render a rich-text document to an HTML string. Use this for environments
 * without a component renderer (RSS, emails, server-rendered fragments).
 *
 * ```ts
 * asHTML(doc.data.body, { linkResolver: (l) => `/${l.uid}` })
 * ```
 */
export function asHTML(nodes: MojiRichText | null | undefined, options: AsHTMLOptions = {}): string {
  const { linkResolver, components } = options;

  const defaults: MojiRichTextSerializer<string> = {
    paragraph: ({ children }) => `<p>${children.join('')}</p>`,
    heading1: ({ children }) => `<h1>${children.join('')}</h1>`,
    heading2: ({ children }) => `<h2>${children.join('')}</h2>`,
    heading3: ({ children }) => `<h3>${children.join('')}</h3>`,
    heading4: ({ children }) => `<h4>${children.join('')}</h4>`,
    heading5: ({ children }) => `<h5>${children.join('')}</h5>`,
    heading6: ({ children }) => `<h6>${children.join('')}</h6>`,
    preformatted: ({ node }) => `<pre>${escapeHTML(node.text)}</pre>`,
    list: ({ children }) => `<ul>${children.join('')}</ul>`,
    oList: ({ children }) => `<ol>${children.join('')}</ol>`,
    listItem: ({ children }) => `<li>${children.join('')}</li>`,
    oListItem: ({ children }) => `<li>${children.join('')}</li>`,
    image: ({ node }) => {
      const alt = ` alt="${escapeHTML(node.alt ?? '')}"`;
      const img = `<img src="${escapeHTML(node.url)}"${alt} />`;
      const wrapped = node.linkTo ? `<a ${linkAttributes(node.linkTo, linkResolver)}>${img}</a>` : img;
      return `<figure>${wrapped}</figure>`;
    },
    embed: ({ node }) => `<div data-oembed="${escapeHTML(node.oembed.embed_url ?? '')}">${node.oembed.html ?? ''}</div>`,
    strong: ({ children }) => `<strong>${children.join('')}</strong>`,
    em: ({ children }) => `<em>${children.join('')}</em>`,
    label: ({ node, children }) => {
      const className = (node.data as { label?: string } | undefined)?.label;
      return `<span${className ? ` class="${escapeHTML(className)}"` : ''}>${children.join('')}</span>`;
    },
    hyperlink: ({ node, children }) =>
      `<a ${linkAttributes(node.data as MojiLink, linkResolver)}>${children.join('')}</a>`,
    text: ({ text }) => escapeHTML(text),
  };

  const serializer: MojiRichTextSerializer<string> = { ...defaults, ...components };
  return serialize(nodes, serializer).join('');
}
