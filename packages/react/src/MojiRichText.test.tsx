import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MojiRichText as MojiRichTextValue } from '@mojimoto/richtext';
import { MojiRichText } from './MojiRichText';
import { MojiImage } from './MojiImage';
import { MojiLink } from './MojiLink';

describe('<MojiRichText>', () => {
  it('renders defaults for blocks and spans', () => {
    const field: MojiRichTextValue = [
      { type: 'heading2', text: 'Title', spans: [] },
      {
        type: 'paragraph',
        text: 'Bold and linked',
        spans: [
          { start: 0, end: 4, type: 'strong' },
          { start: 9, end: 15, type: 'hyperlink', data: { link_type: 'Web', url: 'https://x.test' } },
        ],
      },
      { type: 'list-item', text: 'one', spans: [] },
      { type: 'list-item', text: 'two', spans: [] },
    ];

    const { container } = render(<MojiRichText field={field} />);
    expect(container.querySelector('h2')?.textContent).toBe('Title');
    expect(container.querySelector('strong')?.textContent).toBe('Bold');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://x.test');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
  });

  it('applies component overrides', () => {
    const field: MojiRichTextValue = [{ type: 'heading1', text: 'Hi', spans: [] }];
    const { container } = render(
      <MojiRichText
        field={field}
        components={{ heading1: ({ children }) => <h1 className="lead">{children}</h1> }}
      />,
    );
    expect(container.querySelector('h1.lead')?.textContent).toBe('Hi');
  });

  it('resolves document links via linkResolver', () => {
    const field: MojiRichTextValue = [
      {
        type: 'paragraph',
        text: 'about',
        spans: [{ start: 0, end: 5, type: 'hyperlink', data: { link_type: 'Document', uid: 'about', type: 'page' } }],
      },
    ];
    const { container } = render(<MojiRichText field={field} linkResolver={(l) => `/${l.uid}`} />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/about');
  });

  it('renders the fallback for empty fields', () => {
    const { container } = render(<MojiRichText field={[]} fallback={<p>empty</p>} />);
    expect(container.textContent).toBe('empty');
  });
});

describe('<MojiImage>', () => {
  it('renders a media URL with transform params', () => {
    const { container } = render(<MojiImage field="https://img.test/a.jpg" alt="A" transform={{ width: 800, format: 'webp' }} />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('https://img.test/a.jpg?w=800&fm=webp');
    expect(img.getAttribute('alt')).toBe('A');
    expect(img.getAttribute('width')).toBe('800');
  });

  it('renders nothing for empty fields', () => {
    const { container } = render(<MojiImage field={null} />);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('<MojiLink>', () => {
  it('adds rel=noopener for _blank', () => {
    const { container } = render(
      <MojiLink field={{ link_type: 'Web', url: 'https://x.test', target: '_blank' }}>go</MojiLink>,
    );
    const a = container.querySelector('a')!;
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    expect(a.getAttribute('href')).toBe('https://x.test');
  });
});
