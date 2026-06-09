import { ref, shallowRef, watchEffect, type Ref } from 'vue';
import type { MojimotoDocument, QueryOptions } from '@mojimoto/client';
import { useMojimotoClient } from './context';

export interface AsyncState<T> {
  data: Ref<T | undefined>;
  error: Ref<Error | undefined>;
  loading: Ref<boolean>;
}

/**
 * Reactive client-side query composable. For SSR data fetching in Nuxt, prefer
 * `useMojiQuery` from `@mojimoto/nuxt`, which wraps `useAsyncData`.
 */
export function useMojiQuery<T extends MojimotoDocument = MojimotoDocument>(
  opts: QueryOptions | (() => QueryOptions) = {},
): AsyncState<T[]> {
  const client = useMojimotoClient();
  const data = shallowRef<T[]>();
  const error = ref<Error>();
  const loading = ref(true);

  watchEffect((onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());

    const resolved = typeof opts === 'function' ? opts() : opts;
    loading.value = true;
    client
      .query<T>({ ...resolved, signal: controller.signal })
      .then((res) => {
        data.value = res.results;
        error.value = undefined;
        loading.value = false;
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        error.value = e as Error;
        loading.value = false;
      });
  });

  return { data, error, loading };
}

/** Reactive client-side single-document composable. */
export function useMojiDocument<T extends MojimotoDocument = MojimotoDocument>(
  type: string,
  uid: string,
  opts: Pick<QueryOptions, 'lang' | 'preview'> = {},
): AsyncState<T | null> {
  const client = useMojimotoClient();
  const data = shallowRef<T | null>();
  const error = ref<Error>();
  const loading = ref(true);

  watchEffect((onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());

    loading.value = true;
    client
      .byUid<T>(type, uid, { ...opts, signal: controller.signal })
      .then((doc) => {
        data.value = doc;
        error.value = undefined;
        loading.value = false;
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        error.value = e as Error;
        loading.value = false;
      });
  });

  return { data, error, loading };
}
