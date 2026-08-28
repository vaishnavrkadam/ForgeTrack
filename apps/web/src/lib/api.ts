/**
 * Centralized API Client for ForgeTrack Frontend
 * Supports cookie-based sessions, bearer tokens, URL auto-sanitization, and standardized error envelopes.
 */

export const normalizeApiUrl = (rawUrl?: string): string => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return 'http://localhost:3001/api/v1';
  }

  let url = rawUrl.trim();

  // Fix doubled protocol patterns like https://https// or https://https://
  url = url.replace(/^https?:\/\/(https?:\/\/)+/i, '$1');
  url = url.replace(/^https?:\/\/(https?\/)+/i, 'https://');
  url = url.replace(/^https?:\/\/(https?\/\/)+/i, 'https://');

  // Fix missing colon like https// or http//
  url = url.replace(/^https\/\//i, 'https://');
  url = url.replace(/^http\/\//i, 'http://');

  // If no protocol prefix at all
  if (!/^https?:\/\//i.test(url)) {
    if (url.startsWith('localhost') || url.startsWith('127.0.0.1')) {
      url = `http://${url}`;
    } else {
      url = `https://${url}`;
    }
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '');

  // Ensure /api/v1 prefix is appended if user provided bare domain
  if (!url.endsWith('/api/v1') && !url.includes('/api/v1/')) {
    url = `${url}/api/v1`;
  }

  return url;
};

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);
  }
  return normalizeApiUrl(process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL);
};

export class ApiError extends Error {
  public code?: string;
  public status: number;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let url = `${baseUrl}${cleanEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, String(v)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('forgetrack_token') : null;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // sends httpOnly session cookie
    });
  } catch (err: any) {
    throw new ApiError(
      `Cannot connect to ForgeTrack backend at ${baseUrl}. Please check that the server is online. (${err.message || 'Network Error'})`,
      0,
      'NETWORK_ERROR',
      err,
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  let json: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errorData = json?.error || json?.message || {};
    const message =
      typeof errorData === 'string'
        ? errorData
        : errorData.message || (Array.isArray(json?.message) ? json.message.join(', ') : response.statusText) || 'API Request Failed';
    const code = typeof errorData === 'object' ? errorData.code : undefined;
    throw new ApiError(message, response.status, code, errorData);
  }

  // If response is wrapped in standard ApiSuccessEnvelope { data: ... }
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET', params }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
