import { MojimotoError } from './error';
import type {
  FetchOptions,
  MojimotoClientOptions,
  MojimotoDocument,
  MojimotoListResponse,
  QueryOptions,
} from './types';

/**
 * The Mojimoto delivery client. Create one per project and reuse it.
 *
 * ```ts
 * import { createClient } from '@mojimoto/client';
 *
 * const cms = createClient({
 *   endpoint: 'https://cms.yourikigai.co.uk/api/v1',
 *   project: 'decentenergy',
 *   token: process.env.MOJIMOTO_TOKEN!,
 * });
 *
 * const home = await cms.byUid('marketing_page', 'home');
 * ```
 */
export interface MojimotoClient {
  /** List documents, optionally filtered by type/uid/lang, one page at a time. */
  query<T extends MojimotoDocument = MojimotoDocument>(
    opts?: QueryOptions,
  ): Promise<MojimotoListResponse<T>>;
  /** Fetch every page for a query and return the flattened results. */
  all<T extends MojimotoDocument = MojimotoDocument>(opts?: QueryOptions): Promise<T[]>;
  /** Fetch the first document matching a query, or `null`. */
  first<T extends MojimotoDocument = MojimotoDocument>(opts?: QueryOptions): Promise<T | null>;
  /** Fetch the first document of `type` with the given `uid`, or `null`. */
  byUid<T extends MojimotoDocument = MojimotoDocument>(
    type: string,
    uid: string,
    opts?: FetchOptions,
  ): Promise<T | null>;
  /** Fetch a single document by numeric id. Throws {@link MojimotoError} if missing. */
  byId<T extends MojimotoDocument = MojimotoDocument>(id: number, opts?: FetchOptions): Promise<T>;
  /** The resolved options this client was created with. */
  readonly options: Readonly<MojimotoClientOptions>;
}

export function createClient(options: MojimotoClientOptions): MojimotoClient {
  if (!options.endpoint) throw new Error('[mojimoto] `endpoint` is required.');
  if (!options.project) throw new Error('[mojimoto] `project` is required.');
  if (!options.token) throw new Error('[mojimoto] `token` is required.');

  const doFetch = options.fetch ?? globalThis.fetch;
  if (typeof doFetch !== 'function') {
    throw new Error('[mojimoto] No global `fetch` found. Pass `fetch` in options (Node < 18).');
  }

  const base = options.endpoint.replace(/\/+$/, '');

  const retry =
    typeof options.retry === 'number' ? { attempts: options.retry } : (options.retry ?? {});
  const maxAttempts = Math.max(1, retry.attempts ?? (options.retry ? 3 : 1));
  const baseBackoff = retry.backoffMs ?? 300;
  const maxBackoff = retry.maxBackoffMs ?? 5000;

  const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason ?? new Error('Aborted'));
      const t = setTimeout(resolve, ms);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(signal.reason ?? new Error('Aborted'));
        },
        { once: true },
      );
    });

  // 429 and 5xx are transient; 4xx (except 429) are the caller's fault.
  const isRetryableStatus = (status: number) => status === 429 || status >= 500;

  function buildUrl(path: string, query: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${base}/${options.project}/${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async function request<R>(url: string, signal?: AbortSignal): Promise<R> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let res: Response;
      try {
        res = await doFetch(url, {
          headers: {
            Authorization: `Bearer ${options.token}`,
            Accept: 'application/json',
            ...options.headers,
          },
          signal,
        });
      } catch (err) {
        // Network-level failure. Retry unless aborted or out of attempts.
        if (signal?.aborted || attempt >= maxAttempts) throw err;
        lastError = err;
        await backoffWait(attempt, undefined, signal);
        continue;
      }

      if (res.ok) {
        return (await res.json()) as R;
      }

      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* keep raw text */
      }
      const redacted = url.replace(encodeURIComponent(options.token), '***');
      const error = new MojimotoError(
        `Mojimoto request failed (${res.status})`,
        res.status,
        redacted,
        body,
      );

      if (attempt < maxAttempts && isRetryableStatus(res.status)) {
        lastError = error;
        const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
        await backoffWait(attempt, retryAfter, signal);
        continue;
      }

      throw error;
    }

    // Unreachable in practice; the loop either returns or throws.
    throw lastError ?? new Error('[mojimoto] request failed');
  }

  function parseRetryAfter(header: string | null): number | undefined {
    if (!header) return undefined;
    const seconds = Number(header);
    return Number.isFinite(seconds) ? seconds * 1000 : undefined;
  }

  function backoffWait(attempt: number, explicitMs: number | undefined, signal?: AbortSignal) {
    const backoff = Math.min(baseBackoff * 2 ** (attempt - 1), maxBackoff);
    return sleep(explicitMs ?? backoff, signal);
  }

  function listUrl(opts: QueryOptions): string {
    return buildUrl('documents', {
      type: opts.type,
      uid: opts.uid,
      lang: opts.lang ?? options.lang,
      page: opts.page,
      per_page: opts.perPage,
      sort: opts.sort,
      ref: (opts.preview ?? options.preview) ? 'preview' : undefined,
    });
  }

  const client: MojimotoClient = {
    options,

    query<T extends MojimotoDocument = MojimotoDocument>(opts: QueryOptions = {}) {
      return request<MojimotoListResponse<T>>(listUrl(opts), opts.signal);
    },

    async all<T extends MojimotoDocument = MojimotoDocument>(opts: QueryOptions = {}) {
      const results: T[] = [];
      let page = opts.page ?? 1;
      // The server caps per_page at 100; default to the max to minimise round-trips.
      const perPage = opts.perPage ?? 100;

      for (;;) {
        const res = await client.query<T>({ ...opts, page, perPage });
        results.push(...res.results);
        if (page >= res.total_pages || res.results.length === 0) break;
        page++;
      }

      return results;
    },

    async first<T extends MojimotoDocument = MojimotoDocument>(opts: QueryOptions = {}) {
      const res = await client.query<T>({ ...opts, perPage: 1, page: 1 });
      return res.results[0] ?? null;
    },

    byUid<T extends MojimotoDocument = MojimotoDocument>(type: string, uid: string, opts: FetchOptions = {}) {
      return client.first<T>({ type, uid, lang: opts.lang, preview: opts.preview, signal: opts.signal });
    },

    byId<T extends MojimotoDocument = MojimotoDocument>(id: number, opts: FetchOptions = {}) {
      const url = buildUrl(`documents/${id}`, {
        lang: opts.lang ?? options.lang,
        ref: (opts.preview ?? options.preview) ? 'preview' : undefined,
      });
      return request<T>(url, opts.signal);
    },
  };

  return client;
}
