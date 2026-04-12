import { getAccessToken } from './api';
import type { UserPayload } from '@flowboard/shared';

/**
 * Decode the JWT access token to extract user payload.
 * Uses base64url decoding — no crypto library needed (we only read the payload, not verify).
 */
export function getCurrentUser(): UserPayload | null {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      color: payload.color,
      role: payload.role,
    } satisfies UserPayload;
  } catch {
    return null;
  }
}
