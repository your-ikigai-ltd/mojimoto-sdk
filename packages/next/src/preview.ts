/**
 * Route handlers for Next.js Draft Mode, used to enter/leave Mojimoto preview.
 *
 * ```ts
 * // app/api/preview/route.ts
 * import { createPreviewHandler } from '@mojimoto/next/preview';
 *
 * export const GET = createPreviewHandler({ secret: process.env.MOJIMOTO_PREVIEW_SECRET! });
 * ```
 *
 * Then point your Mojimoto project's preview URL at
 * `/api/preview?secret=...&redirect=/some/path`.
 */
export interface PreviewHandlerOptions {
  /** Shared secret that must match the `secret` query param. */
  secret: string;
  /** Where to send the user when no `redirect` query param is provided. */
  defaultRedirect?: string;
}

/**
 * Resolve a redirect target to a safe, same-origin relative path, preventing
 * the preview routes from being abused as an open redirect.
 *
 * The candidate is resolved against a synthetic base with the URL parser, and
 * we only accept it if its origin is unchanged. We then redirect to the
 * *re-serialized* path — never the raw input — so backslash tricks
 * (`/\evil.com`), protocol-relative URLs (`//evil.com`), absolute URLs, and
 * embedded control characters can't survive via a parser/validator differential.
 */
export function safeRedirect(target: string | null, defaultRedirect: string): string {
  const base = 'https://mojimoto.invalid';

  for (const candidate of [target, defaultRedirect, '/']) {
    if (candidate == null) {
      continue;
    }
    try {
      const resolved = new URL(candidate, base);
      if (resolved.origin === base) {
        return resolved.pathname + resolved.search + resolved.hash;
      }
    } catch {
      // Fall through to the next candidate.
    }
  }

  return '/';
}

export function createPreviewHandler(options: PreviewHandlerOptions) {
  return async function GET(request: Request): Promise<Response> {
    const { draftMode } = await import('next/headers');
    const { redirect } = await import('next/navigation');

    const url = new URL(request.url);
    if (url.searchParams.get('secret') !== options.secret) {
      return new Response('Invalid preview secret.', { status: 401 });
    }

    (await draftMode()).enable();
    return redirect(safeRedirect(url.searchParams.get('redirect'), options.defaultRedirect ?? '/'));
  };
}

/**
 * Route handler that exits Draft Mode.
 *
 * ```ts
 * // app/api/preview/exit/route.ts
 * export const GET = createExitPreviewHandler({ defaultRedirect: '/' });
 * ```
 */
export function createExitPreviewHandler(options: { defaultRedirect?: string } = {}) {
  return async function GET(request: Request): Promise<Response> {
    const { draftMode } = await import('next/headers');
    const { redirect } = await import('next/navigation');

    (await draftMode()).disable();
    const url = new URL(request.url);
    return redirect(safeRedirect(url.searchParams.get('redirect'), options.defaultRedirect ?? '/'));
  };
}
