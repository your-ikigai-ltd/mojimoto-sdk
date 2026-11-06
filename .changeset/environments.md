---
"@mojimoto/client": minor
"@mojimoto/cli": minor
"@mojimoto/nuxt": minor
---

Read a sandbox environment with the new `environment` option (`--environment` / `MOJIMOTO_ENVIRONMENT` for the CLI and Nuxt). Omit it, or pass `"live"`, to keep reading the live site exactly as before. Adds a `MojimotoPromotionWebhookPayload` type for the new `environment.promoted` webhook event.
