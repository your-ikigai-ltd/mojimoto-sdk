---
'@mojimoto/client': minor
---

Add opt-in request retries, list sorting, and a webhook signature verifier.

- `createClient({ retry })` retries transient failures (HTTP 429/5xx and network
  errors) with exponential backoff, honouring `Retry-After` and `AbortSignal`.
- `query({ sort })` passes a sort param (e.g. `-updated_at`) to the delivery API.
- `verifyWebhookSignature({ body, signature, secret })` verifies the
  `X-Mojimoto-Signature` HMAC using Web Crypto and a constant-time comparison,
  with a `MojimotoWebhookPayload` type for the request body.
