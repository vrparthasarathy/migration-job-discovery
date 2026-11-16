import { test } from "node:test";
import assert from "node:assert/strict";
import { ids, add, ok, review, set, setup } from "./support.ts";

test("[B10] rows are ordered conflicts, then suggestions, then plain adds and updates grouped by use case ID (vendor, then name), ranked across files", async () => {
  const f = await setup({
    "mr-1": [
      set("Use Cases", ids.invoice, "vendor", "Gamma Ltd", "Wrong"),
      set("Use Cases", ids.daily, "current_version", "2", "1"),
      add("Use Cases", "uc-a-alpha", "vendor", "A"),
      add("Use Cases", "uc-a-alpha", "use_case_name", "Alpha"),
      add("Use Cases", "uc-beta-daily-report", "vendor", "Beta"),
      add("Use Cases", "uc-beta-daily-report", "use_case_name", "Daily Report"),
      add("Questions", "uc-beta-nightly-sync/Q9", "question_text", "A new plain question about retries"),
      add("Questions", "uc-a-alpha/Q2", "question_text", "Throughput ceiling for nightly exports"),
      add("Questions", "uc-a-alpha/Q1", "question_text", "Retention period of archived invoices"),
      add("Questions", "uc-acme-daily-report/Q9", "question_text", "Which time zone does the daily report use?"),
      { tab: "Identity & Access", op: "add", key: "uc-a-alpha/api/prod", field: "service", value: "Svc" },
    ],
  });
  await ok(f);
  const all = (await Promise.all(["use-cases", "questions", "identity-access", "mappings"].map((n) => review(f, `review-${n}.csv`)))).flat();
  const ranked = all.sort((a, b) => Number(a.order) - Number(b.order));
  assert.deepEqual(ranked.map((r) => Number(r.order)), ranked.map((_, i) => i + 1));
  const summary = ranked.map((r) => `${r.kind}:${r.use_case}:${r.record || r.record_key}`);
  assert.deepEqual(summary, [
    `conflict:${ids.invoice}:UC-003`,
    `add:${ids.daily}:${ids.daily}/Q9`,
    `suggestion:${ids.daily}:MP-001`,
    "add:uc-a-alpha:uc-a-alpha",
    "add:uc-a-alpha:uc-a-alpha/Q1",
    "add:uc-a-alpha:uc-a-alpha/Q2",
    "add:uc-a-alpha:uc-a-alpha/api/prod",
    `update:${ids.daily}:UC-001`,
    "add:uc-beta-daily-report:uc-beta-daily-report",
    `add:${ids.nightly}:${ids.nightly}/Q9`,
  ]);
  const tiers = ranked.map((r) => (r.conflict ? 1 : r.suggestions || r.kind === "suggestion" ? 2 : 3));
  assert.deepEqual(tiers, [...tiers].sort());
  const plain = ranked.filter((r) => !r.conflict && !r.suggestions && r.kind !== "suggestion");
  assert.deepEqual(plain.map((r) => r.use_case), ["uc-a-alpha", "uc-a-alpha", "uc-a-alpha", "uc-a-alpha", ids.daily, "uc-beta-daily-report", ids.nightly]);
  assert.deepEqual(plain.map((r) => r.kind), ["add", "add", "add", "add", "update", "add", "add"]);
  assert.equal(ranked[0]!.kind, "conflict");
});
