import { describe, expect, it } from 'vitest';
import { asHTML, escapeHTML } from './asHTML';
import { asText } from './asText';
import type { MojiRichText } from './types';

describe('asText', () => {
  it('joins block text with newlines and skips empties', () => {
    const doc: MojiRichText = [
      { type: 'heading1', text: 'Title', spans: [] },
      { type: 'paragraph', text: '', spans: [] },
      { type: 'paragraph', text: 'Body', spans: [] },
    ];
    expect(asText(doc)).toBe('Title\nBody');
    expect(asText(doc, { separator: ' ' })).toBe('Title Body');
  });
});

describe('asHTML', () => {
  it('escapes text to prevent injection', () => {
    expect(escapeHTML('<b>&"\'')).toBe('&lt;b&gt;&amp;&quot;&#39;');
    const doc: MojiRichText = [{ type: 'paragraph', text: '<script>', spans: [] }];
    expect(asHTML(doc)).toBe('<p>&lt;script&gt;</p>');
  });

  it('renders headings, lists, and spans', () => {
    const doc: MojiRichText = [
      { type: 'heading2', text: 'Hi', spans: [{ start: 0, end: 2, type: 'strong' }] },
      { type: 'list-item', text: 'one', spans: [] },
      { type: 'list-item', text: 'two', spans: [] },
    ];
    expect(asHTML(doc)).toBe('<h2><strong>Hi</strong></h2><ul><li>one</li><li>two</li></ul>');
  });

  it('resolves document links and marks _blank links rel=noopener', () => {
    const doc: MojiRichText = [
      {
        type: 'paragraph',
        text: 'link',
        spans: [{ start: 0, end: 4, type: 'hyperlink', data: { link_type: 'Document', uid: 'about', type: 'page' } }],
      },
    ];
    expect(asHTML(doc, { linkResolver: (l) => `/${l.uid}` })).toBe('<p><a href="/about">link</a></p>');

    const web: MojiRichText = [
      {
        type: 'paragraph',
        text: 'x',
        spans: [{ start: 0, end: 1, type: 'hyperlink', data: { link_type: 'Web', url: 'https://x.test', target: '_blank' } }],
      },
    ];
    expect(asHTML(web)).toBe('<p><a href="https://x.test" target="_blank" rel="noopener noreferrer">x</a></p>');
  });

  it('allows per-node overrides via components', () => {
    const doc: MojiRichText = [{ type: 'paragraph', text: 'x', spans: [] }];
    expect(asHTML(doc, { components: { paragraph: ({ children }) => `<p class="lead">${children.join('')}</p>` } })).toBe(
      '<p class="lead">x</p>',
    );
  });
});
