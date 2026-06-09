import { defineComponent, h, type PropType } from 'vue';
import type { MojiLink as MojiLinkValue, MojiLinkResolver } from '@mojimoto/richtext';
import { useMojimotoContext } from './context';

/** Resolve a link value to an href using a resolver for document links. */
export function resolveHref(link: MojiLinkValue | undefined, resolver?: MojiLinkResolver): string | undefined {
  if (!link) return undefined;
  if (link.link_type === 'Document' && resolver) return resolver(link) ?? undefined;
  return link.url ?? resolver?.(link) ?? undefined;
}

/**
 * Renders a link field as an `<a>` (or a custom component via the `as` prop),
 * resolving document links and adding safe `rel` for `_blank` targets.
 */
export const MojiLink = defineComponent({
  name: 'MojiLink',
  props: {
    field: { type: Object as PropType<MojiLinkValue | null>, default: null },
    linkResolver: { type: Function as PropType<MojiLinkResolver>, default: undefined },
    as: { type: [String, Object, Function] as PropType<unknown>, default: 'a' },
  },
  setup(props, { slots }) {
    const ctx = useMojimotoContext();
    return () => {
      const href = resolveHref(props.field ?? undefined, props.linkResolver ?? ctx.linkResolver);
      const target = props.field?.target;
      const rel = target === '_blank' ? 'noopener noreferrer' : undefined;
      return h(props.as as never, { href, target, rel }, slots.default?.());
    };
  },
});
