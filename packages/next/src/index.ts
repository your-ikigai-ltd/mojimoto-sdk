import { createClient, type MojimotoClient, type MojimotoClientOptions } from '@mojimoto/client';

export type { MojimotoClient } from '@mojimoto/client';
export { MojimotoError } from '@mojimoto/client';

export interface NextClientOptions extends MojimotoClientOptions {
  /**
   * Next.js cache revalidation in seconds, or `false` to cache indefinitely.
   * Applied to every request via the `next` fetch option.
   */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidation with `revalidateTag()`. */
  tags?: string[];
}

/**
 * Create a delivery client tuned for the Next.js App Router. Requests flow
 * through the framework `fetch`, so they participate in the Data Cache and
 * `revalidate`/`revalidateTag` work as expected in Server Components.
 *
 * ```ts
 * // lib/cms.ts
 * import { createMojimotoClient } from '@mojimoto/next';
 *
 * export const cms = createMojimotoClient({
 *   endpoint: process.env.MOJIMOTO_ENDPOINT!,
 *   project: 'decentenergy',
 *   token: process.env.MOJIMOTO_TOKEN!,
 *   revalidate: 60,
 *   tags: ['cms'],
 * });
 * ```
 */
export function createMojimotoClient(options: NextClientOptions): MojimotoClient {
  const { revalidate, tags, fetch: customFetch, ...rest } = options;
  const baseFetch = customFetch ?? globalThis.fetch;

  const instrumented: typeof fetch = (input, init) =>
    baseFetch(input, {
      ...init,
      // `next` is a Next.js extension to RequestInit.
      next: { revalidate, tags },
    } as RequestInit);

  return createClient({ ...rest, fetch: instrumented });
}

/**
 * Like {@link createMojimotoClient}, but reads Next.js Draft Mode to decide
 * whether to request preview (draft) content. Call from a Server Component or
 * route handler. Requires a token with the `preview` ability when drafts are on.
 *
 * ```ts
 * const cms = await createDraftAwareClient({ endpoint, project, token });
 * const page = await cms.byUid('marketing_page', 'home');
 * ```
 */
export async function createDraftAwareClient(options: NextClientOptions): Promise<MojimotoClient> {
  // Imported lazily so the module stays usable outside a request scope.
  const { draftMode } = await import('next/headers');
  const { isEnabled } = await draftMode();

  return createMojimotoClient({
    ...options,
    preview: isEnabled,
    // Drafts must never be cached across requests.
    revalidate: isEnabled ? 0 : options.revalidate,
  });
}
