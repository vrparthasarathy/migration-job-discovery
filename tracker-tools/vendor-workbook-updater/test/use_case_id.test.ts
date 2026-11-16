import assert from "node:assert/strict";
import { test } from "node:test";
import { acmeRows, baseExport, DAILY, listFiles, ok, setup, sheetRows, textOf, update, WEEKLY, type RV } from "./support.ts";

const newUseCase = (extra: Partial<RV> = {}): RV => ({ tab: "Use Cases", key: "Weekly Digest", ref: "UC-004", useCase: WEEKLY, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Weekly Digest", "add"] }, ...extra });

async function stops(rvs: RV[], message: RegExp, rows = acmeRows(), data = baseExport()): Promise<void> {
  const f = await setup(rvs, rows, data);
  const before = await listFiles(f.root);
  const outcome = await update(f);
  assert.equal(outcome.status, 1, outcome.stderr);
  assert.match(outcome.stderr, message);
  assert.deepEqual(await listFiles(f.root), before, "nothing was written");
}

test("[B8] a new use case takes its use_case_name from the proposed field", async () => {
  const f = await setup([newUseCase()]);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Use Cases"))[1]!["Use case"], "Weekly Digest");
});

test("[B8] a new use case with no proposed name is skipped and listed", async () => {
  const f = await setup([newUseCase({ fields: { vendor: ["", "Acme", "add"] } })]);
  await ok(f);
  assert.match(await textOf(f.report), /the new use case names no use case name/);
  assert.equal((await sheetRows(f.out, "Use Cases")).length, 1);
});

test("[B8] a use_case cell that differs from the ID of the proposed vendor and name stops the run", () =>
  stops([newUseCase({ useCase: "uc-acme-other-name" })], /review-use-cases\.csv: line 2: use_case "uc-acme-other-name" is not the use case ID of its vendor and use case name, uc-acme-weekly-digest/));

test("[B8] a proposed name with no slug stops the run", () =>
  stops([newUseCase({ fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "!!!", "add"] } })], /line 2: use_case "uc-acme-weekly-digest" is not the use case ID .*which has none/));

test("[B8] a new use case whose ID is already in the workbook stops the run", () =>
  stops([newUseCase({ useCase: DAILY, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Daily Report", "add"] } })], /line 2: use case ID uc-acme-daily-report already exists/));

test("[B8] two new use cases with one ID stop the run at the second", () =>
  stops([newUseCase(), newUseCase({ key: "Weekly Digest 2", ref: "UC-005" })], /line 3: use case ID uc-acme-weekly-digest already exists/));

test("[B8] two workbook use case rows with one ID stop the run naming the sheet row", () => {
  const rows = acmeRows();
  rows["Use Cases"]!.push({ use_case_ref: "UC-009", use_case_name: "Daily  Report", vendor: "Acme" });
  return stops([], /downloaded\.xlsx: line 4: sheet "Use Cases": use case ID uc-acme-daily-report is already on an earlier row/, rows);
});

test("[B10] a workbook use case row with no name has no ID and is never matched", async () => {
  const rows = acmeRows();
  rows["Use Cases"]!.push({ use_case_ref: "UC-009", use_case_name: "", vendor: "Acme" });
  const f = await setup([{ tab: "Use Cases", record: "UC-009", useCase: "", fields: { current_version: ["", "2", "add"] } }], rows);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Use Cases"))[1]!["Current version"], "2");
});

test("[B5] a question finds its use case by ID, so a same-named use case of another vendor is never matched", async () => {
  const data = baseExport();
  data["Use Cases"]!.push({ use_case_ref: "UC-005", use_case_name: "Daily Report", vendor: "Beta", current_version: "1" });
  const question = (useCase: string): RV => ({ tab: "Questions", key: `${useCase}/Q9@v2`, ref: useCase === DAILY ? "QN-0070" : "QN-0071", useCase, fields: { question_text: ["", `For ${useCase}`, "add"] } });
  const f = await setup([question(DAILY), question("uc-beta-daily-report")], acmeRows(), data);
  await ok(f, "--release-batch", "BT-001", "--release-date", "2026-11-12");
  const added = (await sheetRows(f.out, "Questions")).slice(1);
  assert.deepEqual(added.map((q) => [q["Question ref"], q["Use case ref"], q.Vendor]), [["QN-0070", "UC-001", "Acme"]]);
  assert.match(await textOf(f.report), /rows of other vendors, not applied: 1/);
});

test("[B5] a question for a new use case of another vendor in the review files is counted, and one for an unaccepted new use case of this vendor is skipped", async () => {
  const other = newUseCase({ key: "Other", ref: "UC-050", useCase: "uc-beta-other", fields: { vendor: ["", "Beta", "add"], use_case_name: ["", "Other", "add"] } });
  const pending = newUseCase({ status: "clarify" });
  const q = (useCase: string, ref: string): RV => ({ tab: "Questions", key: `${useCase}/Q1@v1`, ref, useCase, fields: { question_text: ["", "Q", "add"] } });
  const f = await setup([other, pending, q("uc-beta-other", "QN-0080"), q(WEEKLY, "QN-0081")]);
  await ok(f, "--release-batch", "BT-001", "--release-date", "2026-11-12");
  const report = await textOf(f.report);
  assert.match(report, /rows of other vendors, not applied: 2/);
  assert.match(report, /use case uc-acme-weekly-digest is not in the workbook/);
});

test("[B10] an unknown use case ID stops the run naming the file and line", () =>
  stops([{ tab: "Questions", key: "k", ref: "QN-0090", useCase: "uc-acme-ghost", fields: { question_text: ["", "Q", "add"] } }], /review-questions\.csv: line 2: use case ID "uc-acme-ghost" is not in the workbook, the export or the review files/));

test("[B10] a blank use_case cell on a new question stops the run", () =>
  stops([{ tab: "Identity & Access", key: "k", ref: "AX-009", useCase: "", fields: { service: ["", "S", "add"] } }], /review-identity-access\.csv: line 2: use case ID "" is not in the workbook/));

test("[B10] a use_case cell in the name form or the slug-alone form stops the run naming the file and line", async () => {
  for (const cell of ["Daily Report", "daily-report", "uc-acme"]) {
    await stops([{ tab: "Use Cases", record: "UC-001", useCase: cell, fields: { current_version: ["1", "2", "update"] } }], /review-use-cases\.csv: line 2: .*is not a use case ID such as uc-example-vendor-daily-report/);
  }
});

test("[B10] an existing record row may leave the use_case cell blank", async () => {
  const f = await setup([{ tab: "Use Cases", record: "UC-001", useCase: "", fields: { current_version: ["1", "2", "update"] } }]);
  await ok(f);
  assert.equal((await sheetRows(f.out, "Use Cases"))[0]!["Current version"], "2");
});
