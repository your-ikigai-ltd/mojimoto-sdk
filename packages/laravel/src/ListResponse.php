<?php

namespace Mojimoto\Laravel;

use Countable;
use IteratorAggregate;
use Traversable;

/**
 * One page of results from the delivery list endpoint.
 */
class ListResponse implements Countable, IteratorAggregate
{
    /** @var array<int, Document> */
    public readonly array $results;

    public readonly int $page;

    public readonly int $perPage;

    public readonly int $totalResults;

    public readonly int $totalPages;

    public readonly ?string $lang;

    public readonly ?string $ref;

    public function __construct(array $raw)
    {
        $this->results = array_map(fn (array $row) => new Document($row), $raw['results'] ?? []);
        $this->page = (int) ($raw['page'] ?? 1);
        $this->perPage = (int) ($raw['per_page'] ?? count($this->results));
        $this->totalResults = (int) ($raw['total_results'] ?? count($this->results));
        $this->totalPages = (int) ($raw['total_pages'] ?? 1);
        $this->lang = $raw['lang'] ?? null;
        $this->ref = $raw['ref'] ?? null;
    }

    public function first(): ?Document
    {
        return $this->results[0] ?? null;
    }

    public function hasMorePages(): bool
    {
        return $this->page < $this->totalPages;
    }

    public function count(): int
    {
        return count($this->results);
    }

    public function getIterator(): Traversable
    {
        yield from $this->results;
    }
}
