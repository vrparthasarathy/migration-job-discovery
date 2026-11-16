import { test } from "node:test";
import assert from "node:assert/strict";
import { ok, review, set, setup } from "./support.ts";

test("[B03] a record proposed in several proposals and folders appears once, keyed by its reference", async () => {
  const change = set("Use Cases", "Nightly Sync", "current_version", "2", "1");
  const f = await setup({
    "mr-1": [change],
    "mr-2": [{ ...change, id: "mr-2" }],
    "mr-3": [set("Use Cases", "Nightly Sync", "vendor", "Beta Inc", "Beta")],
  });
  await ok(f);
  const rows = await review(f, "review-use-cases.csv");
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.record, "UC-002");
  assert.equal(rows[0]!.proposals, "mr-1 | mr-2 | mr-3");
  assert.equal(rows[0]!["current_version (proposed)"], "2");
  assert.equal(rows[0]!["vendor (proposed)"], "Beta Inc");
});
