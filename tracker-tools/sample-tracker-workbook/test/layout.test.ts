import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadSchema } from "../../tracker-tables/src/schema.ts";
import { buildWorkbook, saveWorkbook } from "../src/workbook.ts";
import { loadSampleData } from "../src/sample_data.ts";
import { readWorkbook } from "../src/readback.ts";
import { AS_OF, DATA, SCHEMA, columnLetter, generatedBook, realData, records, sheetOf, tempDir } from "./support.ts";

const DATA_SHEETS = ["Use Cases", "Questions", "Identity & Access", "Workflow Mappings", "Proposed Changes", "Trace"];
const SCHEMA_TAB: Record<string, string> = { "Use Cases": "Use Cases", Questions: "Questions", "Identity & Access": "Identity & Access", "Workflow Mappings": "Mappings" };
const BLUE = "FF2F5597";
const GREY = "FF7F7F7F";
const RED = "FFC00000";

test("[B6] every enum column has a stop-alert dropdown listing the schema's allowed values", async () => {
  const book = await generatedBook();
  const schema = await loadSchema(SCHEMA);
  const lists = sheetOf(book, "Lists");
  let checked = 0;
  for (const sheetName of Object.keys(SCHEMA_TAB)) {
    const sheet = sheetOf(book, sheetName);
    const enums = schema.tabs.find((t) => t.tab === SCHEMA_TAB[sheetName])!.columns.filter((c) => c.type === "enum");
    const dataRows = sheet.rows.length - 2;
    for (const column of enums) {
      const headingIndex = sheet.rows[1]!.findIndex((_, i) => sheet.validations[`${columnLetter(i)}3`]?.formulae[0] === column.column);
      if (headingIndex < 0) continue; // enum column omitted from the main sheet
      checked++;
      for (const row of [3, 3 + dataRows - 1, 60]) {
        const v = sheet.validations[`${columnLetter(headingIndex)}${row}`]!;
        assert.deepEqual([v.type, v.errorStyle, v.showErrorMessage, v.formulae], ["list", "stop", true, [column.column]], `${sheetName} ${column.column} row ${row}`);
      }
      const range = book.names[column.column]!;
      const match = /^Lists!\$([A-Z]+)\$(\d+):\$[A-Z]+\$(\d+)$/.exec(range)!;
      const colIndex = match[1]!.charCodeAt(0) - 65;
      const values = lists.rows.slice(Number(match[2]) - 1, Number(match[3])).map((r) => r[colIndex]);
      assert.deepEqual(values, column.allowed, `${column.column} list`);
    }
  }
  assert.equal(checked, 14, "all fourteen enum columns shown on the main sheets have a dropdown");
  const questions = sheetOf(book, "Questions");
  const textColumn = questions.rows[1]!.indexOf("Question");
  assert.equal(questions.validations[`${columnLetter(textColumn)}3`], undefined, "a text column has no dropdown");
});

test("[B6] the lists are read from the schema at generation", async () => {
  const dir = await tempDir();
  const schemaCopy = join(dir, "tracker-schema.csv");
  const text = await readFile(SCHEMA, "utf8");
  await writeFile(schemaCopy, text.replace("draft;review;sent;awaiting-acknowledgement;acknowledged", "draft;review;sent;awaiting-acknowledgement;acknowledged;parked"));
  const out = join(dir, "x.xlsx");
  await saveWorkbook(buildWorkbook(await loadSampleData(DATA, schemaCopy), AS_OF), out);
  const book = await readWorkbook(out);
  const lists = sheetOf(book, "Lists");
  const stage = lists.rows[0]!.indexOf("stage");
  assert.equal(lists.rows[6]![stage], "parked");
});

