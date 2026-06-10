import type { MojimotoDocument } from './types';

/**
 * The JSON body Mojimoto POSTs to a webhook endpoint. The `X-Mojimoto-Event`
 * header carries the same `event`, and `X-Mojimoto-Signature` carries the
 * `sha256=…` HMAC of the raw body (verify it with {@link verifyWebhookSignature}).
 */
export interface MojimotoWebhookPayload<T extends MojimotoDocument = MojimotoDocument> {
  event: string;
  project: string;
  document: T;
}

export interface VerifyWebhookOptions {
  /** The raw request body, exactly as received (do not re-serialize). */
  body: string;
  /** The value of the `X-Mojimoto-Signature` header. */
  signature: string | null | undefined;
  /** The webhook's signing secret, shown once when the webhook is created. */
  secret: string;
}

/**
 * Verify that a webhook request was signed by Mojimoto with the given secret.
 * Uses Web Crypto (available in Node 16+, Deno, Bun, and edge runtimes) and a
 * constant-time comparison, so it is safe against timing attacks.
 *
 * ```ts
 * const ok = await verifyWebhookSignature({
 *   body: await req.text(),
 *   signature: req.headers.get('x-mojimoto-signature'),
 *   secret: process.env.MOJIMOTO_WEBHOOK_SECRET!,
 * });
 * if (!ok) return new Response('bad signature', { status: 401 });
 * ```
 */
export async function verifyWebhookSignature({
  body,
  signature,
  secret,
}: VerifyWebhookOptions): Promise<boolean> {
  if (!signature) return false;

  const expected = `sha256=${await hmacSha256Hex(secret, body)}`;
  return timingSafeEqual(signature, expected);
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length-independent constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
