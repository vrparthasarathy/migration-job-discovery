import { test } from "node:test";
import assert from "node:assert/strict";
import { add, ok, review, set, setup } from "./support.ts";

test("[B10] rows are ordered conflicts, then suggestions, then plain adds and updates grouped by use case, ranked across files", async () => {
  const f = await setup({
    "mr-1": [
      set("Use Cases", "Invoice Feed", "vendor", "Gamma Ltd", "Wrong"),
      set("Use Cases", "Daily Report", "current_version", "2", "1"),
      add("Use Cases", "Alpha", "vendor", "A"),
      add("Questions", "Nightly Sync/Q9", "question_text", "A new plain question about retries"),
      add("Questions", "Alpha/Q2", "question_text", "Throughput ceiling for nightly exports"),
      add("Questions", "Alpha/Q1", "question_text", "Retention period of archived invoices"),
      add("Questions", "Daily Report/Q9", "question_text", "Which time zone does the daily report use?"),
      { tab: "Identity & Access", op: "add", key: "Alpha/api/prod", field: "service", value: "Svc" },
    ],
  });
  await ok(f);
  const all = (await Promise.all(["use-cases", "questions", "identity-access", "mappings"].map((n) => review(f, `review-${n}.csv`)))).flat();
  const ranked = all.sort((a, b) => Number(a.order) - Number(b.order));
  assert.deepEqual(ranked.map((r) => Number(r.order)), ranked.map((_, i) => i + 1));
  const summary = ranked.map((r) => `${r.kind}:${r.use_case}:${r.record || r.record_key}`);
  assert.deepEqual(summary, [
    "conflict:Invoice Feed:UC-003",
    "add:Daily Report:Daily Report/Q9",
    "suggestion:Daily Report:MP-001",
    "add:Alpha:Alpha",
    "add:Alpha:Alpha/Q1",
    "add:Alpha:Alpha/Q2",
    "add:Alpha:Alpha/api/prod",
    "update:Daily Report:UC-001",
    "add:Nightly Sync:Nightly Sync/Q9",
  ]);
  const tiers = ranked.map((r) => (r.conflict ? 1 : r.suggestions || r.kind === "suggestion" ? 2 : 3));
  assert.deepEqual(tiers, [...tiers].sort());
  const plain = ranked.filter((r) => !r.conflict && !r.suggestions && r.kind !== "suggestion");
  assert.deepEqual(plain.map((r) => r.use_case), ["Alpha", "Alpha", "Alpha", "Alpha", "Daily Report", "Nightly Sync"]);
  assert.deepEqual(plain.map((r) => r.kind), ["add", "add", "add", "add", "update", "add"]);
  assert.equal(ranked[0]!.kind, "conflict");
});
