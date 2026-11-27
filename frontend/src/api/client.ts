import type { ApiErrorResponse } from '../types/api';
import { handleDemoApiRequest } from './demoSandbox';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');
export const TOKEN_STORAGE_KEY = 'callflow_access_token';
export const DEMO_MODE_STORAGE_KEY = 'callflow_demo_mode';

export class ApiClientError extends Error {
  status: number;
  code: string;
  fieldErrors: { field: string; message: string }[];

  constructor(
    message: string,
    status: number,
    code = 'API_ERROR',
    fieldErrors: { field: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function isDemoModeEnabled(): boolean {
  return window.localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';
}

export function setDemoModeEnabled(enabled: boolean): void {
  if (enabled) {
    window.localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
  } else {
    window.localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  }
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const encoded = searchParams.toString();
  return encoded ? `?${encoded}` : '';
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth = false, headers: customHeaders, ...rest } = options;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!skipAuth && isDemoModeEnabled()) {
    return handleDemoApiRequest<T>(normalizedPath, rest.method ?? 'GET', body);
  }

  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth) {
    const token = getStoredToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let payload: Partial<ApiErrorResponse> | null = null;
    try {
      payload = (await response.json()) as Partial<ApiErrorResponse>;
    } catch {
      payload = null;
    }

    if (response.status === 401 && !skipAuth) {
      setStoredToken(null);
    }

    throw new ApiClientError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload?.code || 'HTTP_ERROR',
      payload?.fieldErrors || [],
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
