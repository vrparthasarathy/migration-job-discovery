import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getTab } from "../../tracker-tables/src/schema.ts";
import { loadMasterColumns } from "../src/master_columns.ts";
import { columnsPath, lib } from "./support.ts";

async function load(text: string): Promise<{ problems: string[]; ok: boolean }> {
  const w = await lib();
  const dir = await mkdtemp(join(tmpdir(), "master-columns-"));
  const file = join(dir, "headings.csv");
  if (text !== "") await writeFile(file, text);
  const problems: string[] = [];
  const columns = await loadMasterColumns(file, w.schema, problems);
  return { problems: problems.map((p) => p.replace(dir, "dir")), ok: columns !== undefined };
}

test("[B1] the columns are the sample's headings, then every schema column the sample omits in a trailing band", async () => {
  const w = await lib();
  const uc = w.master["Use Cases"]!;
  assert.deepEqual(uc.slice(0, 3).map((c) => [c.column, c.heading, c.band, c.visibility]), [["use_case_ref", "Use case ref", "Use case", "V"], ["use_case_name", "Use case", "Use case", "V"], ["vendor", "Vendor", "Use case", "V"]]);
  assert.deepEqual(uc.slice(-3).map((c) => [c.column, c.heading, c.band]), [["mr_link", "mr_link", "Trace and bookkeeping"], ["proposal_refs", "proposal_refs", "Trace and bookkeeping"], ["last_updated", "last_updated", "Trace and bookkeeping"]]);
  assert.equal(uc.some((c) => c.column === "pending_change"), false);
  for (const tab of Object.keys(w.master)) {
    const names = w.master[tab]!.filter((c) => !c.computed).map((c) => c.column).sort();
    assert.deepEqual(names, getTab(w.schema, tab).columns.map((c) => c.column).sort(), tab);
  }
  assert.deepEqual(w.master.Questions!.filter((c) => c.computed).map((c) => c.column), ["review_state", "days_past_original_due", "age_awaiting_review"]);
  assert.equal(w.master.Batches!.every((c) => c.band === "Batches" && c.heading === c.column), true);
});

test("[B8] a headings file that cannot be read or does not fit the schema is named with its line", async () => {
  const good = await readFile(columnsPath, "utf8");
  assert.deepEqual((await load("")).problems, ["dir/headings.csv: line 1: cannot read file"]);
  assert.deepEqual((await load('"open')).problems, ["dir/headings.csv: line 1: unterminated quoted field"]);
  assert.deepEqual((await load("tab,column\n")).problems, ['dir/headings.csv: line 1: missing column "heading"']);
  const unknown = await load(`${good}Use Cases,nothing,Nothing,Use case,V\n`);
  assert.equal(unknown.ok, false);
  assert.deepEqual(unknown.problems, [`dir/headings.csv: line ${good.split("\n").length}: "nothing" is not a column of tab "Use Cases" in the schema`]);
  const twice = await load(`${good}Use Cases,notes_internal,Vendor,Use case,I\n`);
  assert.deepEqual(twice.problems, ['dir/headings.csv: line 1: heading "vendor" is used twice in tab "Use Cases"']);
});
