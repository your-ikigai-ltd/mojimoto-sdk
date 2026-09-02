<?php

namespace Mojimoto\Laravel\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Mojimoto\Laravel\Client;
use Mojimoto\Laravel\Document;
use Mojimoto\Laravel\Events\WebhookReceived;
use Mojimoto\Laravel\Webhooks\Signature;

class WebhookController
{
    public function __invoke(Request $request, Client $client): JsonResponse
    {
        $secret = (string) config('mojimoto.webhook.secret');

        $signed = Signature::verify($request->getContent(), $request->header('X-Mojimoto-Signature'), $secret);

        if (! $signed) {
            return new JsonResponse(['message' => 'Invalid signature.'], 401);
        }

        $payload = $request->json()->all();

        $event = (string) ($request->header('X-Mojimoto-Event') ?: ($payload['event'] ?? 'unknown'));
        $project = (string) ($payload['project'] ?? $client->project());
        $document = is_array($payload['document'] ?? null) ? new Document($payload['document']) : null;

        if (config('mojimoto.webhook.flush_cache', true)) {
            $client->flush();
        }

        WebhookReceived::dispatch($event, $project, $document, $payload);

        return new JsonResponse(['ok' => true, 'event' => $event]);
    }
}
