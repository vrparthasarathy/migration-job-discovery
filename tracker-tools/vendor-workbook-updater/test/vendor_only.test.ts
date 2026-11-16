import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { vendorView } from "../../tracker-tables/src/vendor_view.ts";
import { loadExport } from "../../tracker-reconciler/src/inputs.ts";
import { ok, RELEASE, setup, update, world, zipNames, type RV } from "./support.ts";

const HEADINGS: Record<string, string[]> = {
  "Use Cases": ["Use case ref", "Use case", "Vendor", "Current version", "Specification"],
  Questions: ["Question ref", "Use case ref", "Vendor", "Question", "Answer"],
  "Identity & Access": ["Access ref", "Use case ref", "Vendor", "Service"],
};
const ROWS: Record<string, string[][]> = {
  "Use Cases": [["UC-001", "Daily Report", "Acme", "1", "https://specs.example/daily"]],
  Questions: [["QN-0001", "UC-001", "Acme", "Which time zone?", "UTC"]],
  "Identity & Access": [["AX-001", "UC-001", "Acme", "Reports"]],
};

/** Writes a hostile download: hidden sheets, an internal sheet, a hidden column, comments and hyperlinks, plus any edits. */
async function hostile(path: string, edit: (wb: ExcelJS.Workbook) => void = () => {}): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Read Me").state = "hidden";
  for (const [sheet, headings] of Object.entries(HEADINGS)) {
    const ws = wb.addWorksheet(sheet);
    ws.getCell(1, 1).value = "Band";
    headings.forEach((h, i) => (ws.getCell(2, i + 1).value = h));
    ROWS[sheet]![0]!.forEach((v, i) => (ws.getCell(3, i + 1).value = v));
    ws.getCell(3, 1).note = "internal note: see master";
    ws.getCell(3, 2).value = { text: ROWS[sheet]![0]![1]!, hyperlink: "https://master.example/internal" };
    ws.getColumn(headings.length).hidden = true;
  }
  const mappings = wb.addWorksheet("Workflow Mappings");
  mappings.getCell(1, 1).value = "Mapping ref";
  mappings.getCell(2, 1).value = "MP-001";
  wb.addWorksheet("Secret").state = "veryHidden";
  edit(wb);
  await wb.xlsx.writeFile(path);
}

const review: RV = { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", fields: { current_version: ["1", "2", "update"] } };

test("[B4] the output holds only this vendor's rows and vendor-visible columns, whatever the download hid or linked", async () => {
  const f = await setup([review]);
  await hostile(f.workbook);
  await ok(f, ...RELEASE);

  const w = await world();
  const problems: string[] = [];
  const data = (await loadExport(f.exportDir, w.schema, problems))!;
  const view = vendorView(w.schema, data.tables, "Acme");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(f.out);
  assert.deepEqual(wb.worksheets.map((s) => s.name), ["Read Me", "Use Cases", "Questions", "Identity & Access", "Lists"]);
  assert.equal(wb.worksheets.every((s) => s.state === "visible"), true);
  for (const tab of Object.keys(HEADINGS)) {
    const ws = wb.getWorksheet(tab)!;
    const headers = (ws.getRow(2).values as string[]).slice(1);
    const columns = headers.map((h) => w.columns[tab]!.find((c) => c.heading === h)!.column);
    assert.equal(columns.length, w.columns[tab]!.length, "every vendor column, in headings order");
    for (const column of columns) assert.ok(view[tab]!.header.includes(column), `${tab}.${column} is a vendor-visible column`);
    assert.deepEqual(ws.getColumn(1).hidden, false);
    for (let c = 1; c <= headers.length; c++) assert.equal(ws.getColumn(c).hidden, false);
    ws.eachRow((row) => row.eachCell((cell) => {
      assert.equal(cell.note, undefined, "no comment");
      assert.equal((cell.value as { hyperlink?: string } | null)?.hyperlink, undefined, "no link");
      assert.doesNotMatch(String(cell.text), /master|internal/i);
    }));
    const refs = ws.getColumn(1).values.slice(3).filter(Boolean);
    assert.deepEqual(refs, view[tab]!.rows.map((r) => r[columns[0]!]).filter((ref) => ref !== undefined && ref !== ""), `${tab} rows are the vendor's`);
  }
  const names = zipNames(await readFile(f.out));
  assert.equal(names.some((n) => /comments|externalLink|vmlDrawing|drawing/i.test(n)), false, names.join(","));
  const ReadMe = wb.getWorksheet("Read Me")!;
  const text: string[] = [];
  ReadMe.eachRow((row) => row.eachCell((cell) => text.push(String(cell.text))));
  assert.doesNotMatch(text.join(" "), /Mappings|master|internal/i);
});

test("[B4] a download with an internal column, or another vendor's row stops the run and writes nothing", async () => {
  const f = await setup([review]);
  await hostile(f.workbook, (wb) => (wb.getWorksheet("Use Cases")!.getCell(2, 6).value = "Stage"));
  const internal = await update(f);
  assert.equal(internal.status, 1);
  assert.match(internal.stderr, /downloaded\.xlsx: line 2: sheet "Use Cases": column "Stage" is not a vendor column/);

  await hostile(f.workbook, (wb) => {
    const ws = wb.getWorksheet("Questions")!;
    ["QN-0003", "UC-002", "Beta", "Beta question", ""].forEach((v, i) => (ws.getCell(4, i + 1).value = v));
  });
  const other = await update(f);
  assert.equal(other.status, 1);
  assert.match(other.stderr, /line 4: sheet "Questions": vendor "Beta" is not "Acme"/);
});
