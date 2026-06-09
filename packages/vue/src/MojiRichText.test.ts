import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import type { MojiRichText as MojiRichTextValue } from '@mojimoto/richtext';
import { MojiRichText } from './MojiRichText';
import { MojiImage } from './MojiImage';
import { MojiLink } from './MojiLink';

describe('MojiRichText', () => {
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

    const wrapper = mount(MojiRichText, { props: { field } });
    expect(wrapper.find('h2').text()).toBe('Title');
    expect(wrapper.find('strong').text()).toBe('Bold');
    expect(wrapper.find('a').attributes('href')).toBe('https://x.test');
    expect(wrapper.findAll('ul li')).toHaveLength(2);
  });

  it('applies component overrides', () => {
    const field: MojiRichTextValue = [{ type: 'heading1', text: 'Hi', spans: [] }];
    const wrapper = mount(MojiRichText, {
      props: {
        field,
        components: { heading1: ({ children }) => h('h1', { class: 'lead' }, children) },
      },
    });
    expect(wrapper.find('h1.lead').text()).toBe('Hi');
  });

  it('resolves document links via linkResolver', () => {
    const field: MojiRichTextValue = [
      {
        type: 'paragraph',
        text: 'about',
        spans: [{ start: 0, end: 5, type: 'hyperlink', data: { link_type: 'Document', uid: 'about', type: 'page' } }],
      },
    ];
    const wrapper = mount(MojiRichText, { props: { field, linkResolver: (l) => `/${l.uid}` } });
    expect(wrapper.find('a').attributes('href')).toBe('/about');
  });
});

describe('MojiImage', () => {
  it('renders a media URL with transform params', () => {
    const wrapper = mount(MojiImage, { props: { field: 'https://img.test/a.jpg', alt: 'A', transform: { width: 800, format: 'webp' } } });
    const img = wrapper.find('img');
    expect(img.attributes('src')).toBe('https://img.test/a.jpg?w=800&fm=webp');
    expect(img.attributes('alt')).toBe('A');
  });
});

describe('MojiLink', () => {
  it('adds rel=noopener for _blank', () => {
    const wrapper = mount(MojiLink, {
      props: { field: { link_type: 'Web', url: 'https://x.test', target: '_blank' } },
      slots: { default: () => 'go' },
    });
    expect(wrapper.find('a').attributes('rel')).toBe('noopener noreferrer');
  });
});
