import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { COLOURS } from "../../sample-tracker-workbook/src/layout.ts";
import { acmeRows, ok, RELEASE, setup, sheetRows, world, type RV, DAILY, NIGHTLY, WEEKLY } from "./support.ts";

const rvs: RV[] = [{ tab: "Questions", key: `${DAILY}/Q9@v2`, ref: "QN-0005", useCase: DAILY, fields: { question_text: ["", "Which retention applies?", "add"] } }];

async function open(path: string): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb;
}

test("[B1] it writes a new workbook in the sample's format and leaves the downloaded file untouched", async () => {
  const f = await setup(rvs);
  const before = await readFile(f.workbook);
  await ok(f, ...RELEASE);
  assert.ok(before.equals(await readFile(f.workbook)), "input untouched");
  const wb = await open(f.out);
  assert.deepEqual(wb.worksheets.map((s) => s.name), ["Read Me", "Use Cases", "Questions", "Identity & Access", "Lists"]);
  const w = await world();
  for (const tab of ["Use Cases", "Questions", "Identity & Access"]) {
    const ws = wb.getWorksheet(tab)!;
    const cols = w.columns[tab]!;
    assert.deepEqual((ws.getRow(2).values as string[]).slice(1), cols.map((c) => c.heading), "row 2 is the table header in headings order");
    assert.equal(ws.getRow(1).getCell(1).value, cols[0]!.band, "row 1 is the group band");
    const tables = ws.getTables();
    assert.equal(tables.length, 1);
    assert.equal((tables[0]!.model as { tableRef: string }).tableRef.startsWith("A2:"), true);
    assert.deepEqual({ state: ws.views[0]!.state, x: (ws.views[0] as { xSplit: number }).xSplit, y: (ws.views[0] as { ySplit: number }).ySplit }, { state: "frozen", x: 2, y: 2 });
    cols.forEach((c, i) => {
      const fill = (ws.getCell(2, i + 1).fill as ExcelJS.FillPattern).fgColor!.argb;
      assert.equal(fill, c.edited ? "FFC55A11" : COLOURS.vendorHeader, `${tab}.${c.column} header colour`);
    });
  }
});

test("[B1] dropdowns are stop alerts on the list columns, over the rows and spare rows, and the lists are named", async () => {
  const f = await setup(rvs);
  await ok(f, ...RELEASE);
  const wb = await open(f.out);
  const status = wb.getWorksheet("Questions")!;
  const w = await world();
  const column = w.columns.Questions!.findIndex((c) => c.column === "answer_status") + 1;
  for (const row of [3, 4, 4 + 100]) {
    const v = status.getCell(row, column).dataValidation;
    assert.deepEqual({ type: v.type, formulae: v.formulae, errorStyle: v.errorStyle, show: v.showErrorMessage }, { type: "list", formulae: ["answer_status"], errorStyle: "stop", show: true });
  }
  assert.equal(status.getCell(5 + 100, column).dataValidation, undefined);
  const lists = wb.getWorksheet("Lists")!;
  const header = (lists.getRow(1).values as string[]).slice(1);
  assert.ok(header.includes("answer_status") && header.includes("auth_type"));
  assert.equal(header.includes("stage"), false, "only the lists of vendor columns");
  const names = (wb.definedNames.model as { name: string; ranges: string[] }[]).map((n) => n.name);
  assert.deepEqual([...names].sort(), [...header].sort());
  assert.equal(wb.definedNames.model.find((n: { name: string }) => n.name === "answer_status")!.ranges[0], `Lists!$${"ABCDEFGHIJ"[header.indexOf("answer_status")]}$2:$${"ABCDEFGHIJ"[header.indexOf("answer_status")]}$5`);
});

test("[B1] the vendor's columns are unlocked, everything else is locked under a sheet protection without a password, and the properties are generic", async () => {
  const f = await setup(rvs);
  await ok(f, ...RELEASE);
  const wb = await open(f.out);
  const w = await world();
  const ws = wb.getWorksheet("Questions")!;
  const protection = ws.sheetProtection as unknown as Record<string, unknown>;
  assert.equal(protection.sheet, true);
  assert.equal(protection.hashValue ?? protection.password, undefined, "no password, so no random salt");
  w.columns.Questions!.forEach((c, i) => {
    const locked = ws.getCell(3, i + 1).protection?.locked ?? true;
    assert.equal(locked, !c.edited, `${c.column} locked state`);
  });
  assert.equal(wb.creator, "Use case tracker");
  assert.equal(wb.lastModifiedBy, "Use case tracker");
  assert.equal(wb.created.toISOString(), "2026-11-20T00:00:00.000Z");
  assert.equal(ws.getCell(3, w.columns.Questions!.findIndex((c) => c.column === "released_on") + 1).numFmt, "yyyy-mm-dd");
});

test("[B1] a tab with no rows still gets a table, and a date column holds a real date", async () => {
  const rows = acmeRows();
  rows["Identity & Access"] = [];
  const f = await setup([], rows);
  await ok(f);
  assert.deepEqual(await sheetRows(f.out, "Identity & Access"), []);
  const wb = await open(f.out);
  assert.equal(wb.getWorksheet("Identity & Access")!.getTables().length, 1);
  const w = await world();
  const due = wb.getWorksheet("Questions")!.getCell(3, w.columns.Questions!.findIndex((c) => c.column === "due_on") + 1).value;
  assert.ok(due instanceof Date);
  assert.equal((await sheetRows(f.out, "Questions"))[0]!["Due on"], "2026-11-16");
});
