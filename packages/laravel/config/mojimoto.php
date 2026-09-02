<?php

return [

    'endpoint' => env('MOJIMOTO_ENDPOINT', 'https://mojimoto.com/api/v1'),

    'project' => env('MOJIMOTO_PROJECT'),

    'token' => env('MOJIMOTO_TOKEN'),

    'lang' => env('MOJIMOTO_LANG', 'en-gb'),

    'depth' => (int) env('MOJIMOTO_DEPTH', 1),

    'retries' => (int) env('MOJIMOTO_RETRIES', 2),

    'user_agent' => env('MOJIMOTO_USER_AGENT', 'mojimoto-laravel/1.0'),

    'cache' => [
        'enabled' => (bool) env('MOJIMOTO_CACHE', true),
        'store' => env('MOJIMOTO_CACHE_STORE'),
        'ttl' => (int) env('MOJIMOTO_CACHE_TTL', 3600),
    ],

    'webhook' => [
        'enabled' => (bool) env('MOJIMOTO_WEBHOOK', true),
        'path' => env('MOJIMOTO_WEBHOOK_PATH', 'mojimoto/webhook'),
        'secret' => env('MOJIMOTO_WEBHOOK_SECRET'),
        'flush_cache' => true,
    ],

    'preview' => [
        'secret' => env('MOJIMOTO_PREVIEW_SECRET'),
        'cookie' => 'mojimoto_preview',
        'lifetime' => 60 * 24,
    ],

];
