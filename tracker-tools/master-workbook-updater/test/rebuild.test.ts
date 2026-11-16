import assert from "node:assert/strict";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { baseExport, download, editMaster, lib, ok, reviews, rowOf, setCell, setup, sheetsOf, textOf, vendorRows, DAILY } from "./support.ts";
import { readVendorWorkbook } from "../../vendor-workbook-updater/src/workbook_read.ts";

const exists = (path: string): Promise<boolean> => access(path).then(() => true, () => false);

async function readAcme(path: string, vendor = "Acme") {
  const w = await lib();
  const problems: string[] = [];
  const data = await readVendorWorkbook(path, w.columns, vendor, problems);
  assert.deepEqual(problems, []);
  return data!;
}

test("[B7] a named vendor's workbook holds only its rows, vendor-visible columns and released questions, with the master's new values", async () => {
  const env = await setup();
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await reviews(env, [{ tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { current_version: ["1", "2", "update"] }, other: "spec_revision:  -> r4 [update]" }]);
  await ok(env, "--reviews", env.reviews, "--vendor", `Acme=${acme}`, "--vendor-out", env.vendorOut);

  const file = join(env.vendorOut, "Acme.xlsx");
  const sheets = await sheetsOf(file);
  assert.deepEqual(sheets.map((s) => s.name), ["Read Me", "Use Cases", "Questions", "Identity & Access", "Lists"]);
  const data = await readAcme(file);
  assert.deepEqual(data["Use Cases"]!.map((r) => [r.row.use_case_ref, r.row.current_version, r.row.spec_revision, r.row.acknowledgement_requested_on]), [["UC-001", "2", "r4", "2026-11-03"]]);
  assert.deepEqual(data.Questions!.map((r) => [r.row.question_ref, r.row.due_on]), [["QN-0001", "2026-11-16"]]);
  assert.deepEqual(data["Identity & Access"]!.map((r) => r.row.access_ref), ["AX-001"]);
  const w = await lib();
  for (const sheet of sheets.filter((s) => ["Use Cases", "Questions", "Identity & Access"].includes(s.name))) {
    const headings = Object.values(w.columns).flat().map((c) => c.heading);
    assert.equal(sheet.header.every((h) => headings.includes(h)), true, sheet.name);
  }
});

test("[B7] due_on is the release date plus two working days, and a stored value that differs is listed and left", async () => {
  const data = baseExport();
  data.Questions![2]!.due_on = "2026-11-30";
  const env = await setup(data);
  await editMaster(env, (wb) => setCell(wb, "Questions", "QN-0001", "Due on", null));
  await writeFile(join(env.root, "holidays.txt"), "2026-11-16\n");
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await ok(env, "--vendor", `Acme=${acme}`, "--new-vendor", "Beta", "--vendor-out", env.vendorOut, "--holidays", join(env.root, "holidays.txt"));
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0001")).due_on, "2026-11-17");
  assert.equal((await readAcme(join(env.vendorOut, "Acme.xlsx")))["Questions"]![0]!.row.due_on, "2026-11-17");
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0003")).due_on, "2026-11-30");
  assert.equal((await readAcme(join(env.vendorOut, "Beta.xlsx"), "Beta")).Questions![0]!.row.due_on, "2026-11-30");
  assert.match(await textOf(env.report), /Questions, QN-0003: stored 2026-11-30, release plus two working days is 2026-11-17/);
});

test("[B7] a new vendor is built from the master without a sync", async () => {
  const env = await setup();
  await ok(env, "--new-vendor", "Beta", "--vendor-out", env.vendorOut);
  const data = await readAcme(join(env.vendorOut, "Beta.xlsx"), "Beta");
  assert.deepEqual(data["Use Cases"]!.map((r) => r.row.use_case_ref), ["UC-002"]);
  assert.deepEqual(data.Questions!.map((r) => r.row.question_ref), ["QN-0003"]);
  assert.equal(data["Identity & Access"]!.length, 0);
  assert.match(await textOf(env.report), /Beta \(built new\)/);
});

test("[B6] a vendor row with no row in the rebuilt view is listed with its values and holds that vendor's workbook only", async () => {
  const env = await setup();
  const rows = vendorRows("Acme");
  rows["Use Cases"]!.push({ use_case_ref: "UC-777", use_case_name: "Typed by the vendor", vendor: "Acme", acknowledged_version: "5" });
  const acme = await download(env, "acme.xlsx", "Acme", rows);
  const outcome = await ok(env, "--vendor", `Acme=${acme}`, "--new-vendor", "Beta", "--vendor-out", env.vendorOut);
  assert.match(outcome.stdout, /1 vendor workbook\(s\) held/);
  assert.equal(await exists(join(env.vendorOut, "Acme.xlsx")), false);
  assert.equal(await exists(join(env.vendorOut, "Beta.xlsx")), true);
  assert.equal(await exists(env.out), true);
  const report = await textOf(env.report);
  assert.match(report, /Acme: workbook held, not rebuilt/);
  assert.match(report, /Use Cases, UC-777 \(line 4 of the download\) has no row in the rebuilt view; vendor values: acknowledged_version: 5/);
  assert.doesNotMatch(report, /Acme.xlsx/);
});

test("[B6] master rows missing from a vendor workbook are added when it is rebuilt, and listed", async () => {
  const env = await setup();
  const rows = vendorRows("Acme");
  rows["Identity & Access"] = [];
  rows.Questions = [];
  const acme = await download(env, "acme.xlsx", "Acme", rows);
  await ok(env, "--vendor", `Acme=${acme}`, "--vendor-out", env.vendorOut);
  const data = await readAcme(join(env.vendorOut, "Acme.xlsx"));
  assert.deepEqual(data["Identity & Access"]!.map((r) => r.row.access_ref), ["AX-001"]);
  assert.deepEqual(data.Questions!.map((r) => r.row.question_ref), ["QN-0001"]);
  const report = await textOf(env.report);
  assert.match(report, /Acme: Identity & Access, AX-001/);
  assert.match(report, /Acme: Questions, QN-0001/);
});
