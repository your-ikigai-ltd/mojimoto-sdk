import { describe, expect, it } from 'vitest';
import { serialize, type MojiRichTextSerializer } from './serialize';
import type { MojiRichText } from './types';

/** A trivial serializer that produces a readable s-expression for assertions. */
const sexp: MojiRichTextSerializer<string> = {
  paragraph: ({ children }) => `(p ${children.join('')})`,
  heading1: ({ children }) => `(h1 ${children.join('')})`,
  heading2: ({ children }) => `(h2 ${children.join('')})`,
  heading3: ({ children }) => `(h3 ${children.join('')})`,
  heading4: ({ children }) => `(h4 ${children.join('')})`,
  heading5: ({ children }) => `(h5 ${children.join('')})`,
  heading6: ({ children }) => `(h6 ${children.join('')})`,
  preformatted: ({ node }) => `(pre ${node.text})`,
  list: ({ children }) => `(ul ${children.join('')})`,
  oList: ({ children }) => `(ol ${children.join('')})`,
  listItem: ({ children }) => `(li ${children.join('')})`,
  oListItem: ({ children }) => `(li ${children.join('')})`,
  image: ({ node }) => `(img ${node.url})`,
  embed: ({ node }) => `(embed ${node.oembed.embed_url})`,
  strong: ({ children }) => `(b ${children.join('')})`,
  em: ({ children }) => `(i ${children.join('')})`,
  label: ({ children }) => `(label ${children.join('')})`,
  hyperlink: ({ node, children }) => `(a:${(node.data as { url?: string }).url} ${children.join('')})`,
  text: ({ text }) => text,
};

describe('serialize', () => {
  it('returns [] for empty or invalid input', () => {
    expect(serialize(null, sexp)).toEqual([]);
    expect(serialize(undefined, sexp)).toEqual([]);
    expect(serialize([], sexp)).toEqual([]);
  });

  it('renders a plain paragraph', () => {
    const doc: MojiRichText = [{ type: 'paragraph', text: 'Hello', spans: [] }];
    expect(serialize(doc, sexp)).toEqual(['(p Hello)']);
  });

  it('renders a single span', () => {
    const doc: MojiRichText = [
      { type: 'paragraph', text: 'Hello world', spans: [{ start: 0, end: 5, type: 'strong' }] },
    ];
    expect(serialize(doc, sexp).join('')).toBe('(p (b Hello) world)');
  });

  it('renders nested spans', () => {
    const doc: MojiRichText = [
      {
        type: 'paragraph',
        text: 'abcd',
        spans: [
          { start: 0, end: 4, type: 'strong' },
          { start: 1, end: 3, type: 'em' },
        ],
      },
    ];
    expect(serialize(doc, sexp).join('')).toBe('(p (b a(i bc)d))');
  });

  it('renders a hyperlink span with data', () => {
    const doc: MojiRichText = [
      {
        type: 'paragraph',
        text: 'go here',
        spans: [{ start: 3, end: 7, type: 'hyperlink', data: { link_type: 'Web', url: 'https://x.test' } }],
      },
    ];
    expect(serialize(doc, sexp).join('')).toBe('(p go (a:https://x.test here))');
  });

  it('groups consecutive list items into a single list', () => {
    const doc: MojiRichText = [
      { type: 'list-item', text: 'one', spans: [] },
      { type: 'list-item', text: 'two', spans: [] },
      { type: 'paragraph', text: 'gap', spans: [] },
      { type: 'o-list-item', text: 'a', spans: [] },
      { type: 'o-list-item', text: 'b', spans: [] },
    ];
    expect(serialize(doc, sexp).join('')).toBe('(ul (li one)(li two))(p gap)(ol (li a)(li b))');
  });

  it('renders image and embed leaves', () => {
    const doc: MojiRichText = [
      { type: 'image', url: 'https://img.test/a.jpg', alt: 'a' },
      { type: 'embed', oembed: { embed_url: 'https://yt.test/1' } },
    ];
    expect(serialize(doc, sexp)).toEqual(['(img https://img.test/a.jpg)', '(embed https://yt.test/1)']);
  });
});
