import { createHash } from "crypto";

// Refresh tokens are already high-entropy signed JWTs, so a fast SHA-256 digest (rather than bcrypt's
// deliberately-slow hashing, which is for low-entropy human passwords) is sufficient here - we're
// just avoiding storing the raw token value in the database.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
