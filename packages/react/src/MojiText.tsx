import { type ElementType } from 'react';
import { asText, type MojiRichText as MojiRichTextValue } from '@mojimoto/richtext';

export interface MojiTextProps {
  /** The `rich_text` field to flatten to plain text. */
  field: MojiRichTextValue | null | undefined;
  /** Element to render into. Defaults to a fragment (no wrapper). */
  as?: ElementType;
  /** Separator between blocks. Defaults to a space. */
  separator?: string;
  /** Rendered when the field is empty. */
  fallback?: string;
}

/**
 * Renders a `rich_text` field as plain text — useful for excerpts and headings
 * where formatting should be stripped.
 */
export function MojiText({ field, as: Component, separator = ' ', fallback = '' }: MojiTextProps) {
  const text = asText(field, { separator }) || fallback;
  return Component ? <Component>{text}</Component> : <>{text}</>;
}
