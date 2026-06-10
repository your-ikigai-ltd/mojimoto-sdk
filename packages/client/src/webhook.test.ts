import { describe, expect, it } from 'vitest';
import { verifyWebhookSignature } from './webhook';

async function sign(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hex}`;
}

describe('verifyWebhookSignature', () => {
  const secret = 'topsecret';
  const body = JSON.stringify({ event: 'document.published', project: 'demo' });

  it('accepts a correctly signed body', async () => {
    const signature = await sign(secret, body);
    expect(await verifyWebhookSignature({ body, signature, secret })).toBe(true);
  });

  it('rejects a tampered body', async () => {
    const signature = await sign(secret, body);
    expect(await verifyWebhookSignature({ body: body + ' ', signature, secret })).toBe(false);
  });

  it('rejects the wrong secret', async () => {
    const signature = await sign('other', body);
    expect(await verifyWebhookSignature({ body, signature, secret })).toBe(false);
  });

  it('rejects a missing signature', async () => {
    expect(await verifyWebhookSignature({ body, signature: null, secret })).toBe(false);
  });
});
