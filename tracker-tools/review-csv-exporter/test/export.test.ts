import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { ids, add, exportReview, FILES, ok, review, set, setup, snapshot, text } from "./support.ts";
import { join } from "node:path";

const QUESTION = "uc-acme-daily-report/Q9";
const SAME_TEXT = "Which time zone does the daily report use?";

test("[B01] it writes one wide review CSV per tab, with adds, updates and suggestions in one column format", async () => {
  const f = await setup({
    "mr-1": [
      set("Use Cases", ids.daily, "current_version", "2", "1"),
      add("Questions", QUESTION, "question_text", SAME_TEXT),
      add("Questions", QUESTION, "spec_refs", "uc-acme-daily-report/Q9@v2"),
      add("Mappings", "uc-acme-daily-report->>new-flow", "workflow_candidate", "New Flow"),
    ],
  });
  const outcome = await ok(f);
  assert.match(outcome.stdout, /exported 4 review row\(s\)/);
  assert.match(outcome.stdout, /Use Cases 1, Questions 1, Identity & Access 0, Mappings 2/);
  assert.deepEqual((await readdir(f.out)).sort(), [...FILES].sort());
  const [uc] = await review(f, "review-use-cases.csv");
  assert.equal(uc!.kind, "update");
  assert.equal(uc!.record, "UC-001");
  assert.equal(uc!.use_case, ids.daily, "the use_case cell holds the use case ID");
  assert.equal(uc!["current_version (current)"], "1");
  assert.equal(uc!["current_version (proposed)"], "2");
  assert.equal(uc!["current_version (state)"], "update");
  assert.equal(uc!.content_digest.length, 64);
  const [qn] = await review(f, "review-questions.csv");
  assert.equal(qn!.kind, "add");
  assert.equal(qn!.record, "");
  assert.equal(qn!.suggested_ref, "QN-0005");
  assert.equal(qn!.record_key, QUESTION);
  assert.match(qn!.suggestions!, /^link: similar to QN-0001 \(score /);
  assert.equal(qn!["question_text (state)"], "add");
  const mappings = await review(f, "review-mappings.csv");
  assert.deepEqual(mappings.map((m) => m.kind).sort(), ["add", "suggestion"]);
  assert.match(mappings.find((m) => m.kind === "suggestion")!.suggestions!, /^re-review: /);
  assert.equal(await text(join(f.out, "review-identity-access.csv")).then((t) => t.split("\n").length), 2, "header-only file for an empty tab");
});

test("[B02] several field proposals for one record join into one row with current, proposed and state per field", async () => {
  const f = await setup({
    "mr-1": [
      set("Use Cases", ids.nightly, "vendor", "Beta Inc", "Beta"),
      set("Use Cases", ids.nightly, "current_version", "2", "1"),
      add("Use Cases", ids.nightly, "grouping_impact", "not-expected"),
      set("Use Cases", ids.nightly, "spec_revision", "r2", ""),
      set("Use Cases", ids.nightly, "vendor_contact", "Zed", "", { reason: "second reason", source: "specs/other.md" }),
    ],
  });
  await ok(f);
  const rows = await review(f, "review-use-cases.csv");
  assert.equal(rows.length, 1);
  const [row] = rows;
  assert.equal(row!["vendor (current)"], "Beta");
  assert.equal(row!["vendor (proposed)"], "Beta Inc");
  assert.equal(row!["current_version (proposed)"], "2");
  assert.equal(row!["grouping_impact (state)"], "update");
  assert.equal(row!.other_changes, "spec_revision:  -> r2 [update] | vendor_contact:  -> Zed [suggest]");
  assert.equal(row!.proposals, "mr-1");
  assert.equal(row!.evidence, "specs/other.md | specs/spec.md@v2#anchor");
  assert.equal(row!.reason, "reason | second reason");
});

test("[B04] a record that already matches the export gets no row", async () => {
  const f = await setup({ "mr-1": [set("Use Cases", ids.nightly, "vendor", "Beta", "Beta"), set("Use Cases", ids.nightly, "current_version", "1", "1")] });
  const outcome = await ok(f);
  assert.match(outcome.stdout, /exported 0 review row\(s\)/);
  for (const file of FILES) assert.equal((await review(f, file)).length, 0);
});

test("[B09] it changes no input and writes only the four review files", async () => {
  const f = await setup({ "mr-1": [set("Use Cases", ids.nightly, "vendor", "Beta Inc", "Beta")] });
  const before = { exported: await snapshot(f.exportDir), proposals: await snapshot(f.proposals) };
  await ok(f);
  assert.deepEqual(await snapshot(f.exportDir), before.exported);
  assert.deepEqual(await snapshot(f.proposals), before.proposals);
  assert.deepEqual((await readdir(f.out)).sort(), [...FILES].sort());
  const refused = await exportReview(f, "--scope", "nowhere");
  assert.equal(refused.status, 1);
  assert.deepEqual(await snapshot(f.exportDir), before.exported);
});

test("[B03] use cases of two vendors with the same name are two rows under two IDs and are never merged", async () => {
  const other = "uc-beta-daily-report";
  const f = await setup({
    "mr-1": [
      set("Use Cases", ids.daily, "current_version", "2", "1"),
      add("Use Cases", other, "vendor", "Beta"),
      add("Use Cases", other, "use_case_name", "Daily Report"),
      add("Questions", `${other}/Q1`, "question_text", "Which time zone does the Beta daily report use?"),
    ],
  });
  await ok(f);
  const rows = await review(f, "review-use-cases.csv");
  assert.deepEqual(rows.map((r) => [r.use_case, r.record, r.record_key, r.kind]), [[ids.daily, "UC-001", ids.daily, "update"], [other, "", other, "add"]]);
  assert.equal(rows[1]!["use_case_name (proposed)"], "Daily Report", "a new use case carries its readable name as a proposed cell");
  assert.equal(rows[1]!["use_case_name (state)"], "add");
  const [question] = await review(f, "review-questions.csv");
  assert.equal(question!.use_case, other);
});
