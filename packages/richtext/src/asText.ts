import type { MojiRichText } from './types';

export interface AsTextOptions {
  /** String inserted between blocks. Defaults to a single newline. */
  separator?: string;
}

/**
 * Flatten a rich-text document to a plain string — handy for meta
 * descriptions, search indexing, previews, and `aria-label`s.
 *
 * ```ts
 * asText(doc.data.body) // "First paragraph\nSecond paragraph"
 * ```
 */
export function asText(nodes: MojiRichText | null | undefined, options: AsTextOptions = {}): string {
  if (!Array.isArray(nodes)) {
    return '';
  }

  const separator = options.separator ?? '\n';

  return nodes
    .map((node) => ('text' in node && typeof node.text === 'string' ? node.text : ''))
    .filter((text) => text.length > 0)
    .join(separator);
}
