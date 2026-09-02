<?php

namespace Mojimoto\Laravel;

use Illuminate\Contracts\Cache\Factory as CacheFactory;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Mojimoto\Laravel\Http\Middleware\HandlePreview;
use Mojimoto\Laravel\Http\WebhookController;

class MojimotoServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/mojimoto.php', 'mojimoto');

        $this->app->scoped(Client::class, function ($app) {
            $config = $app['config']->get('mojimoto');

            $cacheEnabled = (bool) ($config['cache']['enabled'] ?? true);
            $cache = $cacheEnabled ? $app->make(CacheFactory::class)->store($config['cache']['store'] ?? null) : null;

            return new Client(
                http: $app->make(Http::class),
                endpoint: (string) $config['endpoint'],
                project: (string) $config['project'],
                token: (string) $config['token'],
                lang: $config['lang'] ?? null,
                depth: (int) ($config['depth'] ?? 1),
                retries: (int) ($config['retries'] ?? 2),
                userAgent: (string) ($config['user_agent'] ?? 'mojimoto-laravel/1.0'),
                cache: $cache,
                ttl: $cacheEnabled ? (int) ($config['cache']['ttl'] ?? 0) : 0,
            );
        });
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__.'/../config/mojimoto.php' => $this->app->configPath('mojimoto.php'),
        ], 'mojimoto-config');

        $this->registerWebhookRoute();

        $this->app['router']->aliasMiddleware('mojimoto.preview', HandlePreview::class);

        Blade::directive('richtext', fn (string $expression) => "<?php echo \Mojimoto\Laravel\RichText\RichText::html({$expression}); ?>");

        Blade::directive('richtextText', fn (string $expression) => "<?php echo e(\Mojimoto\Laravel\RichText\RichText::text({$expression})); ?>");
    }

    private function registerWebhookRoute(): void
    {
        if (! config('mojimoto.webhook.enabled', true)) {
            return;
        }

        Route::post(config('mojimoto.webhook.path', 'mojimoto/webhook'), WebhookController::class)
            ->name('mojimoto.webhook')
            ->withoutMiddleware([ValidateCsrfToken::class]);
    }
}
