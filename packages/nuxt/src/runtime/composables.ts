import type { MojimotoClient, MojimotoDocument, QueryOptions } from '@mojimoto/client';
import { useAsyncData, useNuxtApp } from '#imports';

/** Returns the Mojimoto client registered by the module plugin. */
export function useMojimoto(): MojimotoClient {
  return useNuxtApp().$mojimoto as MojimotoClient;
}

function stableKey(prefix: string, value: unknown): string {
  return `${prefix}:${JSON.stringify(value)}`;
}

/**
 * SSR-friendly query. Wraps Nuxt's `useAsyncData`, so results are fetched on
 * the server, serialized into the payload, and hydrated on the client.
 *
 * ```ts
 * const { data: posts } = await useMojiQuery({ type: 'blog_post', perPage: 12 });
 * ```
 */
export function useMojiQuery<T extends MojimotoDocument = MojimotoDocument>(
  opts: QueryOptions = {},
  key?: string,
) {
  const cms = useMojimoto();
  return useAsyncData<T[]>(key ?? stableKey('moji:query', opts), async () => {
    const res = await cms.query<T>(opts);
    return res.results;
  });
}

/**
 * SSR-friendly single-document fetch by type + uid.
 *
 * ```ts
 * const { data: page } = await useMojiDocument('marketing_page', 'home');
 * ```
 */
export function useMojiDocument<T extends MojimotoDocument = MojimotoDocument>(
  type: string,
  uid: string,
  opts: Pick<QueryOptions, 'lang' | 'preview'> = {},
  key?: string,
) {
  const cms = useMojimoto();
  return useAsyncData<T | null>(key ?? stableKey('moji:doc', { type, uid, ...opts }), () =>
    cms.byUid<T>(type, uid, opts),
  );
}
