// Calls the backend's actual /api/auth/* and /api/users/me endpoints - verified against
// src/modules/auth/{auth.routes,auth.dto,auth.service}.ts and src/modules/users/users.routes.ts.
import { apiRequest } from "./client";
import type { AuthResponse, RegisterInput, User } from "@/types/auth";

// POST /api/auth/login - body: { email, password } (auth.dto.ts loginSchema)
export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

// POST /api/auth/register - body: { name, email, password, role } (auth.dto.ts registerSchema;
// role defaults to "MEMBER" server-side if omitted, but we always send it explicitly since the
// register form lets the user pick it).
export function register(input: RegisterInput) {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: input,
  });
}

// POST /api/auth/refresh - body: { refreshToken }. Rotates the refresh token server-side, so the
// caller must persist the new pair returned here (the old refresh token is revoked immediately).
export function refreshTokens(refreshToken: string) {
  return apiRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
}

// POST /api/auth/logout - body: { refreshToken }. Returns 204 (no body) - revokes that refresh
// token server-side so it can never be used again, which is the whole point of storing refresh
// tokens server-side instead of a purely stateless JWT setup (see backend README/schema comments).
export function logout(refreshToken: string) {
  return apiRequest<null>("/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

// GET /api/users/me - requires Authorization: Bearer <accessToken>. Used to validate a token that
// was restored from localStorage actually still works (and to get the freshest user record).
export function getMe(accessToken: string) {
  return apiRequest<User>("/users/me", { token: accessToken });
}
