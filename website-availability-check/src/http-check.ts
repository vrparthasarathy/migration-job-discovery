import type { CheckResult } from "./ports.ts";

export async function fetchCheck(url: string, timeoutMs: number): Promise<CheckResult> {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.status >= 200 && res.status < 400) return { ok: true, status: res.status };
    return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return { ok: false, reason: `timeout after ${timeoutMs}ms` };
    }
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
