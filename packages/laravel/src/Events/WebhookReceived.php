<?php

namespace Mojimoto\Laravel\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Mojimoto\Laravel\Document;

/**
 * Fired for every verified webhook. `event` is `document.published`,
 * `document.unpublished` or `document.deleted`; `document` is present for
 * publishes and carries the full delivered entry.
 */
class WebhookReceived
{
    use Dispatchable;

    public function __construct(
        public readonly string $event,
        public readonly string $project,
        public readonly ?Document $document,
        public readonly array $payload,
    ) {}

    public function isPublish(): bool
    {
        return $this->event === 'document.published';
    }

    public function isUnpublish(): bool
    {
        return $this->event === 'document.unpublished';
    }

    public function isDelete(): bool
    {
        return $this->event === 'document.deleted';
    }
}
