<?php

namespace Mojimoto\Laravel\Tests;

use Mojimoto\Laravel\MojimotoServiceProvider;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app): array
    {
        return [MojimotoServiceProvider::class];
    }

    protected function defineEnvironment($app): void
    {
        $app['config']->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
        $app['config']->set('mojimoto.endpoint', 'https://cms.test/api/v1');
        $app['config']->set('mojimoto.project', 'demo');
        $app['config']->set('mojimoto.token', 'mjmt_test');
        $app['config']->set('mojimoto.lang', 'en-gb');
        $app['config']->set('mojimoto.retries', 0);
        $app['config']->set('mojimoto.cache.ttl', 600);
        $app['config']->set('mojimoto.webhook.secret', 'whsec_test');
        $app['config']->set('mojimoto.preview.secret', 'peek');
        $app['config']->set('cache.default', 'array');
    }
}
