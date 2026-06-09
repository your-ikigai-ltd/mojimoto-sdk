import { useEffect, useState } from 'react';
import type { MojimotoDocument, QueryOptions } from '@mojimoto/client';
import { useMojimotoClient } from './context';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Client-side query hook for `'use client'` components. For server components
 * and SSR, call the client directly (or use `@mojimoto/next` / `@mojimoto/nuxt`).
 *
 * ```tsx
 * const { data, loading } = useMojiQuery({ type: 'blog_post', perPage: 10 });
 * ```
 */
export function useMojiQuery<T extends MojimotoDocument = MojimotoDocument>(
  opts: QueryOptions = {},
): AsyncState<T[]> {
  const client = useMojimotoClient();
  const [state, setState] = useState<AsyncState<T[]>>({ data: undefined, error: undefined, loading: true });
  const key = JSON.stringify(opts);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));

    client
      .query<T>({ ...opts, signal: controller.signal })
      .then((res) => setState({ data: res.results, error: undefined, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ data: undefined, error: error as Error, loading: false });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);

  return state;
}

/** Client-side single-document hook (first match for `type` + `uid`). */
export function useMojiDocument<T extends MojimotoDocument = MojimotoDocument>(
  type: string,
  uid: string,
  opts: Pick<QueryOptions, 'lang' | 'preview'> = {},
): AsyncState<T | null> {
  const client = useMojimotoClient();
  const [state, setState] = useState<AsyncState<T | null>>({ data: undefined, error: undefined, loading: true });
  const key = JSON.stringify({ type, uid, ...opts });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));

    client
      .byUid<T>(type, uid, { ...opts, signal: controller.signal })
      .then((doc) => setState({ data: doc, error: undefined, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ data: undefined, error: error as Error, loading: false });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, key]);

  return state;
}
