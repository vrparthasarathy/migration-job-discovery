import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import ExcelJS from "exceljs";
import { writeExport } from "../../tracker-reconciler/test/support.ts";
import { baseExport, cli, editMaster, ok, readBack, reviews, rowOf, rowsOf, setCell, setup, textOf, update, type Env, type RVP, DAILY, NIGHTLY, BILLING } from "./support.ts";

const run = async (env: Env, rvs: RVP[]) => {
  await reviews(env, rvs);
  return ok(env, "--reviews", env.reviews);
};

test("[B3] a row for a record that is not in the master, or a new use case with no name, is listed and nothing is applied", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", record: "UC-999", useCase: useCaseId("Acme", "Ghost")!, fields: { stage: ["sent", "review", "update"] } },
    { tab: "Use Cases", ref: "UC-004", key: "unnamed", useCase: "", fields: { vendor: ["", "Acme", "add"] } },
  ]);
  assert.equal((await rowsOf(env.out, "Use Cases")).length, 3);
  assert.equal((await rowsOf(env.out, "Questions")).length, 4);
  const report = await textOf(env.report);
  assert.match(report, /UC-999 is not in the master/);
  assert.match(report, /the new use case has no name or no vendor/);
});

test("[B3] the reference of a record is never applied, and an accepted row that changes nothing is skipped", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { stage: ["sent", "sent", "update"] }, other: "use_case_ref: UC-001 -> UC-009 [update]" },
    { tab: "Use Cases", record: "UC-002", useCase: NIGHTLY, fields: { stage: ["sent", "sent", "update"] } },
  ]);
  assert.deepEqual((await rowsOf(env.out, "Use Cases")).map((r) => r.use_case_ref), ["UC-001", "UC-002", "UC-003"]);
  const report = await textOf(env.report);
  assert.match(report, /use_case_ref \(reference of the record\)/);
  assert.match(report, /2 x the master already holds the proposed values/);
});

test("[B2] a new row in a master with lead columns gets them blank", async () => {
  const env = await setup(baseExport(), ["lead_flag"]);
  await run(env, [{ tab: "Use Cases", ref: "UC-004", key: BILLING, useCase: BILLING, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Billing Export", "add"] } }]);
  const row = await rowOf(env.out, "Use Cases", "use_case_ref", "UC-004");
  assert.deepEqual([row.use_case_name, row.lead_flag], ["Billing Export", ""]);
});

test("[B1] the review columns are recomputed at the run date and left blank when a row lacks what they need", async () => {
  const data = baseExport();
  data.Questions!.push(
    { question_ref: "QN-0020", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", batch_ref: "BT-001", released_on: "2026-11-12", answer_status: "answered", status: "released" },
    { question_ref: "QN-0021", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", batch_ref: "BT-001", released_on: "2026-11-12" },
  );
  data["Question Groups"] = [];
  const env = await setup(data);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(env.master);
  const ws = wb.getWorksheet("Questions")!;
  const header = (ws.getRow(2).values as string[]).slice(1);
  const cell = (ref: string, name: string): string => {
    for (let r = 3; r <= ws.rowCount; r++) if (ws.getRow(r).getCell(1).text === ref) return ws.getRow(r).getCell(header.indexOf(name) + 1).text;
    throw new Error(ref);
  };
  assert.equal(cell("QN-0002", "Review state"), "Not released");
  assert.equal(cell("QN-0001", "Review state"), "Awaiting lead review");
  assert.equal(cell("QN-0001", "Age awaiting review"), "7");
  assert.equal(cell("QN-0020", "Review state"), "Awaiting lead review");
  assert.equal(cell("QN-0020", "Age awaiting review"), "");
  assert.equal(cell("QN-0021", "Review state"), "");
  assert.equal((await readBack(env.master)).tables["Question Groups"]!.rows.length, 0);
});

test("[B8] a master without a Holidays sheet has no holidays, and a blank header cell is ignored", async () => {
  const env = await setup();
  await editMaster(env, (wb) => {
    wb.removeWorksheet(wb.getWorksheet("Holidays")!.id);
    wb.getWorksheet("Use Cases")!.getRow(2).getCell(80).value = "  ";
  });
  await ok(env);
  assert.deepEqual((await readBack(env.out)).holidays, []);
});

test("[B8] a formula whose result is an error stops the run", async () => {
  const env = await setup();
  await editMaster(env, (wb) => setCell(wb, "Use Cases", "UC-001", "Vendor contact", { formula: "1/0", result: { error: "#DIV/0!" } } as ExcelJS.CellFormulaValue));
  const outcome = await update(env);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /master\.xlsx: line 3: sheet "Use Cases": error value in "vendor_contact"/);
});

test("[B1] a tracker export that lacks a schema column reads it as blank", async () => {
  const env = await setup();
  const dir = join(env.root, "thin");
  await writeExport(dir, baseExport());
  await writeFile(join(dir, "use-cases.csv"), "use_case_ref,use_case_name,vendor\nUC-001,Daily Report,Acme\n");
  const outcome = await cli("update-master-workbook", "--from-export", dir, "--out", join(env.root, "t", "m.xlsx"), "--report", join(env.root, "t", "r.md"));
  assert.equal(outcome.status, 0, outcome.stderr);
  const row = (await readBack(join(env.root, "t", "m.xlsx"))).tables["Use Cases"]!.rows[0]!;
  assert.deepEqual([row.use_case_name, row.stage, row.current_version], ["Daily Report", "", ""]);
});
