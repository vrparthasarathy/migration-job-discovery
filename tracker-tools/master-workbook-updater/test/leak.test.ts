import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { download, lib, ok, setup, textOf, vendorRows, type Env } from "./support.ts";
import { readVendorWorkbook } from "../../vendor-workbook-updater/src/workbook_read.ts";

/** Every cell text of every sheet, and whether any sheet or column is hidden. */
async function everything(path: string): Promise<{ texts: string[]; hidden: boolean }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const texts: string[] = [];
  let hidden = false;
  for (const ws of wb.worksheets) {
    hidden ||= ws.state !== "visible";
    ws.eachRow((row) => row.eachCell((cell) => void texts.push(cell.text)));
  }
  return { texts, hidden };
}

test("[B7] a vendor workbook carries no internal value, mapping, group, link or other vendor's row, and the Updater's reader accepts it", async () => {
  const env = await setup();
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await ok(env, "--vendor", `Acme=${acme}`, "--new-vendor", "Beta", "--vendor-out", env.vendorOut);
  const w = await lib();
  const files = { Acme: join(env.vendorOut, "Acme.xlsx"), Beta: join(env.vendorOut, "Beta.xlsx") };
  const internal = ["internal-only-note", "Lead Rae", "Retry scheduling", "Report Builder", "QG-001", "QL-0001", "MP-001", "WD-001", "UC-003", "Gamma", "Invoice Feed", "QN-0004"];
  const foreign = { Acme: ["Beta", "Nightly Sync", "UC-002", "QN-0003", "QN-0002", "archive retention"], Beta: ["Acme", "Daily Report", "UC-001", "QN-0001", "AX-001", "TCK-9"] };
  for (const vendor of ["Acme", "Beta"] as const) {
    const problems: string[] = [];
    assert.ok(await readVendorWorkbook(files[vendor], w.columns, vendor, problems));
    assert.deepEqual(problems, []);
    const { texts, hidden } = await everything(files[vendor]);
    assert.equal(hidden, false);
    for (const bad of [...internal, ...foreign[vendor]]) assert.equal(texts.some((t) => t.includes(bad)), false, `${vendor} workbook holds "${bad}"`);
  }
});

test("[B7] syncing again from the rebuilt vendor workbook gives no change", async () => {
  const env = await setup();
  const acme = await download(env, "acme.xlsx", "Acme", vendorRows("Acme"));
  await ok(env, "--vendor", `Acme=${acme}`, "--vendor-out", env.vendorOut);

  const again: Env = { ...env, master: env.out, out: join(env.root, "again", "master.xlsx"), report: join(env.root, "again", "report.md"), vendorOut: join(env.root, "again", "vendors") };
  await ok(again, "--vendor", `Acme=${join(env.vendorOut, "Acme.xlsx")}`, "--vendor-out", again.vendorOut);
  assert.match(await textOf(again.report), /Vendor values synced: 0; sync conflicts: 0; held workbooks: 0/);
  assert.deepEqual(await readFile(again.out), await readFile(env.out));
  assert.deepEqual(await readFile(join(again.vendorOut, "Acme.xlsx")), await readFile(join(env.vendorOut, "Acme.xlsx")));
});
