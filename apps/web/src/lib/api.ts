import { getSocketId } from './socket';

/** Base URL for API calls. In production (Vercel), points to Oracle Cloud backend.
 *  In local dev, empty string keeps relative paths (Vite proxy handles routing). */
const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'flowboard_token';

let accessToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
})();

export function setAccessToken(token: string | null) {
  accessToken = token;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable (SSR, private browsing)
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Attach socket ID so the server can exclude this client from broadcasts
  if (options.method && options.method !== 'GET') {
    const socketId = getSocketId();
    if (socketId) {
      headers['X-Socket-Id'] = socketId;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Send cookies for refresh token
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return response.json();
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
