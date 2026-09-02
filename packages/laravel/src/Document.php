<?php

namespace Mojimoto\Laravel;

use ArrayAccess;
use JsonSerializable;

/**
 * A delivered Mojimoto document. `data` holds the field map for its content
 * type; referenced entries inside it are wrapped as documents too when they
 * arrived resolved, and left as `{id, type, uid}` stubs otherwise.
 */
class Document implements ArrayAccess, JsonSerializable
{
    public readonly int $id;

    public readonly ?string $uid;

    public readonly string $type;

    public readonly ?string $lang;

    public readonly ?string $status;

    public readonly ?string $publishedAt;

    public readonly ?string $updatedAt;

    public readonly array $data;

    public function __construct(array $raw)
    {
        $this->id = (int) ($raw['id'] ?? 0);
        $this->uid = $raw['uid'] ?? null;
        $this->type = (string) ($raw['type'] ?? '');
        $this->lang = $raw['lang'] ?? null;
        $this->status = $raw['status'] ?? null;
        $this->publishedAt = $raw['published_at'] ?? null;
        $this->updatedAt = $raw['updated_at'] ?? null;
        $this->data = is_array($raw['data'] ?? null) ? $raw['data'] : [];
    }

    public static function fromArray(?array $raw): ?static
    {
        if ($raw === null) {
            return null;
        }

        return new static($raw);
    }

    public function get(string $field, mixed $default = null): mixed
    {
        return $this->data[$field] ?? $default;
    }

    public function isResolved(): bool
    {
        return $this->data !== [];
    }

    /**
     * A `references` field as documents, dropping any stub that was outside
     * the delivery depth budget.
     *
     * @return array<int, static>
     */
    public function references(string $field): array
    {
        $entries = $this->data[$field] ?? [];

        if (! is_array($entries)) {
            return [];
        }

        $documents = [];

        foreach ($entries as $entry) {
            if (! is_array($entry) || ! isset($entry['id'])) {
                continue;
            }

            $document = new static($entry);

            if ($document->isResolved()) {
                $documents[] = $document;
            }
        }

        return $documents;
    }

    public function reference(string $field): ?static
    {
        $entry = $this->data[$field] ?? null;

        if (! is_array($entry) || ! isset($entry['id'])) {
            return null;
        }

        $document = new static($entry);

        return $document->isResolved() ? $document : null;
    }

    public function offsetExists(mixed $offset): bool
    {
        return isset($this->data[$offset]);
    }

    public function offsetGet(mixed $offset): mixed
    {
        return $this->data[$offset] ?? null;
    }

    public function offsetSet(mixed $offset, mixed $value): void
    {
        throw new \LogicException('Mojimoto documents are read-only.');
    }

    public function offsetUnset(mixed $offset): void
    {
        throw new \LogicException('Mojimoto documents are read-only.');
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'uid' => $this->uid,
            'type' => $this->type,
            'lang' => $this->lang,
            'status' => $this->status,
            'published_at' => $this->publishedAt,
            'updated_at' => $this->updatedAt,
            'data' => $this->data,
        ];
    }
}
