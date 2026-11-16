import assert from "node:assert/strict";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import type ExcelJS from "exceljs";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { writeExport } from "../../tracker-reconciler/test/support.ts";
import { baseExport, cli, download, editMaster, listFiles, ok, readBack, reviews, setCell, setup, textOf, update, vendorRows, type Env } from "./support.ts";

const exists = (path: string): Promise<boolean> => access(path).then(() => true, () => false);

/** The run stops with exit 1, every finding on stderr, and nothing written. */
async function stops(env: Env, pattern: RegExp, ...more: string[]): Promise<void> {
  const before = await listFiles(env.root);
  const outcome = await update(env, ...more);
  assert.equal(outcome.status, 1, outcome.stderr);
  assert.match(outcome.stderr, pattern);
  assert.deepEqual(await listFiles(env.root), before);
}

const BAD_MASTERS: [string, (wb: ExcelJS.Workbook) => void, RegExp][] = [
  ["an error cell", (wb) => setCell(wb, "Use Cases", "UC-001", "Vendor contact", { error: "#N/A" } as ExcelJS.CellErrorValue), /master\.xlsx: line 3: sheet "Use Cases": error value in "vendor_contact"/],
  ["a secret-looking value", (wb) => setCell(wb, "Use Cases", "UC-002", "Internal notes", "password: hunter2hunter"), /master\.xlsx: line 4: sheet "Use Cases": secret-looking value in "notes_internal"/],
  ["a duplicate key", (wb) => setCell(wb, "Use Cases", "UC-002", "Use case ref", "UC-001"), /line 4: sheet "Use Cases": duplicate use_case_ref "UC-001"/],
  ["a blank key", (wb) => setCell(wb, "Use Cases", "UC-003", "Use case ref", null), /line 5: sheet "Use Cases": use_case_ref is blank/],
  ["a key that is not a reference", (wb) => setCell(wb, "Use Cases", "UC-003", "Use case ref", "three"), /use_case_ref "three" is not a reference/],
  ["a value off the schema list", (wb) => setCell(wb, "Use Cases", "UC-002", "Stage", "bogus"), /master\.xlsx: line 4: sheet "Use Cases": stage: "bogus" is not one of/],
  ["a bad date", (wb) => setCell(wb, "Questions", "QN-0001", "Answered on", "yesterday"), /sheet "Questions": answered_on: "yesterday" is not a date/],
  ["a missing sheet", (wb) => void wb.removeWorksheet(wb.getWorksheet("Questions")!.id), /sheet "Questions": sheet not found/],
  ["no header row", (wb) => (wb.getWorksheet("Workflow Mappings")!.getRow(2).getCell(1).value = "Nothing"), /sheet "Workflow Mappings": no header row; row 1 or 2 must hold "Mapping ref"/],
  ["a column twice", (wb) => (wb.getWorksheet("Use Cases")!.getRow(2).getCell(3).value = "Use case ref"), /line 2: sheet "Use Cases": column "Use case ref" appears twice/],
  ["a holiday that is not a date", (wb) => (wb.getWorksheet("Holidays")!.getCell(2, 1).value = "soon"), /sheet "Holidays": "soon" is not a date/],
];

for (const [name, edit, pattern] of BAD_MASTERS) {
  test(`[B8] a master with ${name} stops the run naming the file and line, and writes nothing`, async () => {
    const env = await setup();
    await editMaster(env, edit);
    await stops(env, pattern);
  });
}

test("[B8] a master that is not a workbook stops the run", async () => {
  const env = await setup();
  await writeFile(env.master, "not a zip");
  await stops(env, /master\.xlsx: line 1: cannot read the workbook/);
});

test("[B8] a tracker export with a duplicate key or a secret-looking value stops the run", async () => {
  const root = (await setup()).root;
  const bad = async (name: string, change: (data: Record<string, Row[]>) => void, pattern: RegExp): Promise<void> => {
    const data = baseExport();
    change(data);
    await writeExport(join(root, name), data);
    const before = await listFiles(root);
    const outcome = await cli("update-master-workbook", "--from-export", join(root, name), "--out", join(root, "o", "m.xlsx"), "--report", join(root, "o", "r.md"));
    assert.equal(outcome.status, 1);
    assert.match(outcome.stderr, pattern);
    assert.deepEqual(await listFiles(root), before);
  };
  await bad("dup", (data) => void data.Questions!.push({ ...data.Questions![0]! }), /questions\.csv: line 6: duplicate question_ref "QN-0001"/);
  await bad("secret", (data) => (data["Use Cases"]![1]!.notes_internal = "token=abcdef123456"), /use-cases\.csv: line 3: secret-looking value in "notes_internal"/);
});

