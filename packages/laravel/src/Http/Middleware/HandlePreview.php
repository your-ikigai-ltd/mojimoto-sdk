<?php

namespace Mojimoto\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Mojimoto\Laravel\Client;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

/**
 * Draft preview. Visit any page with `?preview=<MOJIMOTO_PREVIEW_SECRET>` to
 * set the preview cookie; every request carrying the cookie reads drafts
 * (`?ref=preview`) and bypasses the cache. `?preview=off` clears it.
 */
class HandlePreview
{
    public function __construct(private readonly Client $client) {}

    public function handle(Request $request, Closure $next): Response
    {
        $cookieName = (string) config('mojimoto.preview.cookie', 'mojimoto_preview');
        $secret = (string) config('mojimoto.preview.secret');
        $requested = $request->query('preview');

        $turningOff = $requested === 'off';
        $turningOn = $secret !== '' && is_string($requested) && hash_equals($secret, $requested);
        $hasCookie = $request->cookie($cookieName) === '1';

        if (($hasCookie || $turningOn) && ! $turningOff) {
            $this->client->usePreview(true);
        }

        $response = $next($request);

        if ($turningOn) {
            $response->headers->setCookie(Cookie::create($cookieName, '1', time() + 60 * (int) config('mojimoto.preview.lifetime', 1440), '/', null, $request->isSecure(), true, false, Cookie::SAMESITE_LAX));
        }

        if ($turningOff) {
            $response->headers->clearCookie($cookieName);
        }

        return $response;
    }
}
