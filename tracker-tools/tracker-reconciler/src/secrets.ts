const PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)\b\s*[:=]\s*\S{4,}/i,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}/,
  /\bsk-[A-Za-z0-9]{20,}\b/,
];

/** True when a value looks like a credential; callers never echo the value itself. */
export function looksSecret(value: string): boolean {
  return PATTERNS.some((pattern) => pattern.test(value));
}
