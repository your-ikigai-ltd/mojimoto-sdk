/**
 * The Mojimoto rich-text model.
 *
 * A `rich_text` field is delivered as an ordered array of block nodes. Inline
 * formatting (bold, italic, links, …) is expressed as `spans` — character
 * ranges layered over a block's plain `text`. This mirrors the structured-text
 * model so migrations from Prismic are loss-free.
 */

/** The set of block types that carry text + inline spans. */
export type MojiTextBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'preformatted'
  | 'list-item'
  | 'o-list-item';

/** Inline span types layered over a block's text. */
export type MojiSpanType = 'strong' | 'em' | 'label' | 'hyperlink';

/**
 * A link value, as carried by a `hyperlink` span or a `link`/`media` field.
 * `link_type` distinguishes web URLs, links to other documents, and media.
 */
export interface MojiLink {
  link_type?: 'Web' | 'Document' | 'Media' | (string & {});
  /** Absolute URL for web/media links. */
  url?: string;
  /** Anchor target, e.g. `_blank`. */
  target?: string;
  /** Document link: the linked entry's id. */
  id?: number | string;
  /** Document link: the linked entry's uid. */
  uid?: string | null;
  /** Document link: the linked entry's content type api id. */
  type?: string;
  /** Document link: locale. */
  lang?: string;
}

/** A character range with formatting applied over a block's text. */
export interface MojiSpan {
  start: number;
  end: number;
  type: MojiSpanType;
  /** `hyperlink` carries a {@link MojiLink}; `label` carries `{ label }`. */
  data?: MojiLink | { label: string } | Record<string, unknown>;
}

/** A text-bearing block (paragraph, heading, list item, …). */
export interface MojiTextNode {
  type: MojiTextBlockType;
  text: string;
  spans: MojiSpan[];
  direction?: 'ltr' | 'rtl';
}

/** An image block. */
export interface MojiImageNode {
  type: 'image';
  url: string;
  alt?: string | null;
  copyright?: string | null;
  dimensions?: { width: number; height: number };
  /** Optional link wrapping the image. */
  linkTo?: MojiLink;
}

/** An oEmbed block (video, tweet, …). */
export interface MojiEmbedNode {
  type: 'embed';
  oembed: {
    html?: string;
    embed_url?: string;
    type?: string;
    provider_name?: string;
    [key: string]: unknown;
  };
}

/** Any single node in a rich-text document. */
export type MojiRichTextNode = MojiTextNode | MojiImageNode | MojiEmbedNode;

/** A `rich_text` field value: an ordered list of nodes. */
export type MojiRichText = MojiRichTextNode[];

/**
 * Resolves a {@link MojiLink} to an `href` string. Supply one to control how
 * document links become URLs (e.g. `(link) => `/${link.uid}``).
 */
export type MojiLinkResolver = (link: MojiLink) => string | null | undefined;