test("[B8] main sheets freeze headers and key columns, filter, set readable widths and hide nothing", async () => {
  const book = await generatedBook();
  const data = await realData();
  for (const name of DATA_SHEETS) {
    const sheet = sheetOf(book, name);
    assert.equal(sheet.state, "visible", name);
    assert.equal(sheet.freeze.y, 2, `${name} frozen header rows`);
    assert.ok(sheet.freeze.x >= 1, `${name} frozen key column`);
    assert.equal(sheet.tables.length, 1, `${name} is an Excel table`);
    assert.equal(sheet.tables[0]!.filterButtons, true, `${name} filter`);
    assert.equal(sheet.tables[0]!.ref.startsWith("A2:"), true);
    const columns = sheet.rows[1]!.length;
    assert.equal(sheet.widths.length, columns);
    for (const width of sheet.widths) assert.ok(width >= 10 && width <= 60, `${name} width ${width}`);
    assert.deepEqual([sheet.hiddenColumns, sheet.hiddenRows], [[], []], `${name} hides nothing`);
  }
  assert.equal(sheetOf(book, "Use Cases").freeze.x, 2);
  assert.equal(sheetOf(book, "Proposed Changes").freeze.x, 1);
  assert.ok(data.headings.length > 100);
  for (const sheet of book.sheets) assert.equal(sheet.state, "visible");
});

test("[B8] header colour and tab colour mark vendor-visible and internal columns and sheets", async () => {
  const book = await generatedBook();
  const schema = await loadSchema(SCHEMA);
  const data = await realData();
  for (const name of DATA_SHEETS) {
    const sheet = sheetOf(book, name);
    const tab = SCHEMA_TAB[name];
    const entries = data.headings.filter((h) => (tab ? h.tab === tab : h.tab === name));
    assert.deepEqual(sheet.rows[1], entries.map((h) => h.heading), `${name} headings follow headings.csv`);
    entries.forEach((h, i) => {
      const visibility = tab ? schema.tabs.find((t) => t.tab === tab)!.columns.find((c) => c.column === h.column)?.visibility : "internal";
      const expected = visibility === "vendor" ? BLUE : GREY;
      assert.equal(sheet.fills[`${columnLetter(i)}2`], expected, `${name} ${h.heading}`);
    });
    assert.equal(sheet.tabColor === RED, ["Workflow Mappings", "Proposed Changes", "Trace"].includes(name), `${name} tab colour`);
    assert.ok(sheet.rows[0]!.some((cell) => cell !== ""), `${name} has a band`);
  }
  assert.equal(sheetOf(book, "Read Me").tabColor === RED, false);
  assert.equal(sheetOf(book, "Lists").tabColor === RED, false);
});

test("[B8] the Read Me marks every sheet and column as vendor-visible or internal and states it is not vendor-safe", async () => {
  const book = await generatedBook();
  const readme = sheetOf(book, "Read Me");
  const text = readme.rows.flat().join("\n");
  assert.match(text, /not vendor-safe/i);
  assert.match(text, new RegExp(AS_OF));
  const sheetRows = readme.rows.slice(0, readme.rows.findIndex((r) => r[0] === "Colour key")).filter((r) => ["Use Cases", "Questions", "Identity & Access", "Workflow Mappings", "Proposed Changes", "Trace", "Lists", "Read Me"].includes(String(r[0])) && /^(Mixed|Internal only|Reference)/.test(String(r[1])));
  assert.deepEqual(sheetRows.map((r) => [r[0], String(r[1]).split(" ")[0]!.replace(":", "")]), [
    ["Read Me", "Reference"], ["Use Cases", "Mixed"], ["Questions", "Mixed"], ["Identity & Access", "Mixed"],
    ["Workflow Mappings", "Internal"], ["Proposed Changes", "Internal"], ["Trace", "Internal"], ["Lists", "Reference"],
  ]);
  const data = await realData();
  const dictionary = readme.rows.filter((r) => DATA_SHEETS.includes(String(r[0])) && /^(Vendor-visible|Internal)$/.test(String(r[2])));
  assert.equal(dictionary.length, data.headings.length, "one dictionary row per column");
  const answer = dictionary.find((r) => r[0] === "Questions" && r[1] === "Answer")!;
  assert.deepEqual([answer[2], answer[3]], ["Vendor-visible", "answer"]);
  const computed = dictionary.find((r) => r[1] === "Days past original due")!;
  assert.match(String(computed[3]), /computed/i);
});

