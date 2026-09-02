<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Mojimoto\Laravel\Client;
use Mojimoto\Laravel\Document;
use Mojimoto\Laravel\Facades\Mojimoto;
use Mojimoto\Laravel\MojimotoException;

function listBody(array $results, int $totalPages = 1, int $page = 1): array
{
    return [
        'results' => $results,
        'page' => $page,
        'per_page' => 20,
        'total_results' => count($results),
        'total_pages' => $totalPages,
        'lang' => 'en-gb',
        'ref' => 'published',
    ];
}

function homeDoc(): array
{
    return [
        'id' => 12,
        'uid' => 'home',
        'type' => 'page',
        'lang' => 'en-gb',
        'status' => 'published',
        'published_at' => '2026-01-01T00:00:00Z',
        'updated_at' => '2026-01-01T00:00:00Z',
        'data' => [
            'title' => 'Home',
            'sections' => [
                ['id' => 1, 'uid' => null, 'type' => 'hero', 'data' => ['heading' => 'Hi']],
                ['id' => 2, 'uid' => null, 'type' => 'faq'],
            ],
        ],
    ];
}

it('fetches a document by uid with depth, lang and the bearer token', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([homeDoc()]))]);

    $page = Mojimoto::byUid('page', 'home', ['depth' => 2]);

    expect($page)->toBeInstanceOf(Document::class)
        ->and($page->uid)->toBe('home')
        ->and($page->get('title'))->toBe('Home');

    Http::assertSent(function ($request) {
        parse_str(parse_url($request->url(), PHP_URL_QUERY), $query);

        return str_starts_with($request->url(), 'https://cms.test/api/v1/demo/documents?')
            && $query['type'] === 'page'
            && $query['uid'] === 'home'
            && $query['depth'] === '2'
            && $query['lang'] === 'en-gb'
            && $query['per_page'] === '1'
            && $request->hasHeader('Authorization', 'Bearer mjmt_test');
    });
});

it('returns null when nothing matches', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([]))]);

    expect(Mojimoto::byUid('page', 'missing'))->toBeNull();
});

it('wraps resolved references and drops stubs', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([homeDoc()]))]);

    $sections = Mojimoto::byUid('page', 'home')->references('sections');

    expect($sections)->toHaveCount(1)
        ->and($sections[0]->type)->toBe('hero')
        ->and($sections[0]['heading'])->toBe('Hi');
});

it('walks every page for all()', function () {
    Http::fake([
        'cms.test/*&page=1&*' => Http::response(listBody([['id' => 1, 'type' => 'article', 'data' => []]], totalPages: 2, page: 1)),
        'cms.test/*&page=2&*' => Http::response(listBody([['id' => 2, 'type' => 'article', 'data' => []]], totalPages: 2, page: 2)),
    ]);

    $all = Mojimoto::all(['type' => 'article']);

    expect(array_map(fn ($doc) => $doc->id, $all))->toBe([1, 2]);
});

it('caches responses and serves the second call from cache', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([homeDoc()]))]);

    Mojimoto::byUid('page', 'home');
    Mojimoto::byUid('page', 'home');

    Http::assertSentCount(1);
});

it('flush() invalidates every cached response', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([homeDoc()]))]);

    Mojimoto::byUid('page', 'home');
    Mojimoto::flush();
    Mojimoto::byUid('page', 'home');

    Http::assertSentCount(2);
    expect(Cache::get('mojimoto:demo:generation'))->toBe(2);
});

it('bypasses the cache and requests drafts in preview mode', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([homeDoc()]))]);

    Mojimoto::usePreview();
    Mojimoto::byUid('page', 'home');
    Mojimoto::byUid('page', 'home');

    Http::assertSentCount(2);
    Http::assertSent(fn ($request) => str_contains($request->url(), 'ref=preview'));
});

it('throws a MojimotoException with the status for failed requests', function () {
    Http::fake(['cms.test/*' => Http::response(['message' => 'nope'], 404)]);

    try {
        Mojimoto::byId(99);
        $this->fail('Expected exception');
    } catch (MojimotoException $exception) {
        expect($exception->status)->toBe(404)
            ->and($exception->isNotFound())->toBeTrue()
            ->and($exception->body)->toBe(['message' => 'nope']);
    }
});

it('findByUid throws when the document is missing', function () {
    Http::fake(['cms.test/*' => Http::response(listBody([]))]);

    expect(fn () => Mojimoto::findByUid('page', 'missing'))->toThrow(MojimotoException::class);
});

it('retries transient failures when configured', function () {
    config()->set('mojimoto.retries', 1);
    app()->forgetScopedInstances();

    Http::fake(['cms.test/*' => Http::sequence()->push(['message' => 'busy'], 503)->push(listBody([homeDoc()]))]);

    expect(app(Client::class)->byUid('page', 'home'))->not->toBeNull();

    Http::assertSentCount(2);
});
