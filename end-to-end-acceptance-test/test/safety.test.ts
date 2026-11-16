import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { useCaseId } from "../../tracker-tools/tracker-tables/src/use_case_id.ts";
import { getTab } from "../../tracker-tools/tracker-tables/src/schema.ts";
import { columnsPath, expected, headingsCsv, ID, pack, rows, sandbox, schema, sheetHeadings, vendorCells, walk } from "./support.ts";

const VENDOR_SHEETS: Record<string, string> = { "Use Cases": "Use Cases", Questions: "Questions", "Identity & Access": "Identity & Access" };

test("[B10] no vendor workbook has an internal column, by heading or by cell, computed from the schema's visibility", async () => {
  const w = await walk();
  const s = await schema();
  const internalColumns = new Set(Object.keys(VENDOR_SHEETS).flatMap((tab) => getTab(s, tab).columns.filter((c) => c.visibility === "internal").map((c) => `${tab}|${c.column}`)));
  const heads = await rows(columnsPath);
  const internalHeadings = new Set(heads.filter((h) => VENDOR_SHEETS[h.tab!] !== undefined && internalColumns.has(`${h.tab}|${h.column}`)).map((h) => `${h.tab}|${h.heading}`));
  assert.ok(internalHeadings.size > 10, "the schema has internal columns to check against");

  for (const file of ["vendor-1/Harborline.xlsx", "vendor-2/Harborline.xlsx", "vendor-answered/Harborline.xlsx"]) {
    const all = await sheetHeadings(join(w.dir, "work", file));
    assert.deepEqual(Object.keys(all), ["Read Me", "Use Cases", "Questions", "Identity & Access", "Lists"], `${file}: sheets`);
    for (const [sheet, list] of Object.entries(all)) {
      for (const heading of list) {
        assert.equal(internalHeadings.has(`${sheet}|${heading}`) || internalColumns.has(`${sheet}|${heading}`), false, `${file}: sheet ${sheet} has the internal heading "${heading}"`);
      }
    }
  }
  for (const file of ["vendor-1/Harborline.xlsx", "vendor-2/Harborline.xlsx"]) {
    const cells = await rows(join(expected, file === "vendor-1/Harborline.xlsx" ? "s06b-vendor.csv" : "s08-vendor.csv"));
    for (const cell of cells) assert.equal(internalColumns.has(`${cell.tab}|${cell.field}`), false, `${file}: ${cell.tab} ${cell.ref} carries the internal field ${cell.field}`);
    assert.equal(await vendorCells(join(w.dir, "work", file)), (await readFile(join(expected, file === "vendor-1/Harborline.xlsx" ? "s06b-vendor.csv" : "s08-vendor.csv"), "utf8")), `${file}: vendor cells`);
  }
  assert.ok((await headingsCsv(join(w.dir, "work", "vendor-1", "Harborline.xlsx"))).includes("Question ref"));
});

test("[B10] a second folder with the same vendor and use case name has the same ID as the first, which the skill's duplicate check stops on", async () => {
  const dir = await sandbox();
  await cp(join(dir, "harborline"), join(dir, "harborline-copy"), { recursive: true });
  const [index] = await rows(join(dir, "expected", "use-case-index.csv"));
  const first = index!.folder!;
  const second = "harborline-copy/refund-retry";
  assert.deepEqual((await readdir(join(dir, "harborline-copy"))).sort(), ["refund-retry"]);
  assert.notEqual(first, second, "two different folders");
  assert.equal(useCaseId(index!.vendor!, index!.use_case_name!), ID, "the index row gives the use case ID");
  // The copy is named and read the same way, so its derived ID equals the ID of the index row.
  assert.equal(useCaseId("Harborline", "Refund Retry"), ID);

  const skill = await readFile(join(pack, "discovery-orchestrator", "run-discovery", "SKILL.md"), "utf8");
  assert.match(skill, /if another row has the same derived ID in a different `folder`, stop, write nothing, name both folders and say the lead must rename one/i);
  const sheet = await readFile(join(pack, "end-to-end-acceptance-test", "acceptance-run-sheet.md"), "utf8");
  assert.ok(sheet.includes(first) && sheet.includes(second), "S02 names both folders");
  assert.match(sheet, /It writes nothing/);
});
