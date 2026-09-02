<?php

namespace Mojimoto\Laravel\RichText;

use Closure;
use Illuminate\Support\HtmlString;

/**
 * Render a `rich_text` field to HTML or plain text.
 *
 *     {!! RichText::html($doc->get('body')) !!}
 *     RichText::text($doc->get('body'), ' ')
 *
 * Pass `components` to override individual node kinds, and `linkResolver` to
 * turn document links into hrefs. Text is always escaped; override closures
 * receive already-serialized `children` strings.
 */
class RichText
{
    public static function html(?array $nodes, array $options = []): HtmlString
    {
        $linkResolver = $options['linkResolver'] ?? null;
        $components = $options['components'] ?? [];

        $join = fn (array $children) => implode('', $children);

        $defaults = [
            'paragraph' => fn ($a) => '<p>'.$join($a['children']).'</p>',
            'heading1' => fn ($a) => '<h1>'.$join($a['children']).'</h1>',
            'heading2' => fn ($a) => '<h2>'.$join($a['children']).'</h2>',
            'heading3' => fn ($a) => '<h3>'.$join($a['children']).'</h3>',
            'heading4' => fn ($a) => '<h4>'.$join($a['children']).'</h4>',
            'heading5' => fn ($a) => '<h5>'.$join($a['children']).'</h5>',
            'heading6' => fn ($a) => '<h6>'.$join($a['children']).'</h6>',
            'preformatted' => fn ($a) => '<pre>'.static::escape($a['node']['text'] ?? '').'</pre>',
            'list' => fn ($a) => '<ul>'.$join($a['children']).'</ul>',
            'oList' => fn ($a) => '<ol>'.$join($a['children']).'</ol>',
            'listItem' => fn ($a) => '<li>'.$join($a['children']).'</li>',
            'oListItem' => fn ($a) => '<li>'.$join($a['children']).'</li>',
            'image' => function ($a) use ($linkResolver) {
                $node = $a['node'];
                $img = '<img src="'.static::escape($node['url'] ?? '').'" alt="'.static::escape($node['alt'] ?? '').'" />';

                $linkTo = $node['linkTo'] ?? null;

                $wrapped = is_array($linkTo) ? '<a '.static::linkAttributes($linkTo, $linkResolver).'>'.$img.'</a>' : $img;

                return '<figure>'.$wrapped.'</figure>';
            },
            'embed' => function ($a) {
                $oembed = $a['node']['oembed'] ?? [];

                return '<div data-oembed="'.static::escape($oembed['embed_url'] ?? '').'">'.($oembed['html'] ?? '').'</div>';
            },
            'table' => function ($a) use ($join) {
                $head = $a['head'] === [] ? '' : '<thead>'.$join($a['head']).'</thead>';

                return '<table>'.$head.'<tbody>'.$join($a['body']).'</tbody></table>';
            },
            'tableRow' => fn ($a) => '<tr>'.$join($a['children']).'</tr>',
            'tableCell' => fn ($a) => ($a['node']['header'] ?? false)
                ? '<th>'.$join($a['children']).'</th>'
                : '<td>'.$join($a['children']).'</td>',
            'strong' => fn ($a) => '<strong>'.$join($a['children']).'</strong>',
            'em' => fn ($a) => '<em>'.$join($a['children']).'</em>',
            'label' => function ($a) use ($join) {
                $label = $a['node']['data']['label'] ?? null;
                $class = $label ? ' class="'.static::escape($label).'"' : '';

                return '<span'.$class.'>'.$join($a['children']).'</span>';
            },
            'hyperlink' => fn ($a) => '<a '.static::linkAttributes($a['node']['data'] ?? [], $linkResolver).'>'.$join($a['children']).'</a>',
            'text' => fn ($a) => str_replace("\n", '<br>', static::escape($a['text'])),
        ];

        $serializer = new Serializer([...$defaults, ...$components]);

        return new HtmlString(implode('', $serializer->serialize($nodes)));
    }

    public static function text(?array $nodes, string $separator = "\n"): string
    {
        if (! is_array($nodes)) {
            return '';
        }

        $parts = [];

        foreach ($nodes as $node) {
            if (! is_array($node)) {
                continue;
            }

            if (($node['type'] ?? null) === 'table') {
                $rows = [];

                foreach ($node['rows'] ?? [] as $row) {
                    $rows[] = implode("\t", array_map(fn ($cell) => $cell['text'] ?? '', $row['cells'] ?? []));
                }

                $parts[] = implode($separator, $rows);

                continue;
            }

            $parts[] = is_string($node['text'] ?? null) ? $node['text'] : '';
        }

        return implode($separator, array_values(array_filter($parts, fn ($part) => $part !== '')));
    }

    public static function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function resolveHref(array $link, ?Closure $linkResolver): string
    {
        if (($link['link_type'] ?? null) === 'Document' && $linkResolver !== null) {
            return (string) ($linkResolver($link) ?? '');
        }

        if (isset($link['url'])) {
            return (string) $link['url'];
        }

        return $linkResolver !== null ? (string) ($linkResolver($link) ?? '') : '';
    }

    private static function linkAttributes(array $link, ?Closure $linkResolver): string
    {
        $href = static::resolveHref($link, $linkResolver);
        $target = isset($link['target']) ? ' target="'.static::escape($link['target']).'"' : '';
        $rel = ($link['target'] ?? null) === '_blank' ? ' rel="noopener noreferrer"' : '';

        return 'href="'.static::escape($href).'"'.$target.$rel;
    }
}
