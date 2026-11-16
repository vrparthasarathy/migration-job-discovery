import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { add, edit, ok as exported, review, set, setup as exporterSetup } from "../../review-csv-exporter/test/support.ts";
import { buildVendorWorkbook } from "../src/workbook_write.ts";
import { acmeRows, cli, RELEASE, RUN_DATE, sheetRows, textOf, world } from "./support.ts";

test("[B1] it applies real export-review output end to end, and a refreshed export keeps the applied rows skipped", async () => {
  const f = await exporterSetup({
    "mr-1": [
      set("Use Cases", "Daily Report", "current_version", "2", "1"),
      set("Use Cases", "Nightly Sync", "current_version", "2", "1"),
      add("Questions", "Daily Report/Q9", "question_text", "Which retention applies?"),
      add("Questions", "Daily Report/Q9", "spec_refs", "Daily Report/Q9@v2"),
      add("Identity & Access", "Daily Report/prod", "service", "Reports"),
      add("Identity & Access", "Daily Report/prod", "environment", "test"),
      add("Identity & Access", "Daily Report/prod", "auth_type", "api-credential"),
      set("Use Cases", "Daily Report", "stage", "acknowledged", "sent"),
    ],
  });
  await exported(f);
  for (const [file, match] of [["review-use-cases.csv", "UC-001"], ["review-use-cases.csv", "UC-002"], ["review-questions.csv", "Daily Report/Q9"], ["review-identity-access.csv", "Daily Report/prod"]] as const) {
    await edit(f, file, match, { review_status: "accepted", reviewer: "Lead Rae", reviewed_on: "2026-11-19" });
  }
  const w = await world();
  const workbook = join(f.root, "downloaded.xlsx");
  const full = Object.fromEntries(Object.entries(acmeRows()).map(([tab, rows]) => [tab, rows.map((r) => Object.fromEntries(w.columns[tab]!.map((c) => [c.column, r[c.column] ?? ""])))]));
  await writeFile(workbook, await buildVendorWorkbook(w.schema, w.columns, full, "Acme", "2026-11-01"));

  const out = join(f.root, "new", "updated.xlsx");
  const report = join(f.root, "new", "report.md");
  const run = (book: string, to: string) => cli("update-vendor-workbook", "--workbook", book, "--reviews", f.out, "--export", f.exportDir, "--vendor", "Acme", "--out", join(f.root, to, "updated.xlsx"), "--report", join(f.root, to, "report.md"), ...RELEASE);
  const first = await run(workbook, "new");
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /applied 3 row\(s\), skipped 0, 0 conflict\(s\), 0 pending question\(s\)/);

  assert.equal((await sheetRows(out, "Use Cases"))[0]!["Current version"], "2");
  const [added] = (await sheetRows(out, "Questions")).slice(1);
  assert.deepEqual({ ref: added!["Question ref"], text: added!.Question, due: added!["Due on"], uc: added!["Use case ref"] }, { ref: "QN-0005", text: "Which retention applies?", due: "2026-11-20", uc: "UC-001" });
  const [access] = (await sheetRows(out, "Identity & Access")).slice(1);
  assert.deepEqual({ ref: access!["Access ref"], auth: access!["Auth type"] }, { ref: "AX-002", auth: "api-credential" });
  const text = await textOf(report);
  assert.match(text, /stage: sent -> acknowledged \[suggest\]/);
  assert.doesNotMatch(text, /Beta/);
  assert.match(text, /rows of other vendors, not applied: 1/);
  const marked = (await review(f, "review-use-cases.csv")).map((r) => [r.record, r.applied_on]);
  assert.deepEqual(marked, [["UC-001", RUN_DATE], ["UC-002", ""]]);
  assert.equal((await review(f, "review-questions.csv"))[0]!.applied_on, RUN_DATE);

  // A refresh by the exporter keeps applied_on, and the next run on the uploaded workbook skips those rows.
  await exported(f);
  const again = await run(out, "again");
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /applied 0 row\(s\), skipped 3, 0 conflict\(s\)/);
});

test("[B10] bad usage exits 2 with the usage text and writes nothing", async () => {
  for (const args of [[], ["other"], ["update-vendor-workbook", "--nope", "x"], ["update-vendor-workbook", "--vendor"], ["update-vendor-workbook", "plain"], ["update-vendor-workbook", "--vendor", "Acme"]]) {
    const outcome = await cli(...args);
    assert.equal(outcome.status, 2, args.join(" "));
    assert.match(outcome.stderr, /usage: update-vendor-workbook --workbook/);
  }
});
