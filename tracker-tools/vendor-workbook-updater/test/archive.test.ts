import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { fixedZip } from "../src/archive.ts";

async function book(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = wb.modified = new Date("2026-11-20T00:00:00Z");
  wb.addWorksheet("A").getCell("A1").value = "x";
  return Buffer.from(await wb.xlsx.writeBuffer());
}

test("[B3] a zip written at different times has the same bytes once its entry times are fixed, and still opens", async () => {
  const first = await book();
  await new Promise((resolve) => setTimeout(resolve, 2100));
  const second = await book();
  assert.equal(first.equals(second), false, "the library stamps the clock into the zip");
  assert.ok(fixedZip(first).equals(fixedZip(second)));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fixedZip(first));
  assert.equal(wb.getWorksheet("A")!.getCell("A1").value, "x");
});

test("[B3] bytes that are not a zip are refused", () => {
  assert.throws(() => fixedZip(Buffer.from("not a zip file at all")), /not a zip archive/);
});
