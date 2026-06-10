import type { MojiLink, MojiRichText } from '@mojimoto/richtext';

export type { MojiLink, MojiRichText };

/**
 * A `media` field is delivered as an absolute URL string (or `null`).
 * Image transforms can be appended as query params once enabled server-side.
 */
export type MojiMedia = string | null;

/** A `location` field. */
export type MojiLocation = { lat: number; lon: number } | null;

/**
 * A `reference` field, resolved by the delivery API. Within the depth budget it
 * is the full linked {@link MojimotoDocument}; beyond it, a lightweight stub.
 */
export type MojiReference<T extends MojimotoDocument = MojimotoDocument> =
  | T
  | { id: number; type: string; uid: string | null }
  | null;

/** A single delivered document. `data` is the field map for its content type. */
export interface MojimotoDocument<T extends string = string, D = Record<string, unknown>> {
  id: number;
  uid: string | null;
  type: T;
  lang: string;
  status: 'draft' | 'published';
  published_at: string | null;
  updated_at: string;
  data: D;
}

/** The paginated envelope returned by the list endpoint. */
export interface MojimotoListResponse<T extends MojimotoDocument = MojimotoDocument> {
  results: T[];
  page: number;
  per_page: number;
  total_results: number;
  total_pages: number;
  lang: string;
  ref: string;
}

export interface MojimotoClientOptions {
  /** Base delivery endpoint, e.g. `https://cms.example.com/api/v1`. */
  endpoint: string;
  /** Project slug (the path segment after the endpoint). */
  project: string;
  /** Project-scoped API token. Needs the `read` ability (`preview` for drafts). */
  token: string;
  /** Request draft content (`?ref=preview`). Requires a preview-capable token. */
  preview?: boolean;
  /** Default locale, applied when a call omits one. */
  lang?: string;
  /** Custom `fetch` implementation (e.g. a framework-instrumented one). */
  fetch?: typeof fetch;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
  /**
   * Retry transient failures (HTTP 429 and 5xx, plus network errors) with
   * exponential backoff. Pass a number to set the max attempts, or an object
   * for finer control. Defaults to no retries.
   */
  retry?: number | RetryOptions;
}

export interface RetryOptions {
  /** Maximum attempts, including the first. Default 3. */
  attempts?: number;
  /** Base backoff in ms; doubles each attempt. Default 300. */
  backoffMs?: number;
  /** Cap on a single backoff wait in ms. Default 5000. */
  maxBackoffMs?: number;
}

/** Options accepted by `query`. */
export interface QueryOptions {
  /** Content type api id. */
  type?: string;
  /** Filter by uid. */
  uid?: string;
  /** Locale; overrides the client default. */
  lang?: string;
  /** 1-based page. */
  page?: number;
  /** Page size (server caps at 100). */
  perPage?: number;
  /** Request drafts for this call. */
  preview?: boolean;
  /**
   * Sort by a document column: `id`, `uid`, `created_at`, or `updated_at`.
   * Prefix with `-` for descending, e.g. `-updated_at`. Defaults to `id`.
   */
  sort?: string;
  /** Abort the request. */
  signal?: AbortSignal;
}

/** Options accepted by single-document fetchers. */
export interface FetchOptions {
  lang?: string;
  preview?: boolean;
  signal?: AbortSignal;
}
