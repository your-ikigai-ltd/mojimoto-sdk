import { defineComponent, h, type PropType } from 'vue';
import { asText, type MojiRichText as MojiRichTextValue } from '@mojimoto/richtext';

/** Renders a `rich_text` field as plain text (no formatting). */
export const MojiText = defineComponent({
  name: 'MojiText',
  props: {
    field: { type: Array as PropType<MojiRichTextValue | null>, default: null },
    as: { type: [String, Object, Function] as PropType<unknown>, default: undefined },
    separator: { type: String, default: ' ' },
    fallback: { type: String, default: '' },
  },
  setup(props) {
    return () => {
      const text = asText(props.field, { separator: props.separator }) || props.fallback;
      return props.as ? h(props.as as never, {}, text) : text;
    };
  },
});
