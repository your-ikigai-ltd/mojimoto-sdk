<?php

use Mojimoto\Laravel\RichText\RichText;
use Mojimoto\Laravel\RichText\Serializer;
use Mojimoto\Laravel\RichText\Utf16;

function sexp(): Serializer
{
    $join = fn (array $a) => implode('', $a['children']);

    return new Serializer([
        'paragraph' => fn ($a) => '(p '.$join($a).')',
        'heading1' => fn ($a) => '(h1 '.$join($a).')',
        'heading2' => fn ($a) => '(h2 '.$join($a).')',
        'heading3' => fn ($a) => '(h3 '.$join($a).')',
        'heading4' => fn ($a) => '(h4 '.$join($a).')',
        'heading5' => fn ($a) => '(h5 '.$join($a).')',
        'heading6' => fn ($a) => '(h6 '.$join($a).')',
        'preformatted' => fn ($a) => '(pre '.$a['node']['text'].')',
        'list' => fn ($a) => '(ul '.$join($a).')',
        'oList' => fn ($a) => '(ol '.$join($a).')',
        'listItem' => fn ($a) => '(li '.$join($a).')',
        'oListItem' => fn ($a) => '(li '.$join($a).')',
        'image' => fn ($a) => '(img '.$a['node']['url'].')',
        'embed' => fn ($a) => '(embed '.$a['node']['oembed']['embed_url'].')',
        'table' => fn ($a) => '(table (thead '.implode('', $a['head']).') (tbody '.implode('', $a['body']).'))',
        'tableRow' => fn ($a) => '(tr '.$join($a).')',
        'tableCell' => fn ($a) => '('.(($a['node']['header'] ?? false) ? 'th' : 'td').' '.$join($a).')',
        'strong' => fn ($a) => '(b '.$join($a).')',
        'em' => fn ($a) => '(i '.$join($a).')',
        'label' => fn ($a) => '(label '.$join($a).')',
        'hyperlink' => fn ($a) => '(a:'.($a['node']['data']['url'] ?? '').' '.$join($a).')',
        'text' => fn ($a) => $a['text'],
    ]);
}

it('returns an empty list for empty or invalid input', function () {
    expect(sexp()->serialize(null))->toBe([]);
    expect(sexp()->serialize([]))->toBe([]);
});

it('renders a plain paragraph', function () {
    expect(sexp()->serialize([['type' => 'paragraph', 'text' => 'Hello', 'spans' => []]]))->toBe(['(p Hello)']);
});

it('renders a single span', function () {
    $doc = [['type' => 'paragraph', 'text' => 'Hello world', 'spans' => [['start' => 0, 'end' => 5, 'type' => 'strong']]]];

    expect(implode('', sexp()->serialize($doc)))->toBe('(p (b Hello) world)');
});

it('renders nested spans', function () {
    $doc = [[
        'type' => 'paragraph',
        'text' => 'abcd',
        'spans' => [
            ['start' => 0, 'end' => 4, 'type' => 'strong'],
            ['start' => 1, 'end' => 3, 'type' => 'em'],
        ],
    ]];

    expect(implode('', sexp()->serialize($doc)))->toBe('(p (b a(i bc)d))');
});

it('renders a hyperlink span with data', function () {
    $doc = [[
        'type' => 'paragraph',
        'text' => 'go here',
        'spans' => [['start' => 3, 'end' => 7, 'type' => 'hyperlink', 'data' => ['link_type' => 'Web', 'url' => 'https://x.test']]],
    ]];

    expect(implode('', sexp()->serialize($doc)))->toBe('(p go (a:https://x.test here))');
});

it('groups consecutive list items into a single list', function () {
    $doc = [
        ['type' => 'list-item', 'text' => 'one', 'spans' => []],
        ['type' => 'list-item', 'text' => 'two', 'spans' => []],
        ['type' => 'paragraph', 'text' => 'gap', 'spans' => []],
        ['type' => 'o-list-item', 'text' => 'a', 'spans' => []],
        ['type' => 'o-list-item', 'text' => 'b', 'spans' => []],
    ];

    expect(implode('', sexp()->serialize($doc)))->toBe('(ul (li one)(li two))(p gap)(ol (li a)(li b))');
});

