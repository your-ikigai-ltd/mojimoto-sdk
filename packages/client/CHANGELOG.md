# @mojimoto/client

## 0.5.0

### Minor Changes

- 7aa814b: Support for blocks fields. `@mojimoto/client` exports `MojimotoBlock` (`{ id, type, data }`) and `MojimotoSlice`. `<SliceZone>` renders blocks as well as referenced entries: pass `BlockComponents` to type the block components. Existing slice zones are unchanged. The agent skill written by `mojimoto init` now uses the MCP server's real tool names, points agents at the `mojimoto://content-model` resource, and recommends blocks for page sections.

## 0.4.1

### Patch Changes

- 5039210: Packages now declare their repository, which npm needs to verify publish provenance.
- Updated dependencies [5039210]
  - @mojimoto/richtext@0.2.1

## 0.4.0

### Minor Changes

- 72c1ccb: Add opt-in request retries, list sorting, and a webhook signature verifier.

  - `createClient({ retry })` retries transient failures (HTTP 429/5xx and network
    errors) with exponential backoff, honouring `Retry-After` and `AbortSignal`.
  - `query({ sort })` passes a sort param (e.g. `-updated_at`) to the delivery API.
  - `verifyWebhookSignature({ body, signature, secret })` verifies the
    `X-Mojimoto-Signature` HMAC using Web Crypto and a constant-time comparison,
    with a `MojimotoWebhookPayload` type for the request body.

### Patch Changes

- Updated dependencies [307f26d]
  - @mojimoto/richtext@0.2.0
