import { type ImgHTMLAttributes } from 'react';
import type { MojiImageNode } from '@mojimoto/richtext';

export interface ImageTransform {
  /** Target width in pixels. */
  width?: number;
  /** Target height in pixels. */
  height?: number;
  /** Output quality 1–100. */
  quality?: number;
  /** Output format. */
  format?: 'webp' | 'avif' | 'jpg' | 'png';
}

export interface MojiImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'> {
  /** A `media` URL string, or a rich-text image node. */
  field: string | MojiImageNode | null | undefined;
  /** Alt text. Falls back to a node's `alt`, then `''`. */
  alt?: string;
  /** Optional transform params appended to the URL as query string. */
  transform?: ImageTransform;
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

/**
 * Renders a Mojimoto `media` field or rich-text image node as an `<img>`.
 *
 * ```tsx
 * <MojiImage field={doc.data.background_image} alt="Hero" transform={{ width: 1280 }} />
 * ```
 */
export function MojiImage({ field, alt, transform, ...rest }: MojiImageProps) {
  if (!field) return null;

  const isNode = typeof field !== 'string';
  const url = isNode ? field.url : field;
  if (!url) return null;

  const resolvedAlt = alt ?? (isNode ? (field.alt ?? '') : '');
  const dimensions = isNode ? field.dimensions : undefined;

  return (
    <img
      {...rest}
      src={applyTransform(url, transform)}
      alt={resolvedAlt}
      width={transform?.width ?? dimensions?.width}
      height={transform?.height ?? dimensions?.height}
    />
  );
}
