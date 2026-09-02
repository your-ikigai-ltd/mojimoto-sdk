<?php

namespace Mojimoto\Laravel;

use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;

/**
 * The Mojimoto delivery client. Resolve it from the container (or through the
 * `Mojimoto` facade) and reuse it; it is configured from `config/mojimoto.php`.
 *
 *     $home = Mojimoto::byUid('page', 'home', ['depth' => 2]);
 *     $posts = Mojimoto::all(['type' => 'article', 'sort' => '-published_at']);
 */
class Client
{
    private bool $preview = false;

    public function __construct(
        private readonly Http $http,
        private readonly string $endpoint,
        private readonly string $project,
        private readonly string $token,
        private readonly ?string $lang = null,
        private readonly int $depth = 1,
        private readonly int $retries = 2,
        private readonly string $userAgent = 'mojimoto-laravel/1.0',
        private readonly ?Cache $cache = null,
        private readonly int $ttl = 0,
    ) {}

    public function query(array $options = []): ListResponse
    {
        $url = $this->url('documents', $this->listParams($options));

        return new ListResponse($this->request($url));
    }

    /**
     * @return array<int, Document>
     */
    public function all(array $options = []): array
    {
        $documents = [];
        $page = (int) ($options['page'] ?? 1);
        $options['per_page'] = $options['per_page'] ?? 100;

        while (true) {
            $response = $this->query([...$options, 'page' => $page]);

            array_push($documents, ...$response->results);

            $exhausted = $page >= $response->totalPages || count($response) === 0;

            if ($exhausted) {
                break;
            }

            $page++;
        }

        return $documents;
    }

    public function first(array $options = []): ?Document
    {
        return $this->query([...$options, 'per_page' => 1, 'page' => 1])->first();
    }

    public function byUid(string $type, string $uid, array $options = []): ?Document
    {
        return $this->first([...$options, 'type' => $type, 'uid' => $uid]);
    }

    public function byId(int $id, array $options = []): Document
    {
        $url = $this->url("documents/{$id}", [
            'lang' => $options['lang'] ?? $this->lang,
            'depth' => $options['depth'] ?? $this->depth,
            'ref' => $this->wantsPreview($options) ? 'preview' : null,
        ]);

        return new Document($this->request($url));
    }

    public function findByUid(string $type, string $uid, array $options = []): Document
    {
        $document = $this->byUid($type, $uid, $options);

        if ($document === null) {
            throw new MojimotoException("No published {$type} with uid \"{$uid}\".", 404, $this->url('documents', ['type' => $type, 'uid' => $uid]));
        }

        return $document;
    }

    public function usePreview(bool $preview = true): static
    {
        $this->preview = $preview;

        return $this;
    }

    public function isPreviewing(): bool
    {
        return $this->preview;
    }

    public function flush(): void
    {
        if ($this->cache === null) {
            return;
        }

        $this->cache->forever($this->generationKey(), $this->generation() + 1);
    }

    private function generation(): int
    {
        return (int) $this->cache->get($this->generationKey(), 1);
    }

    public function project(): string
    {
        return $this->project;
    }

    private function listParams(array $options): array
    {
        return [
            'type' => $options['type'] ?? null,
            'uid' => $options['uid'] ?? null,
            'lang' => $options['lang'] ?? $this->lang,
            'page' => $options['page'] ?? null,
            'per_page' => $options['per_page'] ?? null,
            'sort' => $options['sort'] ?? null,
            'depth' => $options['depth'] ?? $this->depth,
            'ref' => $this->wantsPreview($options) ? 'preview' : null,
        ];
    }

    private function wantsPreview(array $options): bool
    {
        return (bool) ($options['preview'] ?? $this->preview);
    }

    private function url(string $path, array $params): string
    {
        $base = rtrim($this->endpoint, '/')."/{$this->project}/{$path}";

        $query = array_filter($params, fn ($value) => $value !== null && $value !== '');

        return $query === [] ? $base : $base.'?'.http_build_query($query);
    }

    private function request(string $url): array
    {
        $cacheable = $this->cache !== null && $this->ttl > 0 && ! $this->preview;

        if (! $cacheable) {
            return $this->fetch($url);
        }

        return $this->cache->remember($this->cacheKey($url), $this->ttl, fn () => $this->fetch($url));
    }

    private function fetch(string $url): array
    {
        try {
            $response = $this->pendingRequest()->get($url);
        } catch (RequestException $exception) {
            throw MojimotoException::fromResponse(
                $exception->response->status(),
                $url,
                $exception->response->json() ?? $exception->response->body(),
            );
        }

        return $this->decode($response, $url);
    }

    private function pendingRequest(): PendingRequest
    {
        $request = $this->http
            ->withToken($this->token)
            ->acceptJson()
            ->withUserAgent($this->userAgent)
            ->throw();

        if ($this->retries > 0) {
            $request = $request->retry(
                $this->retries + 1,
                fn (int $attempt) => min(300 * (2 ** ($attempt - 1)), 5000),
                fn (\Throwable $exception) => $this->isTransient($exception),
                throw: true,
            );
        }

        return $request;
    }

    private function isTransient(\Throwable $exception): bool
    {
        if (! $exception instanceof RequestException) {
            return true;
        }

        $status = $exception->response->status();

        return $status === 429 || $status >= 500;
    }

    private function decode(Response $response, string $url): array
    {
        $json = $response->json();

        if (! is_array($json)) {
            throw MojimotoException::fromResponse($response->status(), $url, $response->body());
        }

        return $json;
    }

    private function cacheKey(string $url): string
    {
        return "mojimoto:{$this->project}:{$this->generation()}:".sha1($url);
    }

    private function generationKey(): string
    {
        return "mojimoto:{$this->project}:generation";
    }
}
