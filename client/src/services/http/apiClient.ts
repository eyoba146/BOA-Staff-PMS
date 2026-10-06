import { env } from '@/config/env';
import type { ApiErrorShape } from '@/types';

/**
 * HTTP client for the Express REST API.
 * - Base URL: VITE_API_BASE_URL
 * - Access token kept in memory only; refresh token expected as an httpOnly cookie
 *   (ASSUMPTION — see docs/IMPLEMENTATION_PLAN.md §10).
 * - All failures are normalized to `ApiError`.
 */

export class ApiError extends Error implements ApiErrorShape {
  status: number;
  code: string;
  fieldErrors?: Record<string, string>;

  constructor({ status, code, message, fieldErrors }: ApiErrorShape) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError({ status: 0, code: 'UNKNOWN', message: err.message });
  return new ApiError({ status: 0, code: 'UNKNOWN', message: 'Something went wrong. Please try again.' });
}

// ---- Token store (in memory) ----
let accessToken: string | null = null;
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};

// ---- Session events (consumed by AuthContext) ----
export const authEvents = new EventTarget();
export const SESSION_EXPIRED_EVENT = 'session-expired';

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  /** Internal: prevents infinite refresh loops. */
  _retried?: boolean;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(env.apiBaseUrl.replace(/\/$/, '') + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function parseError(res: Response): Promise<ApiError> {
  let payload: Partial<ApiErrorShape> & { error?: string } = {};
  try {
    payload = await res.json();
  } catch {
    /* non-JSON error body */
  }
  return new ApiError({
    status: res.status,
    code: payload.code ?? `HTTP_${res.status}`,
    message: payload.message ?? payload.error ?? res.statusText ?? 'Request failed.',
    fieldErrors: payload.fieldErrors,
  });
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(buildUrl('/auth/refresh'), { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) return false;
    tokenStore.set(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      credentials: 'include',
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Unable to reach the server. Check your connection and try again.',
    });
  }

  if (res.status === 401 && !opts._retried && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(method, path, { ...opts, _retried: true });
    tokenStore.clear();
    authEvents.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
