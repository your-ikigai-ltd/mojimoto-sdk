<?php

namespace Mojimoto\Laravel\Webhooks;

/**
 * Verifies the `X-Mojimoto-Signature: sha256=…` header: an HMAC-SHA256 of the
 * raw request body using the webhook's signing secret.
 */
final class Signature
{
    public static function verify(string $rawBody, ?string $signature, string $secret): bool
    {
        if ($signature === null || $signature === '' || $secret === '') {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $rawBody, $secret);

        return hash_equals($expected, $signature);
    }
}
