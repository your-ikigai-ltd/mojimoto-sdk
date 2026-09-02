<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Event;
use Mojimoto\Laravel\Events\WebhookReceived;

function signedPayload(array $payload, string $secret = 'whsec_test'): array
{
    $body = json_encode($payload);

    return [$body, 'sha256='.hash_hmac('sha256', $body, $secret)];
}

it('rejects requests with a bad signature', function () {
    [$body] = signedPayload(['event' => 'document.published']);

    $this->call('POST', '/mojimoto/webhook', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_MOJIMOTO_SIGNATURE' => 'sha256=nope'], $body)
        ->assertStatus(401);
});

it('rejects requests with no signature', function () {
    [$body] = signedPayload(['event' => 'document.published']);

    $this->call('POST', '/mojimoto/webhook', [], [], [], ['CONTENT_TYPE' => 'application/json'], $body)
        ->assertStatus(401);
});

it('accepts a signed publish, flushes the cache and fires an event', function () {
    Event::fake([WebhookReceived::class]);

    Cache::put('mojimoto:demo:generation', 4);

    [$body, $signature] = signedPayload([
        'event' => 'document.published',
        'project' => 'demo',
        'document' => ['id' => 12, 'uid' => 'home', 'type' => 'page', 'data' => ['title' => 'Home']],
    ]);

    $this->call('POST', '/mojimoto/webhook', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_MOJIMOTO_SIGNATURE' => $signature,
        'HTTP_X_MOJIMOTO_EVENT' => 'document.published',
    ], $body)->assertOk()->assertJson(['ok' => true, 'event' => 'document.published']);

    expect(Cache::get('mojimoto:demo:generation'))->toBe(5);

    Event::assertDispatched(WebhookReceived::class, function (WebhookReceived $event) {
        return $event->isPublish()
            && $event->project === 'demo'
            && $event->document?->uid === 'home'
            && $event->document->get('title') === 'Home';
    });
});

it('handles deletes without a document', function () {
    Event::fake([WebhookReceived::class]);

    [$body, $signature] = signedPayload(['event' => 'document.deleted', 'project' => 'demo', 'document_id' => 12]);

    $this->call('POST', '/mojimoto/webhook', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_MOJIMOTO_SIGNATURE' => $signature,
        'HTTP_X_MOJIMOTO_EVENT' => 'document.deleted',
    ], $body)->assertOk();

    Event::assertDispatched(WebhookReceived::class, fn (WebhookReceived $event) => $event->isDelete() && $event->document === null);
});
