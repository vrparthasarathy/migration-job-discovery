import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigError, loadConfig } from "../src/config.ts";

test("[B04] a missing URL throws ConfigError", () => {
  assert.throws(() => loadConfig({}), ConfigError);
});

test("[B04] an empty URL throws ConfigError", () => {
  assert.throws(() => loadConfig({ CHECK_URL: "" }), ConfigError);
});

test("[B04] a non-http(s) URL throws ConfigError", () => {
  assert.throws(() => loadConfig({ CHECK_URL: "ftp://example.com" }), ConfigError);
});

test("[B04] an unparseable URL throws ConfigError", () => {
  assert.throws(() => loadConfig({ CHECK_URL: "not a url" }), ConfigError);
});

test("[B04] a bad timeout throws ConfigError", () => {
  assert.throws(
    () => loadConfig({ CHECK_URL: "https://example.com", CHECK_TIMEOUT_MS: "abc" }),
    ConfigError,
  );
});

test("[B01] a valid URL loads with default timeout and no recipients", () => {
  assert.deepEqual(loadConfig({ CHECK_URL: "https://example.com" }), {
    url: "https://example.com",
    timeoutMs: 5000,
    recipients: [],
  });
});

test("[B02] timeout and recipients are read and trimmed", () => {
  assert.deepEqual(
    loadConfig({
      CHECK_URL: "http://example.com",
      CHECK_TIMEOUT_MS: "250",
      ALERT_RECIPIENTS: " a@x.com, b@x.com ,,",
    }),
    { url: "http://example.com", timeoutMs: 250, recipients: ["a@x.com", "b@x.com"] },
  );
});