it('renders image and embed leaves', function () {
    $doc = [
        ['type' => 'image', 'url' => 'https://img.test/a.jpg', 'alt' => 'a'],
        ['type' => 'embed', 'oembed' => ['embed_url' => 'https://yt.test/1']],
    ];

    expect(sexp()->serialize($doc))->toBe(['(img https://img.test/a.jpg)', '(embed https://yt.test/1)']);
});

it('slices spans by UTF-16 code units so emoji do not shift offsets', function () {
    $doc = [['type' => 'paragraph', 'text' => '🚀 launch ready', 'spans' => [['start' => 3, 'end' => 9, 'type' => 'strong']]]];

    expect(implode('', sexp()->serialize($doc)))->toBe('(p 🚀 (b launch) ready)');
    expect(Utf16::length('🚀'))->toBe(2);
});

it('joins block text with the separator and skips empties', function () {
    $doc = [
        ['type' => 'heading1', 'text' => 'Title', 'spans' => []],
        ['type' => 'paragraph', 'text' => '', 'spans' => []],
        ['type' => 'paragraph', 'text' => 'Body', 'spans' => []],
    ];

    expect(RichText::text($doc))->toBe("Title\nBody");
    expect(RichText::text($doc, ' '))->toBe('Title Body');
});

it('escapes text to prevent injection', function () {
    expect(RichText::escape('<b>&"\''))->toBe('&lt;b&gt;&amp;&quot;&#039;');
    expect((string) RichText::html([['type' => 'paragraph', 'text' => '<script>', 'spans' => []]]))->toBe('<p>&lt;script&gt;</p>');
});

it('renders headings, lists and spans as html', function () {
    $doc = [
        ['type' => 'heading2', 'text' => 'Hi', 'spans' => [['start' => 0, 'end' => 2, 'type' => 'strong']]],
        ['type' => 'list-item', 'text' => 'one', 'spans' => []],
        ['type' => 'list-item', 'text' => 'two', 'spans' => []],
    ];

    expect((string) RichText::html($doc))->toBe('<h2><strong>Hi</strong></h2><ul><li>one</li><li>two</li></ul>');
});

it('resolves document links and marks blank targets noopener', function () {
    $doc = [['type' => 'paragraph', 'text' => 'link', 'spans' => [['start' => 0, 'end' => 4, 'type' => 'hyperlink', 'data' => ['link_type' => 'Document', 'uid' => 'about', 'type' => 'page']]]]];

    expect((string) RichText::html($doc, ['linkResolver' => fn ($link) => '/'.$link['uid']]))->toBe('<p><a href="/about">link</a></p>');

    $web = [['type' => 'paragraph', 'text' => 'x', 'spans' => [['start' => 0, 'end' => 1, 'type' => 'hyperlink', 'data' => ['link_type' => 'Web', 'url' => 'https://x.test', 'target' => '_blank']]]]];

    expect((string) RichText::html($web))->toBe('<p><a href="https://x.test" target="_blank" rel="noopener noreferrer">x</a></p>');
});

it('allows per node overrides via components', function () {
    $doc = [['type' => 'paragraph', 'text' => 'x', 'spans' => []]];

    $html = RichText::html($doc, ['components' => ['paragraph' => fn ($a) => '<p class="lead">'.implode('', $a['children']).'</p>']]);

    expect((string) $html)->toBe('<p class="lead">x</p>');
});

it('renders header rows in thead and the rest in tbody', function () {
    $html = RichText::html([[
        'type' => 'table',
        'rows' => [
            ['cells' => [['text' => 'Do', 'spans' => [], 'header' => true], ['text' => 'Do not', 'spans' => [], 'header' => true]]],
            ['cells' => [['text' => 'Be clear', 'spans' => [['start' => 0, 'end' => 2, 'type' => 'strong']]], ['text' => 'Mislead', 'spans' => []]]],
        ],
    ]]);

    expect((string) $html)->toBe('<table><thead><tr><th>Do</th><th>Do not</th></tr></thead><tbody><tr><td><strong>Be</strong> clear</td><td>Mislead</td></tr></tbody></table>');
});

it('flattens tables to tab separated text', function () {
    expect(RichText::text([['type' => 'table', 'rows' => [['cells' => [['text' => 'a', 'spans' => []], ['text' => 'b', 'spans' => []]]]]]]))->toBe("a\tb");
});
