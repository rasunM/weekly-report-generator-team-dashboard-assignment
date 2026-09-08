"use client";

// Central authentication state for the whole app: current user, role, access token, and
// isAuthenticated/isLoading flags, per Feature 1's requirement for "a reusable authentication
// mechanism". Every page/component reads auth state through the useAuth() hook below instead of
// touching localStorage directly.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { clearStoredAuth, loadStoredAuth, saveStoredAuth, type StoredAuth } from "./storage";
import type { RegisterInput, Role, User } from "@/types/auth";

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True only while the initial "is there a valid session?" check is running on app load. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first load, restore whatever session was persisted from a previous visit and verify it
  // against the backend rather than trusting it blindly - a locally-stored token could be expired
  // (access tokens live 15m per .env) or revoked. If the access token is dead, try the refresh
  // token once (backend rotates it - see auth.service.ts) before giving up and treating the user
  // as logged out.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const stored = loadStoredAuth();
      if (!stored) {
        setIsLoading(false);
        return;
      }

      try {
        const freshUser = await authApi.getMe(stored.accessToken);
        if (cancelled) return;
        const next = { ...stored, user: freshUser };
        saveStoredAuth(next);
        setSession(next);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          try {
            const refreshed = await authApi.refreshTokens(stored.refreshToken);
            if (cancelled) return;
            const next = {
              user: refreshed.user,
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken,
            };
            saveStoredAuth(next);
            setSession(next);
          } catch {
            if (!cancelled) {
              clearStoredAuth();
              setSession(null);
            }
          }
        } else {
          // Network error, etc - don't destroy a possibly-valid session just because the backend
          // was briefly unreachable during the check; keep the cached user so the UI stays usable.
          if (!cancelled) setSession(stored);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    const next = { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
    saveStoredAuth(next);
    setSession(next);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await authApi.register(input);
    const next = { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken };
    saveStoredAuth(next);
    setSession(next);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const current = session;
    clearStoredAuth();
    setSession(null);
    if (current) {
      // Best-effort - revokes the refresh token server-side so it can't be replayed. Local state is
      // already cleared above regardless of whether this call succeeds, so a flaky network never
      // traps the user in a "still logged in" UI.
      try {
        await authApi.logout(current.refreshToken);
      } catch {
        // Ignore - the user is logged out on this device either way.
      }
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      role: session?.user.role ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: session !== null,
      isLoading,
      login,
      register,
      logout,
    }),
    [session, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
