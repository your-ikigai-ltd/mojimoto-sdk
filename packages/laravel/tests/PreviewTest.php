<?php

use Illuminate\Support\Facades\Route;
use Mojimoto\Laravel\Client;

beforeEach(function () {
    Route::middleware(['web', 'mojimoto.preview'])->get('/peek', fn (Client $client) => $client->isPreviewing() ? 'preview' : 'published');
});

it('serves published content by default', function () {
    $this->get('/peek')->assertOk()->assertSee('published')->assertCookieMissing('mojimoto_preview');
});

it('turns preview on with the secret and sets the cookie', function () {
    $this->get('/peek?preview=peek')->assertOk()->assertSee('preview')->assertCookie('mojimoto_preview', '1');
});

it('ignores a wrong secret', function () {
    $this->get('/peek?preview=wrong')->assertOk()->assertSee('published');
});

it('reads drafts while the cookie is present', function () {
    $this->withCookie('mojimoto_preview', '1')->get('/peek')->assertOk()->assertSee('preview');
});

it('turns preview off', function () {
    $this->withCookie('mojimoto_preview', '1')->get('/peek?preview=off')->assertOk()->assertSee('published')->assertCookieExpired('mojimoto_preview');
});
