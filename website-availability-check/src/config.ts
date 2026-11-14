export class ConfigError extends Error {}

export type Config = { url: string; timeoutMs: number; recipients: string[] };

export function loadConfig(env: Record<string, string | undefined>): Config {
  const url = env.CHECK_URL?.trim() ?? "";
  if (url === "") throw new ConfigError("CHECK_URL is required");
  let protocol: string;
  try {
    protocol = new URL(url).protocol;
  } catch {
    throw new ConfigError(`CHECK_URL is not a valid URL: ${url}`);
  }
  if (protocol !== "http:" && protocol !== "https:") {
    throw new ConfigError(`CHECK_URL must be http or https: ${url}`);
  }
  const rawTimeout = env.CHECK_TIMEOUT_MS?.trim();
  const timeoutMs = rawTimeout ? Number(rawTimeout) : 5000;
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigError(`CHECK_TIMEOUT_MS must be a positive integer: ${rawTimeout}`);
  }
  const recipients = (env.ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r !== "");
  return { url, timeoutMs, recipients };
}
