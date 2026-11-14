import type { Config } from "./config.ts";
import type { Alert, HttpCheck, Notifier } from "./ports.ts";

export type RunOutcome = {
  state: "up" | "down";
  alert: "none" | "sent" | "undelivered";
  exitCode: 0 | 1;
};

export async function runCheck(args: {
  config: Config;
  check: HttpCheck;
  notifier: Notifier;
  now: () => number;
}): Promise<RunOutcome> {
  const { config, check, notifier, now } = args;
  const result = await check(config.url, config.timeoutMs);
  if (result.ok) return { state: "up", alert: "none", exitCode: 0 };
  const alert: Alert = {
    url: config.url,
    status: result.status,
    reason: result.reason,
    time: new Date(now()).toISOString(),
    recipients: config.recipients,
  };
  try {
    await notifier.send(alert);
  } catch {
    return { state: "down", alert: "undelivered", exitCode: 1 };
  }
  return { state: "down", alert: "sent", exitCode: 0 };
}
