import { defineComponent, h, isVNode, type PropType, type VNode } from 'vue';
import {
  serialize,
  type MojiLink as MojiLinkValue,
  type MojiLinkResolver,
  type MojiRichText as MojiRichTextValue,
  type MojiRichTextComponents,
  type MojiRichTextSerializer,
} from '@mojimoto/richtext';
import { useMojimotoContext } from './context';
import { MojiLink } from './MojiLink';
import { MojiImage } from './MojiImage';

type VNodeOrText = VNode | string;

function buildDefaults(linkResolver?: MojiLinkResolver): MojiRichTextSerializer<VNodeOrText> {
  return {
    paragraph: ({ children }) => h('p', {}, children),
    heading1: ({ children }) => h('h1', {}, children),
    heading2: ({ children }) => h('h2', {}, children),
    heading3: ({ children }) => h('h3', {}, children),
    heading4: ({ children }) => h('h4', {}, children),
    heading5: ({ children }) => h('h5', {}, children),
    heading6: ({ children }) => h('h6', {}, children),
    preformatted: ({ node }) => h('pre', {}, node.text),
    list: ({ children }) => h('ul', {}, children),
    oList: ({ children }) => h('ol', {}, children),
    listItem: ({ children }) => h('li', {}, children),
    oListItem: ({ children }) => h('li', {}, children),
    image: ({ node }) => {
      const img = h(MojiImage, { field: node });
      return node.linkTo ? h(MojiLink, { field: node.linkTo, linkResolver }, () => [img]) : img;
    },
    embed: ({ node }) =>
      node.oembed.html
        ? h('div', { 'data-oembed': node.oembed.embed_url, innerHTML: node.oembed.html })
        : h('template'),
    strong: ({ children }) => h('strong', {}, children),
    em: ({ children }) => h('em', {}, children),
    label: ({ node, children }) => {
      const className = (node.data as { label?: string } | undefined)?.label;
      return h('span', { class: className }, children);
    },
    hyperlink: ({ node, children }) =>
      h(MojiLink, { field: node.data as MojiLinkValue, linkResolver }, () => children),
    text: ({ text }) => text,
  };
}

function keyed(fn: (args: { key: string }) => VNodeOrText): (args: { key: string }) => VNodeOrText {
  return (args) => {
    const result = fn(args);
    if (isVNode(result)) {
      result.key = args.key;
    }
    return result;
  };
}

/**
 * Renders a Mojimoto `rich_text` field. Override any block or span with the
 * `components` prop; everything else uses sensible HTML defaults.
 */
export const MojiRichText = defineComponent({
  name: 'MojiRichText',
  props: {
    field: { type: Array as PropType<MojiRichTextValue | null>, default: null },
    components: { type: Object as PropType<MojiRichTextComponents<VNodeOrText>>, default: undefined },
    linkResolver: { type: Function as PropType<MojiLinkResolver>, default: undefined },
  },
  setup(props, { slots }) {
    const ctx = useMojimotoContext();
    return () => {
      if (!Array.isArray(props.field) || props.field.length === 0) {
        return slots.fallback?.() ?? null;
      }

      const merged = {
        ...buildDefaults(props.linkResolver ?? ctx.linkResolver),
        ...ctx.richTextComponents,
        ...props.components,
      } as MojiRichTextSerializer<VNodeOrText>;

      const serializer = Object.fromEntries(
        Object.entries(merged).map(([type, fn]) => [type, keyed(fn as (a: { key: string }) => VNodeOrText)]),
      ) as unknown as MojiRichTextSerializer<VNodeOrText>;

      return serialize(props.field, serializer);
    };
  },
});
