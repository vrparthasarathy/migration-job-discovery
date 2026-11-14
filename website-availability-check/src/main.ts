import { ConfigError, loadConfig } from "./config.ts";
import { DryRunNotifier } from "./dry-run-notifier.ts";
import { fetchCheck } from "./http-check.ts";
import type { HttpCheck, Notifier } from "./ports.ts";
import { runCheck } from "./run-check.ts";

export type MainArgs = {
  env: Record<string, string | undefined>;
  check: HttpCheck;
  notifier: Notifier;
  now: () => number;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
};

export async function main(args: MainArgs): Promise<number> {
  try {
    const config = loadConfig(args.env);
    const outcome = await runCheck({
      config,
      check: args.check,
      notifier: args.notifier,
      now: args.now,
    });
    args.stdout(`${config.url} is ${outcome.state}; alert ${outcome.alert}`);
    return outcome.exitCode;
  } catch (error) {
    if (error instanceof ConfigError) {
      args.stderr(`configuration error: ${error.message}`);
      return 1;
    }
    throw error;
  }
}

if (import.meta.main) {
  process.exitCode = await main({
    env: process.env,
    check: fetchCheck,
    notifier: new DryRunNotifier(),
    now: Date.now,
    stdout: console.log,
    stderr: console.error,
  });
}
