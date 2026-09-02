<?php

namespace Mojimoto\Laravel;

use RuntimeException;

class MojimotoException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status,
        public readonly string $url,
        public readonly mixed $body = null,
    ) {
        parent::__construct($message, $status);
    }

    public static function fromResponse(int $status, string $url, mixed $body): static
    {
        return new static("Mojimoto request failed ({$status})", $status, $url, $body);
    }

    public function isNotFound(): bool
    {
        return $this->status === 404;
    }
}
