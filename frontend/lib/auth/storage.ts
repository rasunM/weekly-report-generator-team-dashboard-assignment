// Persists the auth session in localStorage so a page refresh doesn't log the user out. The
// backend has no cookie/session mechanism (see auth.service.ts) - it's a pure bearer-token API, so
// the client is responsible for holding onto both tokens itself. AuthContext re-validates whatever
// is stored here against GET /api/users/me on load, so a stale/tampered value here can't itself
// grant access to anything - the backend is still the source of truth.
import type { User } from "@/types/auth";

const STORAGE_KEY = "wrtd_auth";

export interface StoredAuth {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function loadStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user) return null;
    return parsed as StoredAuth;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: StoredAuth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
