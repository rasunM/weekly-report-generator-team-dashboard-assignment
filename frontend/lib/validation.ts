// Basic client-side checks mirroring the backend's zod schemas (auth.dto.ts) closely enough to
// catch obvious mistakes before hitting the network - the backend remains the authoritative
// validator (assignment section 20/23).
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
