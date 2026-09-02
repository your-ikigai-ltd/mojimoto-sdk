# mojimoto/laravel

Laravel integration for the [Mojimoto](https://mojimoto.com) headless CMS: a delivery client with response caching, rich text rendering for Blade, signed webhooks that flush the cache on publish, and a draft preview mode.

```bash
composer require mojimoto/laravel
```

Add your project credentials to `.env` (create a **read** token in the Mojimoto dashboard, add the **preview** ability if you want drafts):

```dotenv
MOJIMOTO_ENDPOINT=https://mojimoto.com/api/v1
MOJIMOTO_PROJECT=your-project-id
MOJIMOTO_TOKEN=mjmt_...
MOJIMOTO_WEBHOOK_SECRET=...
MOJIMOTO_PREVIEW_SECRET=some-long-random-string
```

Publish the config if you want to change caching, the webhook path or the preview cookie:

```bash
php artisan vendor:publish --tag=mojimoto-config
```

## Fetching content

```php
use Mojimoto\Laravel\Facades\Mojimoto;

$home = Mojimoto::byUid('page', 'home', ['depth' => 2]);
$articles = Mojimoto::all(['type' => 'article', 'sort' => '-updated_at']);
$latest = Mojimoto::query(['type' => 'article', 'per_page' => 10]);
$entry = Mojimoto::byId(42);
```

Every call returns `Mojimoto\Laravel\Document` instances (or a `ListResponse` for `query`). A document exposes `id`, `uid`, `type`, `lang`, `status` and `data`, with helpers for the page → sections pattern:

```php
$page->get('title');
$page['title'];

foreach ($page->references('sections') as $section) {
    echo $section->type;
    echo $section->get('heading');
}

$author = $article->reference('author');
```

`references()` and `reference()` drop any link that arrived as a bare `{id, type, uid}` stub because it was outside the delivery `depth` budget. Set `MOJIMOTO_DEPTH=2` (or pass `depth`) when sections have references of their own.

`findByUid()` throws `MojimotoException` instead of returning `null`, which is handy in controllers:

```php
public function show(string $uid)
{
    try {
        $page = Mojimoto::findByUid('page', $uid, ['depth' => 2]);
    } catch (MojimotoException $e) {
        abort($e->isNotFound() ? 404 : 502);
    }

    return view('page', ['page' => $page]);
}
```

## Rich text in Blade

```blade
@richtext($article->get('body'))

<p>@richtextText($article->get('summary'))</p>
```

Or call the renderer directly for link resolution and per-node overrides:

```php
use Mojimoto\Laravel\RichText\RichText;

RichText::html($doc->get('body'), [
    'linkResolver' => fn (array $link) => '/'.$link['uid'],
    'components' => [
        'paragraph' => fn ($a) => '<p class="lead">'.implode('', $a['children']).'</p>',
    ],
]);

RichText::text($doc->get('body'), ' ');
```

Text is always escaped. Span offsets are sliced as UTF-16 code units, matching the JavaScript SDK and Prismic, so emoji and other astral characters do not shift formatting.

## Caching and webhooks

Responses are cached for `MOJIMOTO_CACHE_TTL` seconds (default one hour) in your default cache store. The package registers `POST /mojimoto/webhook`; point a Mojimoto webhook at it with the same secret as `MOJIMOTO_WEBHOOK_SECRET`, and every publish, unpublish or delete flushes the cache and fires `Mojimoto\Laravel\Events\WebhookReceived`:

```php
Event::listen(WebhookReceived::class, function (WebhookReceived $event) {
    if ($event->isPublish() && $event->document?->type === 'article') {
        // regenerate a sitemap, warm a page, notify Slack...
    }
});
```

Signatures are verified with a constant-time comparison; unsigned or badly signed requests get a 401. Call `Mojimoto::flush()` yourself to invalidate everything, for example from a deploy hook.

## Draft preview

Add the `mojimoto.preview` middleware to your web routes:

```php
Route::middleware('mojimoto.preview')->group(function () {
    Route::get('/{uid}', PageController::class);
});
```

Visit any page with `?preview=<MOJIMOTO_PREVIEW_SECRET>` to set the preview cookie. While it is present the client reads drafts (`?ref=preview`) and skips the cache. `?preview=off` clears it. The read token needs the `preview` ability for drafts to resolve.

## Testing

```bash
composer install
composer test
```
