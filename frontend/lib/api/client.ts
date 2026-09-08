// Thin fetch wrapper around the Express backend. Kept dependency-free (native fetch) rather than
// pulling in axios for this first feature.
//
// Error shape it expects on failure responses - this matches the backend's centralized error
// middleware exactly (src/common/middleware/error.middleware.ts):
//   { error: { code: string, message: string, details?: unknown } }
// `details` is zod's `.flatten()` output (`{ formErrors: string[], fieldErrors: Record<string,
// string[]> }`) for 400 validation failures (src/common/middleware/validate.middleware.ts).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True for a request that never reached the server (backend down, offline, CORS, etc). */
  get isNetworkError() {
    return this.status === 0;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch() itself throws on network failure (backend not running, DNS, CORS preflight
    // rejection, etc) - there is no HTTP status in that case, so we use 0 as a sentinel.
    throw new ApiError(0, "Could not reach the server. Make sure the backend is running at " + API_URL + ".");
  }

  // 204 No Content (e.g. logout) has no body at all.
  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      // Non-JSON body (shouldn't happen against this API) - fall through, payload stays null.
    }
  }

  if (!response.ok) {
    const errorBody = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(
      response.status,
      errorBody?.message ?? `Request failed with status ${response.status}`,
      errorBody?.code,
      errorBody?.details
    );
  }

  return payload as T;
}
