import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type Row } from "../tracker-tools/tracker-tables/src/csv.ts";
import { getTab, tabFileName } from "../tracker-tools/tracker-tables/src/schema.ts";
import { MANIFEST, examplePath, put, reconcile, rows, schema, snapshot, validate, workspace, writeExport, type Export } from "./support.ts";

/** What a lead does by hand with the additions: copy the suggested reference, the spec columns, the suggestions and the proposal references into the export. */
async function applyAdditions(out: string, exportDir: string): Promise<number> {
  const s = await schema();
  const data: Export = {};
  let applied = 0;
  for (const file of await readdir(join(out, "additions"))) {
    const table = parseCsv(await readFile(join(out, "additions", file), "utf8"), file);
    const tab = s.tabs.find((t) => tabFileName(t.tab) === file)!.tab;
    const columns = getTab(s, tab).columns;
    const refColumn = columns.find((c) => c.key && c.type === "ref")!.column;
    data[tab] = table.rows.map((row) => {
      const added: Row = { [refColumn]: row.suggested_ref!, proposal_refs: row.suggested_proposal_refs!, last_updated: "2026-11-21" };
      for (const [name, value] of Object.entries(row)) {
        const plain = name.startsWith("suggested_") ? name.slice("suggested_".length) : name;
        if (columns.some((c) => c.column === plain) && plain !== "proposal_refs" && plain !== refColumn) added[plain] = value;
      }
      applied++;
      return added;
    });
  }
  await writeExport(exportDir, data, [{ ...MANIFEST[0]!, exported_at: "2026-11-21" }]);
  return applied;
}

test("[B06] the example proposal is valid, gives additions against an empty export and none once they are applied", async () => {
  const w = await workspace();
  await writeExport(w.exportDir, {});
  await put(join(w.proposals, "website-check-example", "tracker-updates.csv"), await readFile(examplePath, "utf8"));

  const checked = await validate(examplePath);
  assert.equal(checked.status, 0, checked.stderr);
  assert.match(checked.stdout, /tracker-updates\.csv: ok/);

  const first = await reconcile(w);
  assert.equal(first.status, 0, first.stderr);
  const useCases = await rows(join(w.out, "additions", "use-cases.csv"));
  const questions = await rows(join(w.out, "additions", "questions.csv"));
  assert.deepEqual(useCases.map((r) => r.local_key), ["Website Availability Check"]);
  assert.deepEqual(questions.map((r) => r.local_key), [1, 2, 3, 4, 5, 6].map((n) => `website-availability-check/Q${n}`));
  assert.ok(questions.every((r) => r.suggested_ref!.startsWith("QN-") && r.ref_status === "suggested" && r.suggested_status === "captured"), "references are suggestions and the rows stay captured");

  assert.equal(await applyAdditions(w.out, w.exportDir), 7, "one use case and six question rows applied");

  const second = await reconcile(w);
  assert.equal(second.status, 0, second.stderr);
  const files = Object.keys(await snapshot(w.out));
  assert.equal(files.some((name) => name.startsWith("additions")), false, "no additions the second time");
  for (const name of ["field-updates.csv", "conflicts.csv"]) assert.deepEqual(await rows(join(w.out, name)), [], name);
  assert.match(await readFile(join(w.out, "reconciliation-report.md"), "utf8"), /reflected/i);
});

test("[B06] a proposal that is not valid stops the run with a message and writes nothing", async () => {
  const w = await workspace();
  await writeExport(w.exportDir, {});
  const broken = (await readFile(examplePath, "utf8")).replace(",Use Cases,add,", ",Usecases,add,");
  await put(join(w.proposals, "website-check-example", "tracker-updates.csv"), broken);
  const outcome = await reconcile(w);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /tracker-updates\.csv: line \d+/);
  assert.deepEqual(await snapshot(w.out), {});
});
