import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { readVendorWorkbook } from "../src/workbook_read.ts";
import { world } from "./support.ts";

type Cell = ExcelJS.CellValue;
const OK_UC: Cell[][] = [["Use case ref", "Use case", "Vendor", "Current version", "Specification"], ["UC-001", "Daily Report", "Acme", 1, { text: "daily", hyperlink: "https://x.example" } as Cell]];

/** Writes a workbook of the three vendor sheets, each with its header on row `header` and the given rows. */
async function write(sheets: Record<string, Cell[][]>, header = 2): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const base: Record<string, Cell[][]> = { "Use Cases": OK_UC, Questions: [["Question ref", "Vendor"]], "Identity & Access": [["Access ref", "Vendor"]] };
  for (const [name, rows] of Object.entries({ ...base, ...sheets })) {
    if (rows.length === 0) continue;
    const ws = wb.addWorksheet(name);
    if (header === 2) ws.getCell(1, 1).value = "Band";
    rows.forEach((row, r) => row.forEach((v, c) => (ws.getCell(r + header, c + 1).value = v)));
  }
  const path = join(await mkdtemp(join(tmpdir(), "vendor-updater-read-")), "d.xlsx");
  await wb.xlsx.writeFile(path);
  return path;
}

async function read(path: string): Promise<{ data: Awaited<ReturnType<typeof readVendorWorkbook>>; problems: string[] }> {
  const problems: string[] = [];
  const data = await readVendorWorkbook(path, (await world()).columns, "Acme", problems);
  return { data, problems: problems.map((p) => p.replace(/^.*\/d\.xlsx/, "d.xlsx")) };
}

test("[B1] cell values become trimmed strings: numbers, dates, formula results and hyperlink text", async () => {
  const path = await write({
    Questions: [["Question ref", "Vendor", "Due on", "Question", "Answer"], ["QN-0001", "Acme", new Date("2026-11-16T00:00:00Z"), { formula: "A1", result: "  Which?  " } as Cell, { formula: "NOW()", result: new Date("2026-11-17T00:00:00Z") } as Cell], [null, null, null], ["QN-0002", "Acme", 5]],
  });
  const { data, problems } = await read(path);
  assert.deepEqual(problems, []);
  assert.equal(data!["Use Cases"]![0]!.row.current_version, "1");
  assert.equal(data!["Use Cases"]![0]!.row.spec_link, "daily");
  assert.equal(data!["Use Cases"]![0]!.line, 3);
  const [first, second] = data!.Questions!;
  assert.deepEqual({ due: first!.row.due_on, text: first!.row.question_text, answer: first!.row.answer, line: first!.line }, { due: "2026-11-16", text: "Which?", answer: "2026-11-17", line: 3 });
  assert.deepEqual({ ref: second!.row.question_ref, due: second!.row.due_on, line: second!.line }, { ref: "QN-0002", due: "5", line: 5 });
  assert.equal(data!["Identity & Access"]!.length, 0);
});

test("[B1] the header is on row 1 or row 2 and may use the schema column names", async () => {
  const one = await read(await write({ "Use Cases": [["use_case_ref", "vendor", "use_case_name"], ["UC-001", "Acme", "Daily Report"]] }, 1));
  assert.deepEqual(one.problems, []);
  assert.deepEqual({ name: one.data!["Use Cases"]![0]!.row.use_case_name, line: one.data!["Use Cases"]![0]!.line }, { name: "Daily Report", line: 2 });
});

test("[B10] a download that is not a workbook, lacks a sheet or a header, or has a bad column stops the run", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vendor-updater-read-"));
  await writeFile(join(dir, "d.xlsx"), "not a workbook");
  assert.match((await read(join(dir, "d.xlsx"))).problems[0]!, /^d\.xlsx: line 1: cannot read the workbook/);

  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Use Cases").getCell(2, 1).value = "Use case ref";
  await wb.xlsx.writeFile(join(dir, "d.xlsx"));
  const sheets = (await read(join(dir, "d.xlsx"))).problems;
  assert.deepEqual(sheets, ['d.xlsx: line 1: sheet "Questions": sheet not found', 'd.xlsx: line 1: sheet "Identity & Access": sheet not found']);

  assert.match((await read(await write({ Questions: [["Vendor", "Question"], ["Acme", "x"]] }))).problems[0]!, /sheet "Questions": no header row; row 1 or 2 must hold "Question ref"/);
  assert.match((await read(await write({ "Use Cases": [["Use case ref", "Vendor", "Vendor"]] }))).problems[0]!, /line 2: sheet "Use Cases": column "Vendor" appears twice/);
  assert.match((await read(await write({ "Use Cases": [["Use case ref", "Vendor", "Mystery"]] }))).problems[0]!, /line 2: sheet "Use Cases": column "Mystery" is not a vendor column/);
});

test("[B10] a blank or repeated reference, an error cell, a secret or another vendor's row stops the run naming the sheet row", async () => {
  const bad = async (rows: Cell[][], message: RegExp) => assert.match((await read(await write({ Questions: [["Question ref", "Vendor", "Question"], ...rows] }))).problems.join("\n"), message);
  await bad([[null, "Acme", "text"]], /line 3: sheet "Questions": question_ref is blank/);
  await bad([["QN-1", "Acme", "text"]], /line 3: sheet "Questions": question_ref "QN-1" is not a reference/);
  await bad([["QN-0001", "Acme", "a"], ["QN-0001", "Acme", "b"]], /line 4: sheet "Questions": duplicate question_ref "QN-0001"/);
  await bad([["QN-0001", "Beta", "a"]], /line 3: sheet "Questions": vendor "Beta" is not "Acme"/);
  await bad([["QN-0001", "Acme", { error: "#N/A" } as Cell]], /line 3: sheet "Questions": error value in "question_text"/);
  await bad([["QN-0001", "Acme", { formula: "1/0", result: { error: "#DIV/0!" } } as Cell]], /line 3: sheet "Questions": error value in "question_text"/);
  await bad([["QN-0001", "Acme", "password: hunter2hunter2"]], /line 3: sheet "Questions": secret-looking value in "question_text"; remove it from the file/);
});
