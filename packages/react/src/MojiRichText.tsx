import { Fragment, cloneElement, isValidElement, type ReactNode } from 'react';
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

export type { MojiRichTextComponents };

export interface MojiRichTextProps {
  /** The `rich_text` field value to render. */
  field: MojiRichTextValue | null | undefined;
  /** Per-node overrides, merged over the defaults and context components. */
  components?: MojiRichTextComponents<ReactNode>;
  /** Link resolver for document links inside the text. */
  linkResolver?: MojiLinkResolver;
  /** Rendered when the field is empty. */
  fallback?: ReactNode;
}

function buildDefaults(linkResolver?: MojiLinkResolver): MojiRichTextSerializer<ReactNode> {
  return {
    paragraph: ({ children }) => <p>{children}</p>,
    heading1: ({ children }) => <h1>{children}</h1>,
    heading2: ({ children }) => <h2>{children}</h2>,
    heading3: ({ children }) => <h3>{children}</h3>,
    heading4: ({ children }) => <h4>{children}</h4>,
    heading5: ({ children }) => <h5>{children}</h5>,
    heading6: ({ children }) => <h6>{children}</h6>,
    preformatted: ({ node }) => <pre>{node.text}</pre>,
    list: ({ children }) => <ul>{children}</ul>,
    oList: ({ children }) => <ol>{children}</ol>,
    listItem: ({ children }) => <li>{children}</li>,
    oListItem: ({ children }) => <li>{children}</li>,
    image: ({ node }) => {
      const img = <MojiImage field={node} />;
      return node.linkTo ? (
        <MojiLink field={node.linkTo} linkResolver={linkResolver}>
          {img}
        </MojiLink>
      ) : (
        img
      );
    },
    embed: ({ node }) =>
      node.oembed.html ? (
        <div data-oembed={node.oembed.embed_url} dangerouslySetInnerHTML={{ __html: node.oembed.html }} />
      ) : null,
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    label: ({ node, children }) => {
      const className = (node.data as { label?: string } | undefined)?.label;
      return <span className={className}>{children}</span>;
    },
    hyperlink: ({ node, children }) => (
      <MojiLink field={node.data as MojiLinkValue} linkResolver={linkResolver}>
        {children}
      </MojiLink>
    ),
    text: ({ text }) => text,
  };
}

/** Wrap a serializer method so its returned element always carries its key. */
function keyed<A extends { key: string }>(fn: (args: A) => ReactNode): (args: A) => ReactNode {
  return (args) => {
    const result = fn(args);
    return isValidElement(result) ? cloneElement(result, { key: args.key }) : result;
  };
}

/**
 * Renders a Mojimoto `rich_text` field. Override any block or span with the
 * `components` prop; everything else uses sensible HTML defaults.
 *
 * ```tsx
 * <MojiRichText
 *   field={doc.data.body}
 *   components={{ heading2: ({ children }) => <h2 className="text-2xl">{children}</h2> }}
 * />
 * ```
 */
export function MojiRichText({ field, components, linkResolver, fallback = null }: MojiRichTextProps) {
  const ctx = useMojimotoContext();

  if (!Array.isArray(field) || field.length === 0) {
    return <>{fallback}</>;
  }

  const merged = {
    ...buildDefaults(linkResolver ?? ctx.linkResolver),
    ...ctx.richTextComponents,
    ...components,
  } as MojiRichTextSerializer<ReactNode>;

  // Apply automatic keys so consumers never manage them.
  const serializer = Object.fromEntries(
    Object.entries(merged).map(([type, fn]) => [type, keyed(fn as (a: { key: string }) => ReactNode)]),
  ) as unknown as MojiRichTextSerializer<ReactNode>;

  return <>{serialize(field, serializer).map((node, i) => (isValidElement(node) ? node : <Fragment key={i}>{node}</Fragment>))}</>;
}
