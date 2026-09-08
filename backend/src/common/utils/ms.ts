// Tiny duration parser for strings like "15m", "7d", "1h" - just enough to compute a Date from the
// same JWT_*_EXPIRES_IN env values used by jsonwebtoken's `expiresIn` option, without pulling in the
// `ms` npm package for one function.
const UNIT_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export default function ms(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid duration string: "${input}" (expected e.g. "15m", "7d")`);
  }
  const [, amount, unit] = match;
  return parseInt(amount, 10) * UNIT_MS[unit];
}