test("[B8] a review file or a vendor workbook with a problem stops the run naming the file and line", async () => {
  const env = await setup();
  await reviews(env, [{ tab: "Use Cases", record: "UC-001", useCase: "Daily Report", status: "maybe", fields: { stage: ["sent", "review", "update"] } }]);
  await stops(env, /review-use-cases\.csv: line 2: review_status "maybe" must be blank or one of/, "--reviews", env.reviews);

  await writeFile(join(env.reviews, "review-questions.csv"), "wrong,header\n");
  await stops(env, /review-questions\.csv: line 1: the header is not the review header/, "--reviews", env.reviews);

  const beta = await download(env, "beta.xlsx", "Beta", vendorRows("Beta"));
  await stops(env, /beta\.xlsx: line 3: sheet "Use Cases": vendor "Beta" is not "Acme"/, "--vendor", `Acme=${beta}`, "--vendor-out", env.vendorOut);
  await writeFile(join(env.root, "junk.xlsx"), "junk");
  await stops(env, /junk\.xlsx: line 1: cannot read the workbook/, "--vendor", `Acme=${join(env.root, "junk.xlsx")}`, "--vendor-out", env.vendorOut);
});

test("[B8] a named vendor must have a use case in the master", async () => {
  const env = await setup();
  await stops(env, /master\.xlsx: line 1: vendor "Nobody" has no use case in the master/, "--new-vendor", "Nobody", "--vendor-out", env.vendorOut);
});

test("[B8] an output that is an input, another output or a folder, or a vendor name that is not a file name, stops the run", async () => {
  const env = await setup();
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await stops({ ...env, out: env.master }, /--out .*master\.xlsx is also an input file/);
  await stops({ ...env, report: env.out }, /--report and --out must be different files/);
  await stops({ ...env, out: env.root }, /is a folder/);
  await mkdir(join(env.root, "dl"));
  const same = await download(env, join("dl", "Acme.xlsx"), "Acme", vendorRows("Acme"));
  await stops(env, /the workbook of Acme .*Acme\.xlsx is also an input file/, "--vendor", `Acme=${same}`, "--vendor-out", join(env.root, "dl"));
  await stops(env, /vendor "A\/b" cannot be used as a file name/, "--new-vendor", "A/b", "--vendor-out", env.vendorOut);
  await stops(env, /vendor "Acme" is named twice/, "--vendor", `Acme=${acme}`, "--new-vendor", "Acme", "--vendor-out", env.vendorOut);
});

test("[B8] an output inside the export folder stops the run", async () => {
  const env = await setup();
  const outcome = await cli("update-master-workbook", "--from-export", env.exportDir, "--out", join(env.exportDir, "master.xlsx"), "--report", env.report);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /is inside the export folder/);
  assert.equal(await exists(env.report), false);
});

test("[B1] lead columns are kept as values, a formula column is dropped and listed, and a formula in a tracker column gives its result", async () => {
  const env = await setup(baseExport(), ["lead_flag", "lead_calc"]);
  await editMaster(env, (wb) => {
    setCell(wb, "Use Cases", "UC-001", "lead_flag", "keep me");
    setCell(wb, "Use Cases", "UC-001", "lead_calc", { formula: "1+1", result: 2 });
    setCell(wb, "Questions", "QN-0001", "Due on", { formula: "DATE(2026,11,16)", result: new Date("2026-11-16T00:00:00Z") });
  });
  await ok(env);
  const master = await readBack(env.out);
  assert.deepEqual(master.tables["Use Cases"]!.extras, ["lead_flag"]);
  assert.equal(master.tables["Use Cases"]!.rows[0]!.lead_flag, "keep me");
  assert.equal(master.tables.Questions!.rows[0]!.due_on, "2026-11-16");
  const report = await textOf(env.report);
  assert.match(report, /- carried, Use Cases: lead_flag\n/);
  assert.match(report, /- dropped, formulas: Use Cases: lead_calc\n/);
});

test("[B8] the holidays come from the master's Holidays sheet, else the holidays file, else none", async () => {
  const env = await setup();
  await editMaster(env, (wb) => {
    wb.getWorksheet("Holidays")!.getCell(2, 1).value = new Date("2026-11-16T00:00:00Z");
    setCell(wb, "Questions", "QN-0001", "Due on", null);
  });
  await writeFile(join(env.root, "other.txt"), "2026-11-17\n");
  await ok(env, "--holidays", join(env.root, "other.txt"));
  assert.deepEqual((await readBack(env.out)).holidays, ["2026-11-16"]);
  assert.equal((await readBack(env.out)).tables.Questions!.rows[0]!.due_on, "2026-11-17");
});

test("[B8] a holidays file that is not dates stops the run when the master has no holidays", async () => {
  const env = await setup();
  await writeFile(join(env.root, "bad.txt"), "later\n");
  await stops(env, /bad\.txt: line 1: "later" is not YYYY-MM-DD/, "--holidays", join(env.root, "bad.txt"));
});
