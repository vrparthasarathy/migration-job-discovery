import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadSchema } from "../../tracker-tables/src/schema.ts";
import { loadColumns } from "../src/columns.ts";
import { columnsPath, editedPath, schemaPath } from "./support.ts";

async function load(headings?: string, edited?: string): Promise<{ problems: string[]; columns: Awaited<ReturnType<typeof loadColumns>> }> {
  const dir = await mkdtemp(join(tmpdir(), "vendor-updater-columns-"));
  const h = join(dir, "headings.csv");
  const e = join(dir, "edited.csv");
  await writeFile(h, headings ?? (await readFile(columnsPath, "utf8")));
  await writeFile(e, edited ?? (await readFile(editedPath, "utf8")));
  const problems: string[] = [];
  const columns = await loadColumns(h, e, await loadSchema(schemaPath), problems);
  return { problems: problems.map((p) => p.replace(dir + "/", "")), columns };
}

test("[B4] the vendor columns come from the sample headings, the schema and the vendor-edited data, with no column listed in code", async () => {
  const { columns, problems } = await load();
  assert.deepEqual(problems, []);
  assert.deepEqual(columns!.Questions!.filter((c) => c.edited).map((c) => c.column), ["answer", "answer_status", "answered_on", "answered_by"]);
  assert.equal(columns!["Use Cases"]!.some((c) => c.column === "stage"), false, "internal columns are not vendor columns");
  assert.equal(columns!["Identity & Access"]!.find((c) => c.column === "auth_type")!.allowed.includes("api-credential"), true);
  assert.equal(columns!.Questions![0]!.heading, "Question ref");
});

test("[B10] a headings or vendor-edited file that does not fit the schema is reported with its file and line", async () => {
  const original = await readFile(columnsPath, "utf8");
  assert.match((await load(original + "Use Cases,stage,Stage,Progress,V\n")).problems[0]!, /headings\.csv: line \d+: "stage" is not a vendor column of tab "Use Cases" in the schema/);
  assert.match((await load(original.replace("Questions,question_ref,Question ref,Question,V\n", "")!)).problems.join("\n"), /headings\.csv: line 1: no heading for the key column "question_ref" of tab "Questions"/);
  assert.match((await load(undefined, "tab,column\nQuestions,answer\nQuestions,stage\n")).problems.join("\n"), /edited\.csv: line 3: "stage" is not a vendor column of tab "Questions"/);
  assert.match((await load(undefined, "tab,column\nMappings,mapping_ref\n")).problems.join("\n"), /edited\.csv: line 2: "mapping_ref" is not a vendor column of tab "Mappings"/);
  assert.match((await load(original.replace("Questions,answered_by,Answered by,Vendor answer,V\n", ""))).problems.join("\n"), /edited\.csv: line 5: "answered_by" has no vendor heading/);
  assert.match((await load("tab,column,heading\n")).problems[0]!, /headings\.csv: line 1: missing column "band"/);
  assert.match((await load(undefined, 'tab,column\n"open')).problems[0]!, /edited\.csv: line 1: unterminated quoted field/);
  const missing = [] as string[];
  assert.equal(await loadColumns("/nonexistent/headings.csv", editedPath, await loadSchema(schemaPath), missing), undefined);
  assert.match(missing[0]!, /headings\.csv: line 1: cannot read file/);
});