test("[B9] main sheets keep accepted values and a pending-change pointer, proposals sit on Proposed Changes", async () => {
  const book = await generatedBook();
  const uc = records(sheetOf(book, "Use Cases"));
  const uc2 = uc.find((r) => r["Use case ref"] === "UC-002")!;
  assert.deepEqual([uc2["Current version"], uc2["Pending change"]], ["v2", "PC-001"]);
  assert.equal(uc.find((r) => r["Use case ref"] === "UC-003")!["Pending change"], "PC-002");
  assert.equal(uc.find((r) => r["Use case ref"] === "UC-001")!["Pending change"], "");
  const mainText = ["Use Cases", "Questions", "Identity & Access", "Workflow Mappings"].map((n) => sheetOf(book, n).rows.flat().join("\n")).join("\n");
  assert.ok(!mainText.includes("legacy archive folder"), "a proposed value is not on a main sheet");
  assert.ok(!/\bv3\b/.test(mainText));
  const proposals = records(sheetOf(book, "Proposed Changes"));
  assert.equal(proposals.length, 2);
  const pc1 = proposals.find((r) => r["Change ref"] === "PC-001")!;
  assert.deepEqual([pc1["Current value"], pc1["Proposed value"], pc1["Review status"]], ["v2", "v3", "pending-review"]);
});

test("[B9] proposal metadata is on Proposed Changes and Trace, not on the main sheets", async () => {
  const book = await generatedBook();
  const proposalHeadings = sheetOf(book, "Proposed Changes").rows[1]!;
  for (const heading of ["Proposal", "Update", "Base value", "Source", "Merge request"]) assert.ok(proposalHeadings.includes(heading), heading);
  for (const name of ["Use Cases", "Questions", "Identity & Access", "Workflow Mappings"]) {
    const headings = sheetOf(book, name).rows[1]!.map(String);
    for (const forbidden of ["Proposal", "Update", "Base value", "Source links", "Merge request", "Evidence refs", "Proposal refs", "Last updated"]) {
      assert.ok(!headings.includes(forbidden), `${name} omits ${forbidden}`);
    }
  }
  const trace = records(sheetOf(book, "Trace")).map((r) => `${r.Record}|${r.Kind}|${r.Reference}`);
  assert.ok(trace.includes("UC-002|proposal|TP-2026-11-13-B"), "explicit proposal trace");
  assert.ok(trace.includes("UC-001|proposal|TP-2026-11-09-A"), "proposal_refs moved to Trace");
  assert.ok(trace.includes("UC-001|merge-request|https://git.example.invalid/specs/harborline/-/merge_requests/41"), "mr_link moved to Trace");
  assert.ok(trace.includes("QN-0001|source|specs/harborline-analytics/daily-invoice-status-report.md@v2#q1"), "source_links moved to Trace");
  assert.ok(trace.includes("AX-001|evidence|specs/harborline-analytics/daily-invoice-status-report.md@v2#access"), "evidence_refs moved to Trace");
  assert.equal(new Set(trace).size, trace.length, "no duplicate trace rows");
});

test("[B8] dates are real dates formatted yyyy-mm-dd and the workbook timestamps are fixed", async () => {
  const book = await generatedBook();
  const questions = sheetOf(book, "Questions");
  const released = questions.rows[1]!.indexOf("Released on");
  assert.equal(questions.rows[2]![released], "2026-11-09");
  assert.equal(questions.formats[`${columnLetter(released)}3`], "yyyy-mm-dd");
  assert.equal(book.created, "2026-11-16T00:00:00.000Z");
  assert.equal(book.modified, "2026-11-16T00:00:00.000Z");
});
