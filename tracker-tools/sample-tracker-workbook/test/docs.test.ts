import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readWorkbook } from "../src/readback.ts";
import { COMPONENT, SHEETS, generatedBook, sheetOf } from "./support.ts";

const MAIN = ["Use Cases", "Questions", "Identity & Access", "Workflow Mappings", "Proposed Changes", "Trace"];
const doc = (name: string) => readFile(join(COMPONENT, name), "utf8");

function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  assert.ok(start >= 0, `section "${heading}" exists`);
  const rest = text.slice(start + 1);
  const next = rest.indexOf("\n## ", 3);
  return next < 0 ? rest : rest.slice(0, next);
}

test("[B10] every `Sheet > Heading` the docs name exists in the generated workbook", async () => {
  const book = await generatedBook();
  let named = 0;
  for (const file of ["walkthrough.md", "contract.md", "requirements.md", "README.md"]) {
    for (const [, sheet, heading] of (await doc(file)).matchAll(/`([A-Z][A-Za-z &]+) > ([^`]+)`/g)) {
      if (!SHEETS.includes(sheet!)) continue; // the shape `Sheet > Heading` is only used for workbook columns
      named++;
      assert.ok(sheetOf(book, sheet!).rows[MAIN.includes(sheet!) ? 1 : 0]!.includes(heading!), `${file}: \`${sheet} > ${heading}\` is not in the workbook`);
    }
  }
  assert.ok(named >= 25, `the docs name ${named} columns`);
});

test("[B10] the walkthrough tours every sheet with feedback questions and says how to present and capture feedback", async () => {
  const text = await doc("walkthrough.md");
  for (const sheet of SHEETS) {
    const body = section3(text, sheet);
    assert.match(body, /Feedback questions/, `${sheet} has feedback questions`);
    assert.ok((body.match(/\?\s*$/gm) ?? []).length >= 2, `${sheet} has at least two questions`);
  }
  assert.match(section(text, "Presenting the sample"), /\S/);
  assert.match(section(text, "Capturing feedback"), /\S/);
  assert.match(text, /as-of date/i);
});

function section3(text: string, sheet: string): string {
  const chunks = text.split(/^(?=#{2,3} )/m);
  const found = chunks.find((c) => c.startsWith(`### ${sheet}\n`));
  assert.ok(found, `walkthrough has a section for ${sheet}`);
  return found;
}

test("[B10] the differences from the tracker contract and the follow-on work are recorded and agree with the files", async () => {
  const contract = await doc("contract.md");
  const differences = section3Of(contract, "Differences from the tracker contract");
  assert.equal((differences.match(/^\d+\. /gm) ?? []).length, 8);
  assert.match(await doc("walkthrough.md"), /Differences from the tracker contract/);
  const requirements = await doc("requirements.md");
  assert.match(section(requirements, "Follow-on work (recorded, not built)"), /discovery-to-review-csv-pipeline/);
  assert.match(await doc("walkthrough.md"), /Follow-on work/);
});

function section3Of(text: string, heading: string): string {
  const start = text.indexOf(`### ${heading}`);
  assert.ok(start >= 0, `"${heading}" exists`);
  return text.slice(start);
}

test("[B10] the kept sample-tracker-workbook.xlsx matches a fresh generation at the as-of date", async () => {
  const kept = await readWorkbook(join(COMPONENT, "sample-tracker-workbook.xlsx"));
  assert.deepEqual(kept, await generatedBook());
});
