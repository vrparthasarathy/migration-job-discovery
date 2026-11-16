import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type Row } from "../tracker-tools/tracker-tables/src/csv.ts";
import { getTab, tabFileName } from "../tracker-tools/tracker-tables/src/schema.ts";
import { addUseCase } from "./fixtures.ts";
import { MANIFEST, examplePath, exportReview, put, reconcile, rows, schema, snapshot, validate, workspace, writeExport, writeProposal, type Export } from "./support.ts";

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
  assert.deepEqual(useCases.map((r) => r.local_key), ["uc-example-vendor-website-availability-check"]);
  assert.deepEqual(questions.map((r) => r.local_key), [1, 2, 3, 4, 5, 6].map((n) => `uc-example-vendor-website-availability-check/Q${n}`));
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

const ACME = "uc-acme-daily-report";
const BETA = "uc-beta-daily-report";

test("[B09] two vendors' same-named use cases and their question 1 are two additions each under two IDs, never merged", async () => {
  const w = await workspace();
  await writeExport(w.exportDir, {});
  await writeProposal(w.proposals, "mr-20", [...addUseCase(ACME, "Acme", "Daily Report"), ...addUseCase(BETA, "Beta", "Daily Report")]);

  const reconciled = await reconcile(w);
  assert.equal(reconciled.status, 0, reconciled.stderr);
  const useCases = await rows(join(w.out, "additions", "use-cases.csv"));
  const questions = await rows(join(w.out, "additions", "questions.csv"));
  assert.deepEqual(useCases.map((r) => r.local_key).sort(), [ACME, BETA], "two use case additions under two IDs");
  assert.deepEqual(questions.map((r) => r.local_key).sort(), [`${ACME}/Q1`, `${BETA}/Q1`], "two question additions, one per use case ID");
  assert.equal(new Set(useCases.map((r) => r.suggested_ref)).size, 2, "two different suggested references");
  assert.equal(new Set(questions.map((r) => r.suggested_ref)).size, 2);
  assert.deepEqual(await rows(join(w.out, "conflicts.csv")), [], "neither is held or in conflict with the other");

  const review = join(w.dir, "review");
  const exported = await exportReview(w, review);
  assert.equal(exported.status, 0, exported.stderr);
  const reviewUseCases = await rows(join(review, "review-use-cases.csv"));
  const reviewQuestions = await rows(join(review, "review-questions.csv"));
  assert.deepEqual(reviewUseCases.map((r) => [r.use_case, r.kind]).sort(), [[ACME, "add"], [BETA, "add"]], "the exporter lists two use case additions");
  assert.deepEqual(reviewQuestions.map((r) => [r.use_case, r.record_key, r.kind]).sort(), [[ACME, `${ACME}/Q1`, "add"], [BETA, `${BETA}/Q1`, "add"]], "and two question additions");
});

test("[B10] a reference to an unknown use case ID, or in the old name or slug-alone form, stops the run naming file and line and writes nothing", async () => {
  const forms: Record<string, string> = {
    "an unknown use case ID": "uc-acme-weekly-report/Q1",
    "the use case name form": "Daily Report/Q1",
    "the slug-alone form": "daily-report/Q1",
  };
  for (const [label, key] of Object.entries(forms)) {
    const w = await workspace();
    await writeExport(w.exportDir, {});
    await writeProposal(w.proposals, "mr-21", [
      ...addUseCase(ACME, "Acme", "Daily Report"),
      { tab: "Questions", op: "add", key, field: "question_text", value: "A question that points at no known use case" },
    ]);
    const outcome = await reconcile(w);
    assert.equal(outcome.status, 1, `${label}: ${outcome.stdout}`);
    assert.match(outcome.stderr, /tracker-updates\.csv: line \d+/, `${label} names the file and line`);
    assert.match(outcome.stderr, /use case ID/, label);
    assert.deepEqual(await snapshot(w.out), {}, `${label}: nothing is written`);
    const review = join(w.dir, "review");
    assert.equal((await exportReview(w, review)).status, 1, `${label}: the exporter stops too`);
    assert.deepEqual(await snapshot(review), {}, `${label}: the exporter writes nothing`);
  }
});
