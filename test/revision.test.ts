import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Row } from "../tracker-tools/tracker-tables/src/csv.ts";
import { answeredExport, revisedSpecification } from "./fixtures.ts";
import { reconcile, rows, snapshot, text, workspace, writeExport, writeProposal } from "./support.ts";

/** Reconciles the revised specification's proposal against the export that holds the answer, the owner and the decided mappings. */
async function revise() {
  const w = await workspace();
  await writeExport(w.exportDir, answeredExport());
  await writeProposal(w.proposals, "mr-13", revisedSpecification);
  const before = await snapshot(w.exportDir);
  const outcome = await reconcile(w);
  assert.equal(outcome.status, 0, outcome.stderr);
  return {
    w,
    before,
    updates: () => rows(join(w.out, "field-updates.csv")),
    suggestions: () => rows(join(w.out, "suggestions.csv")),
    conflicts: () => rows(join(w.out, "conflicts.csv")),
    report: () => text(join(w.out, "reconciliation-report.md")),
  };
}

const re = (list: Row[]) => list.filter((r) => r.kind === "re-review");

test("[B08] the existing question row, its answer and its owner are preserved with no duplicate record", async () => {
  const r = await revise();
  const files = Object.keys(await snapshot(r.w.out));
  assert.equal(files.some((name) => name.startsWith("additions")), false, "no addition, so no duplicate question row");
  const updates = await r.updates();
  const touched = (record: string) => updates.filter((u) => u.record === record).map((u) => u.field);
  for (const field of ["answer", "answer_status", "answered_on", "answered_by", "our_owner", "status", "question_text", "released_on", "batch_ref"]) {
    assert.equal(touched("QN-0001").includes(field), false, `${field} of the question row is never updated`);
    assert.equal(touched("UC-001").includes(field), false, `${field} of the use case is never updated`);
  }
  const owner = (await r.suggestions()).filter((s) => s.record === "UC-001" && s.field === "our_owner");
  assert.deepEqual(owner.map((s) => [s.current_value, s.suggested_value, s.review]), [["Ann", "Zed", "current-value-kept"]], "a different owner is only a suggestion; the current owner is kept");
  assert.deepEqual(await snapshot(r.w.exportDir), r.before, "the export is untouched");
});

test("[B08] a wording edit gives a text-review suggestion and no withdrawal", async () => {
  const r = await revise();
  const edit = (await r.updates()).filter((u) => u.record === "QN-0001");
  assert.deepEqual(edit.map((u) => [u.field, u.current_value, u.proposed_value]), [["current_spec_text", "Which time zone does the daily report use?", "Which time zone does the daily report use for its timestamps?"]]);
  const review = (await r.suggestions()).filter((s) => s.kind === "text-review");
  assert.deepEqual(review.map((s) => [s.record, s.field, s.review]), [["QN-0001", "current_spec_text", "lead-review"]]);
  const everything = [await r.report(), JSON.stringify(await r.updates()), JSON.stringify(await r.suggestions())].join("\n");
  for (const word of ["withdrawn", "superseded", "closed"]) assert.equal(everything.includes(word), false, `nothing says ${word}`);
  assert.equal(everything.includes("UTC plus two"), false, "the answer is not touched");
});

test("[B08] a change that could affect grouping suggests re-review of the decided mapping, and an unknown impact is listed as unknown", async () => {
  const r = await revise();
  const found = Object.fromEntries(re(await r.suggestions()).map((s) => [s.record, s]));
  assert.deepEqual(Object.keys(found).sort(), ["MP-002", "MP-004"]);
  assert.equal(found["MP-002"]!.review, "impact: could-affect");
  assert.equal(found["MP-002"]!.suggested_value, "re-review-suggested");
  assert.equal(found["MP-002"]!.current_value, "accepted", "the decision stays as it is");
  assert.equal(found["MP-004"]!.review, "impact: unknown");
  assert.equal(/no impact/i.test(found["MP-004"]!.reason!), false, "unknown is never described as no impact");
  assert.match(await r.report(), /impact: unknown/);
});

test("[B08] a behavior change with no grouping impact and a version-only change suggest no re-review", async () => {
  const r = await revise();
  const mappings = re(await r.suggestions()).map((s) => s.record);
  assert.equal(mappings.includes("MP-003"), false, "behavior change, impact not expected");
  assert.equal(mappings.includes("MP-005"), false, "version only");
  const updates = await r.updates();
  assert.ok(updates.some((u) => u.record === "UC-003" && u.field === "current_version"), "the version change itself is still reported");
  assert.ok(updates.some((u) => u.record === "UC-005" && u.field === "current_version"));
});

test("[B08] nothing is released or applied: decisions stay, forbidden fields are refused and the export is unchanged", async () => {
  const r = await revise();
  const updates = await r.updates();
  assert.equal(updates.some((u) => u.tab === "Mappings"), false, "no mapping is edited");
  const suggestions = JSON.stringify(await r.suggestions());
  for (const field of ["decision_ref", "decided_by", "decided_on"]) assert.equal(suggestions.includes(field), false, field);
  const report = await r.report();
  assert.match(report, /answer` rejected: forbidden-class field "answer"/);
  assert.match(report, /released_on` rejected: forbidden-class field "released_on"/);
  assert.equal(updates.some((u) => u.field === "released_on" || u.field === "answer" || u.field === "batch_ref"), false);
  assert.equal((await rows(join(r.w.out, "conflicts.csv"))).length, 0);
  assert.deepEqual(await snapshot(r.w.exportDir), r.before);
  assert.match(report, /Nothing here has been applied or released/);
});
