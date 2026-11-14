import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runCheck } from "../src/run-check.ts";
import { fetchCheck } from "../src/http-check.ts";
import { DryRunNotifier } from "../src/dry-run-notifier.ts";
import { main } from "../src/main.ts";
import type { Alert, CheckResult, Notifier } from "../src/ports.ts";

const config = { url: "https://example.com", timeoutMs: 100, recipients: ["ops@example.com"] };
const now = () => Date.parse("2026-01-02T03:04:05.000Z");

function mocks(result: CheckResult, failNotifier = false) {
  const alerts: Alert[] = [];
  const checks: Array<[string, number]> = [];
  const check = async (url: string, timeoutMs: number) => {
    checks.push([url, timeoutMs]);
    return result;
  };
  const notifier: Notifier = {
    async send(alert) {
      alerts.push(alert);
      if (failNotifier) throw new Error("smtp down");
    },
  };
  return { alerts, checks, check, notifier };
}

function withFetch(impl: unknown) {
  const original = globalThis.fetch;
  globalThis.fetch = impl as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

test("[B01] 200 and 301 report up and request no notification", async () => {
  for (const status of [200, 301]) {
    const m = mocks({ ok: true, status });
    const out = await runCheck({ config, check: m.check, notifier: m.notifier, now });
    assert.deepEqual(out, { state: "up", alert: "none", exitCode: 0 });
    assert.equal(m.alerts.length, 0);
    assert.deepEqual(m.checks, [["https://example.com", 100]]);
  }
});

test("[B02] 404 and 500 report down and request one alert with URL, status and time", async () => {
  for (const status of [404, 500]) {
    const m = mocks({ ok: false, status, reason: `HTTP ${status}` });
    const out = await runCheck({ config, check: m.check, notifier: m.notifier, now });
    assert.deepEqual(out, { state: "down", alert: "sent", exitCode: 0 });
    assert.equal(m.alerts.length, 1);
    assert.equal(m.alerts[0].url, "https://example.com");
    assert.equal(m.alerts[0].status, status);
    assert.equal(m.alerts[0].time, "2026-01-02T03:04:05.000Z");
    assert.deepEqual(m.alerts[0].recipients, ["ops@example.com"]);
  }
});

test("[B03] a failed request reports down and requests one alert with the reason", async () => {
  const m = mocks({ ok: false, reason: "timeout after 100ms" });
  const out = await runCheck({ config, check: m.check, notifier: m.notifier, now });
  assert.deepEqual(out, { state: "down", alert: "sent", exitCode: 0 });
  assert.equal(m.alerts.length, 1);
  assert.equal(m.alerts[0].reason, "timeout after 100ms");
  assert.equal(m.alerts[0].status, undefined);
});

test("[B03] the real check maps timeout and connection errors to a reason", async () => {
  const restore = withFetch(async () => {
    throw Object.assign(new Error("aborted"), { name: "TimeoutError" });
  });
  try {
    assert.deepEqual(await fetchCheck("https://example.com", 10), {
      ok: false,
      reason: "timeout after 10ms",
    });
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    assert.deepEqual(await fetchCheck("https://example.com", 10), {
      ok: false,
      reason: "ECONNREFUSED",
    });
    globalThis.fetch = (async () => {
      throw "weird";
    }) as typeof fetch;
    assert.deepEqual(await fetchCheck("https://example.com", 10), {
      ok: false,
      reason: "weird",
    });
  } finally {
    restore();
  }
});

test("[B01] the real check treats 2xx and 3xx as ok and uses manual redirect", async () => {
  const seen: RequestInit[] = [];
  let status = 200;
  const restore = withFetch(async (_u: string, init: RequestInit) => {
    seen.push(init);
    return { status };
  });
  try {
    for (status of [200, 399]) {
      assert.deepEqual(await fetchCheck("https://example.com", 10), { ok: true, status });
    }
    assert.equal(seen[0].redirect, "manual");
    assert.ok(seen[0].signal);
  } finally {
    restore();
  }
});

test("[B02] the real check treats 4xx and 5xx as not ok with the status", async () => {
  const restore = withFetch(async () => ({ status: 503 }));
  try {
    assert.deepEqual(await fetchCheck("https://example.com", 10), {
      ok: false,
      status: 503,
      reason: "HTTP 503",
    });
  } finally {
    restore();
  }
});

test("[B04] a configuration error exits 1, requests no alert and never checks", async () => {
  const m = mocks({ ok: true, status: 200 });
  const out: string[] = [];
  const err: string[] = [];
  const code = await main({
    env: { CHECK_URL: "ftp://x" },
    check: m.check,
    notifier: m.notifier,
    now,
    stdout: (s) => out.push(s),
    stderr: (s) => err.push(s),
  });
  assert.equal(code, 1);
  assert.equal(m.checks.length, 0);
  assert.equal(m.alerts.length, 0);
  assert.equal(err.length, 1);
  assert.equal(out.length, 0);
});

test("[B04] a non-configuration error in main is rethrown", async () => {
  await assert.rejects(
    main({
      env: { CHECK_URL: "https://example.com" },
      check: async () => {
        throw new TypeError("bug");
      },
      notifier: mocks({ ok: true, status: 200 }).notifier,
      now,
      stdout: () => {},
      stderr: () => {},
    }),
    TypeError,
  );
});

test("[B05] a failing notifier gives undelivered and exit code 1", async () => {
  const m = mocks({ ok: false, status: 500, reason: "HTTP 500" }, true);
  const out = await runCheck({ config, check: m.check, notifier: m.notifier, now });
  assert.deepEqual(out, { state: "down", alert: "undelivered", exitCode: 1 });
  assert.equal(m.alerts.length, 1);
});

test("[B05] main prints one outcome line and returns the exit code", async () => {
  const m = mocks({ ok: false, status: 500, reason: "HTTP 500" }, true);
  const out: string[] = [];
  const code = await main({
    env: { CHECK_URL: "https://example.com" },
    check: m.check,
    notifier: m.notifier,
    now,
    stdout: (s) => out.push(s),
    stderr: () => {},
  });
  assert.equal(code, 1);
  assert.equal(out.length, 1);
  assert.match(out[0], /down/);
  assert.match(out[0], /undelivered/);
});

test("[B06] with mocks injected, global fetch is never called and the dry-run notifier only prints", async () => {
  let fetchCalls = 0;
  const restore = withFetch(async () => {
    fetchCalls++;
    throw new Error("real network call");
  });
  const origLog = console.log;
  try {
    const m = mocks({ ok: false, status: 500, reason: "HTTP 500" });
    await runCheck({ config, check: m.check, notifier: m.notifier, now });
    const lines: string[] = [];
    await new DryRunNotifier((s) => lines.push(s)).send(m.alerts[0]);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /https:\/\/example\.com/);
    assert.match(lines[0], /500/);
    const noStatus: string[] = [];
    await new DryRunNotifier((s) => noStatus.push(s)).send({
      url: "u",
      reason: "boom",
      time: "t",
      recipients: [],
    });
    assert.match(noStatus[0], /boom/);
    const logged: string[] = [];
    console.log = (s: string) => logged.push(s);
    await new DryRunNotifier().send(m.alerts[0]);
    console.log = origLog;
    assert.equal(logged.length, 1);
    assert.equal(fetchCalls, 0);
  } finally {
    console.log = origLog;
    restore();
  }
});

test("[B04] the entry point run as a script exits 1 on a non-http URL before any network call", () => {
  const entry = fileURLToPath(new URL("../src/main.ts", import.meta.url));
  const res = spawnSync(process.execPath, [entry], {
    env: { PATH: process.env.PATH, CHECK_URL: "ftp://example.com" },
    encoding: "utf8",
  });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /configuration error/);
  assert.equal(res.stdout, "");
});

test("[B06] main with injected mocks and an up site prints one line and no alert", async () => {
  const m = mocks({ ok: true, status: 200 });
  const out: string[] = [];
  const code = await main({
    env: { CHECK_URL: "https://example.com" },
    check: m.check,
    notifier: m.notifier,
    now,
    stdout: (s) => out.push(s),
    stderr: () => {},
  });
  assert.equal(code, 0);
  assert.equal(m.alerts.length, 0);
  assert.match(out[0], /up/);
});
