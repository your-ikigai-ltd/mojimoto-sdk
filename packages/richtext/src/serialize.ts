import type {
  MojiEmbedNode,
  MojiImageNode,
  MojiRichText,
  MojiRichTextNode,
  MojiSpan,
  MojiTableCell,
  MojiTableNode,
  MojiTableRow,
  MojiTextNode,
} from './types';

/**
 * Arguments passed to a block-level serializer that wraps children
 * (paragraphs, headings, list items, list wrappers).
 */
export interface BlockArgs<TNode, TChild> {
  node: TNode;
  children: TChild[];
  key: string;
}

/** Arguments for leaf blocks that have no rich children (image, embed). */
export interface LeafArgs<TNode> {
  node: TNode;
  key: string;
}

/** Arguments for list wrappers (`<ul>` / `<ol>`), whose children are items. */
export interface ListArgs<TChild> {
  children: TChild[];
  key: string;
}

/** Arguments for a table: `head` holds leading all-header rows, `body` the rest. */
export interface TableArgs<TChild> {
  node: MojiTableNode;
  head: TChild[];
  body: TChild[];
  key: string;
}

/** Arguments for a table row, whose children are serialized cells. */
export interface TableRowArgs<TChild> {
  node: MojiTableRow;
  children: TChild[];
  key: string;
}

/** Arguments for a table cell, whose children are its inline content. */
export interface TableCellArgs<TChild> {
  node: MojiTableCell;
  children: TChild[];
  key: string;
}

/** Arguments for a plain run of text inside a block. */
export interface TextRunArgs {
  text: string;
  key: string;
}

/**
 * A complete serializer mapping every node kind to a value of type `T`.
 * Framework adapters (`@mojimoto/react`, `@mojimoto/vue`) provide a full set of
 * defaults; end users override individual entries via a partial
 * {@link MojiRichTextComponents} map.
 */
export interface MojiRichTextSerializer<T> {
  paragraph(args: BlockArgs<MojiTextNode, T>): T;
  heading1(args: BlockArgs<MojiTextNode, T>): T;
  heading2(args: BlockArgs<MojiTextNode, T>): T;
  heading3(args: BlockArgs<MojiTextNode, T>): T;
  heading4(args: BlockArgs<MojiTextNode, T>): T;
  heading5(args: BlockArgs<MojiTextNode, T>): T;
  heading6(args: BlockArgs<MojiTextNode, T>): T;
  preformatted(args: BlockArgs<MojiTextNode, T>): T;
  list(args: ListArgs<T>): T;
  oList(args: ListArgs<T>): T;
  listItem(args: BlockArgs<MojiTextNode, T>): T;
  oListItem(args: BlockArgs<MojiTextNode, T>): T;
  image(args: LeafArgs<MojiImageNode>): T;
  embed(args: LeafArgs<MojiEmbedNode>): T;
  table(args: TableArgs<T>): T;
  tableRow(args: TableRowArgs<T>): T;
  tableCell(args: TableCellArgs<T>): T;
  strong(args: BlockArgs<MojiSpan, T>): T;
  em(args: BlockArgs<MojiSpan, T>): T;
  label(args: BlockArgs<MojiSpan, T>): T;
  hyperlink(args: BlockArgs<MojiSpan, T>): T;
  /** A plain (unformatted) run of text. */
  text(args: TextRunArgs): T;
}

/**
 * A partial serializer — override only the node kinds you care about. This is
 * the shape of the `components` prop on `<MojiRichText>`.
 */
export type MojiRichTextComponents<T> = Partial<MojiRichTextSerializer<T>>;

const HEADING_TYPES = new Set<MojiTextNode['type']>([
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
]);

/**
 * Serialize a rich-text document into an array of `T`, one entry per top-level
 * block. Consecutive list items are grouped into a single list wrapper, and a
 * block's text + spans are composed into nested children before serialization.
 *
 * This is the framework-agnostic engine behind every renderer in the SDK.
 */
export function serialize<T>(
  nodes: MojiRichText | null | undefined,
  serializer: MojiRichTextSerializer<T>,
): T[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const out: T[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < nodes.length) {
    const node = nodes[i]!;

    if (node.type === 'list-item' || node.type === 'o-list-item') {
      const ordered = node.type === 'o-list-item';
      const items: T[] = [];

      while (i < nodes.length && nodes[i]!.type === node.type) {
        const item = nodes[i] as MojiTextNode;
        const key = `i-${i}`;
        const children = composeText(item.text, item.spans, serializer, key);
        items.push(
          ordered
            ? serializer.oListItem({ node: item, children, key })
            : serializer.listItem({ node: item, children, key }),
        );
        i++;
      }

      const key = `l-${blockKey++}`;
      out.push(ordered ? serializer.oList({ children: items, key }) : serializer.list({ children: items, key }));
      continue;
    }

    out.push(serializeBlock(node, serializer, `b-${blockKey++}`));
    i++;
  }

  return out;
}

