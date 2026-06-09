import { defineComponent, h, type PropType } from 'vue';
import type { MojiImageNode } from '@mojimoto/richtext';

export interface ImageTransform {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

function applyTransform(url: string, transform?: ImageTransform): string {
  if (!transform) return url;
  try {
    const u = new URL(url);
    if (transform.width) u.searchParams.set('w', String(transform.width));
    if (transform.height) u.searchParams.set('h', String(transform.height));
    if (transform.quality) u.searchParams.set('q', String(transform.quality));
    if (transform.format) u.searchParams.set('fm', transform.format);
    return u.toString();
  } catch {
    return url;
  }
}

/** Renders a Mojimoto `media` field or rich-text image node as an `<img>`. */
export const MojiImage = defineComponent({
  name: 'MojiImage',
  props: {
    field: { type: [String, Object] as PropType<string | MojiImageNode | null>, default: null },
    alt: { type: String, default: undefined },
    transform: { type: Object as PropType<ImageTransform>, default: undefined },
  },
  setup(props) {
    return () => {
      if (!props.field) return null;
      const isNode = typeof props.field !== 'string';
      const node = props.field as MojiImageNode;
      const url = isNode ? node.url : (props.field as string);
      if (!url) return null;

      return h('img', {
        src: applyTransform(url, props.transform),
        alt: props.alt ?? (isNode ? (node.alt ?? '') : ''),
        width: props.transform?.width ?? (isNode ? node.dimensions?.width : undefined),
        height: props.transform?.height ?? (isNode ? node.dimensions?.height : undefined),
      });
    };
  },
});
