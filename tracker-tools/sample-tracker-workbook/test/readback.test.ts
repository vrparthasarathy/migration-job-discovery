import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { readWorkbook } from "../src/readback.ts";
import { tempDir } from "./support.ts";

test("[B8] the read-back reports hidden sheets, rows and columns, so a hidden item cannot go unnoticed", async () => {
  const wb = new ExcelJS.Workbook();
  const open = wb.addWorksheet("Open");
  open.addRow(["a", "b"]);
  open.getRow(1).hidden = true;
  open.getColumn(2).hidden = true;
  wb.addWorksheet("Secret", { state: "hidden" }).addRow(["x"]);
  const file = join(await tempDir(), "hidden.xlsx");
  await wb.xlsx.writeFile(file);
  const [first, second] = (await readWorkbook(file)).sheets;
  assert.deepEqual([first!.hiddenRows, first!.hiddenColumns, first!.state], [[1], [2], "visible"]);
  assert.equal(second!.state, "hidden");
});

test("[B8] the read-back reports a missing freeze, tab colour, width and dropdown as empty", async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("Plain").addRow(["a"]);
  const file = join(await tempDir(), "plain.xlsx");
  await wb.xlsx.writeFile(file);
  const [sheet] = (await readWorkbook(file)).sheets;
  assert.deepEqual([sheet!.freeze, sheet!.tabColor, sheet!.widths, sheet!.validations, sheet!.tables], [{ x: 0, y: 0 }, "", [0], {}, []]);
});
