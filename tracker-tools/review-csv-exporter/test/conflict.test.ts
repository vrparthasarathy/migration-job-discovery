import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { ids, add, ok, put, review, set, setup, snapshot } from "./support.ts";

test("[B06] a base value that differs from the export gives a flagged conflict and overwrites nothing", async () => {
  const f = await setup({
    "mr-1": [
      set("Use Cases", ids.invoice, "vendor", "Gamma Ltd", "Wrong"),
      set("Use Cases", ids.invoice, "current_version", "2", "1"),
      add("Use Cases", "uc-delta-brand-new", "vendor", "Delta"),
      set("Mappings", "uc-gamma-invoice-feed->>x", "workflow_candidate", "X", ""),
    ],
  });
  const before = await snapshot(f.exportDir);
  const outcome = await ok(f);
  assert.match(outcome.stdout, /rejected: .*record "uc-gamma-invoice-feed->>x" is not in the export/);
  const rows = await review(f, "review-use-cases.csv");
  const invoice = rows.find((r) => r.record === "UC-003")!;
  assert.equal(invoice.kind, "conflict");
  assert.match(invoice.conflict!, /base-mismatch: the export value differs from base_value "Wrong"/);
  assert.equal(invoice["vendor (current)"], "Gamma");
  assert.equal(invoice["vendor (proposed)"], "Gamma Ltd");
  assert.equal(invoice["vendor (state)"], "conflict");
  assert.equal(invoice["current_version (state)"], "held", "a change held by the conflict is shown as held");
  assert.match(invoice.conflict!, /held: current_version \(held by base-mismatch:/);
  assert.equal(rows.find((r) => r.record_key === "uc-delta-brand-new")!.kind, "add");
  assert.deepEqual(await snapshot(f.exportDir), before, "nothing is overwritten");
});

test("[B06] a held change on a field the export lacks shows a blank current value", async () => {
  const f = await setup({ "mr-1": [set("Use Cases", ids.invoice, "vendor", "Gamma Ltd", "Wrong"), set("Use Cases", ids.invoice, "current_version", "2", "")] });
  await put(join(f.exportDir, "use-cases.csv"), "use_case_ref,use_case_name,vendor\nUC-001,Daily Report,Acme\nUC-002,Nightly Sync,Beta\nUC-003,Invoice Feed,Gamma\n");
  await ok(f);
  const [row] = await review(f, "review-use-cases.csv");
  assert.equal(row!["current_version (state)"], "held");
  assert.equal(row!["current_version (current)"], "");
});

test("[B06] a conflict between proposals holds a new record whole", async () => {
  const f = await setup({
    "mr-1": [add("Use Cases", "uc-delta-brand-new", "vendor", "Delta"), add("Use Cases", "uc-delta-brand-new", "stage", "review")],
    "mr-2": [add("Use Cases", "uc-delta-brand-new", "vendor", "Epsilon")],
  });
  await ok(f);
  const [row] = await review(f, "review-use-cases.csv");
  assert.equal(row!.kind, "conflict");
  assert.equal(row!.record, "");
  assert.match(row!.conflict!, /proposal-disagreement/);
  assert.equal(row!["vendor (state)"], "conflict");
  assert.equal(row!["stage (state)"], "held");
});
