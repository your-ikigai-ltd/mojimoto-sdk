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
 * Resolve a redirect target to a safe, same-origin relative path. Anything
 * absolute (`https://…`), protocol-relative (`//evil.com`), or otherwise
 * suspicious falls back to `defaultRedirect` — this prevents the preview routes
 * from being abused as an open redirect.
 */
function safeRedirect(target: string | null, defaultRedirect: string): string {
  const candidate = target ?? defaultRedirect;
  return candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/';
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
