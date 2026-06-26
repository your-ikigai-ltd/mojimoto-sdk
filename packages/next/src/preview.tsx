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
import { type ComponentType, type ReactNode } from 'react';
import type { MojimotoClient } from '@mojimoto/client';
import { SliceZone, type SliceComponents } from '@mojimoto/react';

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

/** A delivery client, or a factory that returns one (sync or async). */
type ClientInput = MojimotoClient | (() => MojimotoClient | Promise<MojimotoClient>);

export interface SlicePreviewPageOptions<C = unknown> {
  /** Maps each section's content-type api id to its React component. */
  components: SliceComponents<C>;
  /**
   * The delivery client used to fetch the section. Pass your shared client, or
   * a factory (e.g. `() => createDraftAwareClient({...})`) to fetch drafts.
   */
  client: ClientInput;
  /** Value passed to every slice component as `context`. */
  context?: C;
  /** Wraps the rendered section — handy for loading global styles/fonts so the screenshot matches the live site. */
  wrapper?: ComponentType<{ children: ReactNode }>;
  /** Default locale when the request has no `?lang=`. */
  lang?: string;
  /** Fetch the draft instead of the published version. Default false. */
  preview?: boolean;
}

/** Next App Router passes params/searchParams as objects (v14) or Promises (v15). */
type MaybePromise<T> = T | Promise<T>;

export interface SlicePreviewPageProps {
  params: MaybePromise<{ type: string; uid: string }>;
  searchParams?: MaybePromise<Record<string, string | string[] | undefined>>;
}

/**
 * Builds the page component for a slice-preview route — the URL the CMS
 * screenshots to show what a section looks like. Drop it in
 * `app/preview/[type]/[uid]/page.tsx`:
 *
 * ```tsx
 * import { createSlicePreviewPage } from '@mojimoto/next/preview';
 * import { cms } from '@/lib/cms';
 * import { components } from '@/cms/sections';
 *
 * export default createSlicePreviewPage({ client: cms, components });
 * ```
 *
 * It fetches the entry by `{type}/{uid}` and renders it through the same
 * {@link SliceZone} you use for pages, so the preview matches production. A
 * missing entry triggers Next's `notFound()`.
 */
export function createSlicePreviewPage<C = unknown>(options: SlicePreviewPageOptions<C>) {
  const { components, client, context, wrapper: Wrapper, lang, preview = false } = options;

  return async function MojimotoSlicePreviewPage({ params, searchParams }: SlicePreviewPageProps): Promise<ReactNode> {
    const { type, uid } = await params;
    const search = (await searchParams) ?? {};
    const requestedLang = typeof search.lang === 'string' ? search.lang : lang;

    const cms = typeof client === 'function' ? await client() : client;

    const slice = await cms.byUid(type, uid, { preview, lang: requestedLang });

    if (!slice) {
      const { notFound } = await import('next/navigation');
      return notFound();
    }

    const zone = <SliceZone slices={[slice]} components={components} context={context} />;

    return Wrapper ? <Wrapper>{zone}</Wrapper> : zone;
  };
}