function serializeBlock<T>(node: MojiRichTextNode, serializer: MojiRichTextSerializer<T>, key: string): T {
  if (node.type === 'image') {
    return serializer.image({ node, key });
  }
  if (node.type === 'embed') {
    return serializer.embed({ node, key });
  }
  if (node.type === 'table') {
    return serializeTable(node, serializer, key);
  }

  const children = composeText(node.text, node.spans, serializer, key);

  if (node.type === 'paragraph') return serializer.paragraph({ node, children, key });
  if (node.type === 'preformatted') return serializer.preformatted({ node, children, key });
  if (HEADING_TYPES.has(node.type)) {
    return serializer[node.type as 'heading1']({ node, children, key });
  }

  // Unknown block type: fall back to a paragraph so content is never dropped.
  return serializer.paragraph({ node, children, key });
}

/**
 * Serialize a table: rows split into leading all-header rows (the head) and
 * the rest (the body); each cell's text + spans compose like any text block.
 */
function serializeTable<T>(node: MojiTableNode, serializer: MojiRichTextSerializer<T>, key: string): T {
  const rows = Array.isArray(node.rows) ? node.rows : [];
  const head: T[] = [];
  const body: T[] = [];
  let inHead = true;

  rows.forEach((row, r) => {
    const cells = Array.isArray(row.cells) ? row.cells : [];
    const rowKey = `${key}-r${r}`;
    const isHeaderRow = cells.length > 0 && cells.every((cell) => cell.header === true);

    if (!isHeaderRow) inHead = false;

    const children = cells.map((cell, c) => {
      const cellKey = `${rowKey}-c${c}`;
      return serializer.tableCell({
        node: cell,
        children: composeText(cell.text ?? '', cell.spans, serializer, cellKey),
        key: cellKey,
      });
    });

    const serialized = serializer.tableRow({ node: row, children, key: rowKey });
    (inHead && isHeaderRow ? head : body).push(serialized);
  });

  return serializer.table({ node, head, body, key });
}

/**
 * Compose a block's plain text and overlapping spans into an ordered list of
 * serialized children. Spans are well-nested (a property of structured text),
 * so they are resolved recursively.
 */
function composeText<T>(
  text: string,
  spans: MojiSpan[] | undefined,
  serializer: MojiRichTextSerializer<T>,
  keyPrefix: string,
): T[] {
  if (!spans || spans.length === 0) {
    return text ? [serializer.text({ text, key: `${keyPrefix}-t` })] : [];
  }

  // Sort by start ascending, then by end descending so outer spans come first.
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  return build(0, text.length, sorted, keyPrefix);

  function build(from: number, to: number, list: MojiSpan[], kp: string): T[] {
    const result: T[] = [];
    let cursor = from;
    let n = 0;
    let i = 0;

    while (i < list.length) {
      const span = list[i]!;

      // Skip spans that fall outside the current range.
      if (span.start < from || span.start >= to || span.end <= from) {
        i++;
        continue;
      }

      if (span.start > cursor) {
        result.push(serializer.text({ text: text.slice(cursor, span.start), key: `${kp}-${n++}` }));
      }

      // Gather spans strictly nested within this one.
      const inner: MojiSpan[] = [];
      let j = i + 1;
      while (j < list.length && list[j]!.start < span.end) {
        if (list[j]!.end <= span.end) {
          inner.push(list[j]!);
        }
        j++;
      }

      const innerKey = `${kp}-${n}`;
      const children = inner.length
        ? build(span.start, span.end, inner, innerKey)
        : text.slice(span.start, span.end)
          ? [serializer.text({ text: text.slice(span.start, span.end), key: `${innerKey}-t` })]
          : [];

      result.push(renderSpan(span, children, innerKey));
      cursor = span.end;
      n++;
      i = j;
    }

    if (cursor < to) {
      result.push(serializer.text({ text: text.slice(cursor, to), key: `${kp}-${n++}` }));
    }

    return result;
  }

  function renderSpan(span: MojiSpan, children: T[], key: string): T {
    switch (span.type) {
      case 'strong':
        return serializer.strong({ node: span, children, key });
      case 'em':
        return serializer.em({ node: span, children, key });
      case 'label':
        return serializer.label({ node: span, children, key });
      case 'hyperlink':
        return serializer.hyperlink({ node: span, children, key });
      default:
        return serializer.text({ text: text.slice(span.start, span.end), key });
    }
  }
}
