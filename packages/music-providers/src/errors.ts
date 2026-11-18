export type ProviderErrorCode =
  | 'offline'
  | 'rate_limited'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'unsupported'
  | 'restricted'
  | 'unavailable'
  | 'invalid_response';

/** A provider failure with a stable code the UI can turn into recovery copy. */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly providerId: string;
  readonly retryAfterMs?: number;

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: { providerId?: string; retryAfterMs?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'ProviderError';
    this.code = code;
    this.providerId = options.providerId ?? 'unknown';
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  );
}

/** Human-readable, non-technical copy for each failure mode. */
export function describeProviderError(error: unknown): {
  title: string;
  message: string;
  retryable: boolean;
} {
  if (!isProviderError(error)) {
    return {
      title: 'Something went wrong',
      message: 'The online service returned an unexpected response. Your local library still works.',
      retryable: true,
    };
  }
  switch (error.code) {
    case 'offline':
      return {
        title: 'You are offline',
        message: 'Online search needs a connection. Your imported music keeps playing.',
        retryable: true,
      };
    case 'rate_limited':
      return {
        title: 'Too many requests',
        message: 'The provider asked us to slow down. Try again in a moment.',
        retryable: true,
      };
    case 'unauthorized':
      return {
        title: 'Sign-in required',
        message: 'This provider needs an authorized session for that request.',
        retryable: false,
      };
    case 'forbidden':
      return {
        title: 'Not permitted',
        message: 'The provider did not authorize this request for the app.',
        retryable: false,
      };
    case 'not_found':
      return {
        title: 'No longer available',
        message: 'This item was removed or made private at the provider.',
        retryable: false,
      };
    case 'unsupported':
      return {
        title: 'Not supported',
        message: 'This provider does not support that action.',
        retryable: false,
      };
    case 'restricted':
      return {
        title: 'Playback restricted',
        message: error.message,
        retryable: false,
      };
    case 'invalid_response':
      return {
        title: 'Unexpected response',
        message: 'The provider returned data this app could not read.',
        retryable: true,
      };
    case 'unavailable':
    default:
      return {
        title: 'Provider unavailable',
        message: 'The online service is not responding. Your local library is unaffected.',
        retryable: true,
      };
  }
}
