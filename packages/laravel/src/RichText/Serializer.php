<?php

namespace Mojimoto\Laravel\RichText;

/**
 * The framework-agnostic rich text engine, a port of `@mojimoto/richtext`.
 * Walks the block list, groups consecutive list items, composes each block's
 * text and spans into nested children, and hands every node to a handler.
 *
 * Handlers are keyed by node kind (`paragraph`, `heading1`…`heading6`,
 * `preformatted`, `list`, `oList`, `listItem`, `oListItem`, `image`, `embed`,
 * `table`, `tableRow`, `tableCell`, `strong`, `em`, `label`, `hyperlink`,
 * `text`) and receive an array of arguments matching the JS serializer.
 */
class Serializer
{
    private const HEADINGS = ['heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6'];

    /** @var array<string, callable> */
    private array $handlers;

    /**
     * @param  array<string, callable>  $handlers
     */
    public function __construct(array $handlers)
    {
        $this->handlers = $handlers;
    }

    public function serialize(?array $nodes): array
    {
        if (! is_array($nodes)) {
            return [];
        }

        $out = [];
        $index = 0;
        $blockKey = 0;
        $count = count($nodes);

        while ($index < $count) {
            $node = $nodes[$index];

            if (! is_array($node)) {
                $index++;

                continue;
            }

            $type = $node['type'] ?? 'paragraph';

            if ($type === 'list-item' || $type === 'o-list-item') {
                $ordered = $type === 'o-list-item';
                $items = [];

                while ($index < $count && ($nodes[$index]['type'] ?? null) === $type) {
                    $item = $nodes[$index];
                    $key = "i-{$index}";
                    $children = $this->composeText($item['text'] ?? '', $item['spans'] ?? [], $key);

                    $items[] = $this->call($ordered ? 'oListItem' : 'listItem', ['node' => $item, 'children' => $children, 'key' => $key]);

                    $index++;
                }

                $key = 'l-'.$blockKey++;
                $out[] = $this->call($ordered ? 'oList' : 'list', ['children' => $items, 'key' => $key]);

                continue;
            }

            $out[] = $this->serializeBlock($node, 'b-'.$blockKey++);
            $index++;
        }

        return $out;
    }

    private function serializeBlock(array $node, string $key): mixed
    {
        $type = $node['type'] ?? 'paragraph';

        if ($type === 'image') {
            return $this->call('image', ['node' => $node, 'key' => $key]);
        }

        if ($type === 'embed') {
            return $this->call('embed', ['node' => $node, 'key' => $key]);
        }

        if ($type === 'table') {
            return $this->serializeTable($node, $key);
        }

        $children = $this->composeText($node['text'] ?? '', $node['spans'] ?? [], $key);
        $args = ['node' => $node, 'children' => $children, 'key' => $key];

        if ($type === 'preformatted') {
            return $this->call('preformatted', $args);
        }

        if (in_array($type, self::HEADINGS, true)) {
            return $this->call($type, $args);
        }

        return $this->call('paragraph', $args);
    }

    private function serializeTable(array $node, string $key): mixed
    {
        $rows = is_array($node['rows'] ?? null) ? $node['rows'] : [];
        $head = [];
        $body = [];
        $inHead = true;

        foreach ($rows as $rowIndex => $row) {
            $cells = is_array($row['cells'] ?? null) ? $row['cells'] : [];
            $rowKey = "{$key}-r{$rowIndex}";

            $isHeaderRow = $cells !== [] && array_reduce($cells, fn ($carry, $cell) => $carry && (($cell['header'] ?? false) === true), true);

            if (! $isHeaderRow) {
                $inHead = false;
            }

            $children = [];

            foreach ($cells as $cellIndex => $cell) {
                $cellKey = "{$rowKey}-c{$cellIndex}";

                $children[] = $this->call('tableCell', [
                    'node' => $cell,
                    'children' => $this->composeText($cell['text'] ?? '', $cell['spans'] ?? [], $cellKey),
                    'key' => $cellKey,
                ]);
            }

            $serialized = $this->call('tableRow', ['node' => $row, 'children' => $children, 'key' => $rowKey]);

            if ($inHead && $isHeaderRow) {
                $head[] = $serialized;
            } else {
                $body[] = $serialized;
            }
        }

        return $this->call('table', ['node' => $node, 'head' => $head, 'body' => $body, 'key' => $key]);
    }

    private function composeText(string $text, array $spans, string $keyPrefix): array
    {
        if ($spans === []) {
            return $text === '' ? [] : [$this->text($text, "{$keyPrefix}-t")];
        }

        usort($spans, fn (array $a, array $b) => ($a['start'] <=> $b['start']) ?: ($b['end'] <=> $a['end']));

        return $this->build($text, 0, Utf16::length($text), $spans, $keyPrefix);
    }

    private function build(string $text, int $from, int $to, array $spans, string $keyPrefix): array
    {
        $result = [];
        $cursor = $from;
        $n = 0;
        $i = 0;
        $count = count($spans);

        while ($i < $count) {
            $span = $spans[$i];
            $start = (int) $span['start'];
            $end = (int) $span['end'];

            $outsideRange = $start < $from || $start >= $to || $end <= $from;

            if ($outsideRange) {
                $i++;

                continue;
            }

            if ($start > $cursor) {
                $result[] = $this->text(Utf16::slice($text, $cursor, $start), "{$keyPrefix}-".$n++);
            }

            $inner = [];
            $j = $i + 1;

            while ($j < $count && $spans[$j]['start'] < $end) {
                if ($spans[$j]['end'] <= $end) {
                    $inner[] = $spans[$j];
                }

                $j++;
            }

            $innerKey = "{$keyPrefix}-{$n}";
            $slice = Utf16::slice($text, $start, $end);

            if ($inner !== []) {
                $children = $this->build($text, $start, $end, $inner, $innerKey);
            } else {
                $children = $slice === '' ? [] : [$this->text($slice, "{$innerKey}-t")];
            }

            $result[] = $this->renderSpan($span, $children, $slice, $innerKey);

            $cursor = $end;
            $n++;
            $i = $j;
        }

        if ($cursor < $to) {
            $result[] = $this->text(Utf16::slice($text, $cursor, $to), "{$keyPrefix}-".$n);
        }

        return $result;
    }

    private function renderSpan(array $span, array $children, string $slice, string $key): mixed
    {
        $type = $span['type'] ?? '';

        if (in_array($type, ['strong', 'em', 'label', 'hyperlink'], true)) {
            return $this->call($type, ['node' => $span, 'children' => $children, 'key' => $key]);
        }

        return $this->text($slice, $key);
    }

    private function text(string $text, string $key): mixed
    {
        return $this->call('text', ['text' => $text, 'key' => $key]);
    }

    private function call(string $handler, array $args): mixed
    {
        if (! isset($this->handlers[$handler])) {
            throw new \InvalidArgumentException("Rich text serializer has no handler for \"{$handler}\".");
        }

        return ($this->handlers[$handler])($args);
    }
}
