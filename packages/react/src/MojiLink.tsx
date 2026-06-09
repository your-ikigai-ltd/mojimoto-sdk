import { type AnchorHTMLAttributes, type ElementType, type ReactNode } from 'react';
import type { MojiLink as MojiLinkValue, MojiLinkResolver } from '@mojimoto/richtext';
import { useMojimotoContext } from './context';

/** Resolve a link value to an href using a resolver for document links. */
export function resolveHref(link: MojiLinkValue | undefined, resolver?: MojiLinkResolver): string | undefined {
  if (!link) return undefined;
  if (link.link_type === 'Document' && resolver) return resolver(link) ?? undefined;
  return link.url ?? resolver?.(link) ?? undefined;
}

export interface MojiLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** The link field/span value to render. */
  field: MojiLinkValue | null | undefined;
  /** Override the context link resolver for document links. */
  linkResolver?: MojiLinkResolver;
  /**
   * Render with a custom component (e.g. Next's `Link` or React Router's
   * `Link`). It receives `href` and the anchor props.
   */
  as?: ElementType;
  children?: ReactNode;
}

/**
 * Renders a link field as an `<a>` (or a custom component via `as`), resolving
 * document links through the provided/context resolver and adding safe `rel`
 * for `_blank` targets.
 */
export function MojiLink({ field, linkResolver, as, children, ...rest }: MojiLinkProps) {
  const ctx = useMojimotoContext();
  const href = resolveHref(field ?? undefined, linkResolver ?? ctx.linkResolver);
  const Component = (as ?? 'a') as ElementType;

  const target = field?.target ?? rest.target;
  const rel = target === '_blank' ? (rest.rel ?? 'noopener noreferrer') : rest.rel;

  return (
    <Component {...rest} href={href} target={target} rel={rel}>
      {children}
    </Component>
  );
}
