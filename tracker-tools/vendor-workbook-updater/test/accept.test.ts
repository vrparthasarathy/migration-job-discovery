import assert from "node:assert/strict";
import { test } from "node:test";
import { rowsOf, ok, setup, sheetRows, textOf, type RV, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

const version = (status: string, extra: Partial<RV> = {}): RV => ({ tab: "Use Cases", record: "UC-001", status, useCase: DAILY, fields: { current_version: ["1", "2", "update"] }, ...extra });

test("[B2] an accepted row applies and a blank, rejected or clarify row never does", async () => {
  for (const status of ["", "rejected", "clarify"]) {
    const f = await setup([version(status)]);
    await ok(f);
    assert.equal((await sheetRows(f.out, "Use Cases"))[0]!["Current version"], "1", `status "${status}"`);
    assert.match(await textOf(f.report), new RegExp(`not accepted \\(${status === "" ? "blank" : status}\\)`));
    assert.equal((await rowsOf(`${f.reviews}/review-use-cases.csv`))[0]!.applied_on, "");
  }
  const f = await setup([version("accepted")]);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Use Cases"))[0]!["Current version"], "2");
  assert.match(await textOf(f.report), /Use Cases, UC-001: updated/);
  assert.match(await textOf(f.report), /current_version: "1" -> "2"/);
});

test("[B2] an accepted row of another vendor is counted and not applied, and a row for an unknown record is listed", async () => {
  const f = await setup([
    version("accepted"),
    { tab: "Use Cases", record: "UC-002", useCase: NIGHTLY, fields: { current_version: ["1", "2", "update"] } },
    { tab: "Use Cases", record: "UC-999", useCase: "uc-acme-ghost", fields: { current_version: ["1", "2", "update"] } },
    { tab: "Use Cases", key: "Other New", ref: "UC-050", useCase: "uc-beta-other-new", fields: { vendor: ["", "Beta", "add"], use_case_name: ["", "Other New", "add"] } },
    { tab: "Use Cases", key: "No Vendor", ref: "UC-051", useCase: "uc-no-vendor", fields: { current_version: ["", "1", "add"] } },
    { tab: "Questions", key: `${NIGHTLY}/Q9@v1`, ref: "QN-0050", useCase: NIGHTLY, fields: { question_text: ["", "Beta question", "add"] } },
    { tab: "Questions", record: "QN-0002", useCase: DAILY, fields: { question_text: ["Unreleased Acme question about archive retention", "Reworded", "update"] } },
  ]);
  await ok(f);
  const report = await textOf(f.report);
  assert.match(report, /rows of other vendors, not applied: 3/);
  assert.match(report, /UC-999 is in neither the workbook nor the export/);
  assert.match(report, /the new use case names no vendor/);
  assert.match(report, /QN-0002 is not in the workbook/);
  assert.equal((await sheetRows(f.out, "Use Cases")).length, 1);
});

test("[B2] an accepted use case of the same vendor in the export but not the workbook gets its new question skipped", async () => {
  const data = (await import("./support.ts")).baseExport();
  data["Use Cases"]!.push({ use_case_ref: "UC-004", use_case_name: "Weekly Digest", vendor: "Acme", current_version: "1" });
  const f = await setup([{ tab: "Questions", key: `${WEEKLY}/Q1@v1`, ref: "QN-0060", useCase: WEEKLY, fields: { question_text: ["", "Digest question", "add"] } }], undefined, data);
  await ok(f, "--release-batch", "BT-001", "--release-date", "2026-11-12");
  assert.match(await textOf(f.report), /use case uc-acme-weekly-digest is not in the workbook/);
});

test("[B2] a row with no vendor field only lists its internal values and gets no applied_on", async () => {
  const f = await setup([{ tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { stage: ["sent", "acknowledged", "update"], current_version: ["1", "1", "update"] }, other: "mr_link:  -> https://example.test [add]" }]);
  await ok(f);
  const report = await textOf(f.report);
  assert.match(report, /the workbook already holds the proposed values/);
  assert.match(report, /stage: sent -> acknowledged \[update\]/);
  assert.match(report, /other_changes: mr_link/);
  assert.equal((await rowsOf(`${f.reviews}/review-use-cases.csv`))[0]!.applied_on, "");
  const g = await setup([{ tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { stage: ["sent", "acknowledged", "update"] } }]);
  await ok(g);
  assert.match(await textOf(g.report), /nothing for the vendor workbook/);
});
