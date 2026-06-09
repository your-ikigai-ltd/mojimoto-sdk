/** Thrown when the delivery API responds with a non-2xx status. */
export class MojimotoError extends Error {
  /** HTTP status code. */
  readonly status: number;
  /** The request URL that failed (token redacted by the client). */
  readonly url: string;
  /** Raw response body, parsed as JSON when possible. */
  readonly body: unknown;

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message);
    this.name = 'MojimotoError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}
