import { test } from "node:test";
import assert from "node:assert/strict";
import { pendingChanges, reviewColumns } from "../src/review_columns.ts";
import { AS_OF, realData } from "./support.ts";

async function review(ref: string, asOf = AS_OF) {
  const data = await realData();
  const row = data.tables.Questions!.rows.find((r) => r.question_ref === ref)!;
  return reviewColumns(row, asOf);
}

test("[B7] due_on is the release date plus two working days across a weekend", async () => {
  assert.equal((await review("QN-0001")).due_on, "2026-11-11");
  assert.equal((await review("QN-0005")).due_on, "2026-11-16");
});

test("[B7] a complete answer awaiting lead review shows its age and is not overdue", async () => {
  assert.deepEqual(await review("QN-0001"), {
    due_on: "2026-11-11",
    review_state: "Awaiting lead review",
    days_past_original_due: "",
    age_awaiting_review: 6,
  });
});

test("[B7] an unanswered released row past its due date is overdue in working days", async () => {
  const r = await review("QN-0002");
  assert.deepEqual([r.review_state, r.days_past_original_due, r.age_awaiting_review], ["Overdue", 3, ""]);
});

test("[B7] a partial answer is overdue and a follow-up", async () => {
  const r = await review("QN-0003");
  assert.deepEqual([r.review_state, r.days_past_original_due], ["Overdue, follow-up", 3]);
});

test("[B7] a complete answer with a clarification requested is overdue against the original due date", async () => {
  const r = await review("QN-0004");
  assert.deepEqual([r.due_on, r.review_state, r.days_past_original_due, r.age_awaiting_review], ["2026-11-12", "Overdue, clarification requested", 2, ""]);
});

test("[B7] an accepted row, a row not yet due and an unreleased row have no overdue days", async () => {
  assert.deepEqual(await review("QN-0005"), { due_on: "2026-11-16", review_state: "Accepted", days_past_original_due: "", age_awaiting_review: "" });
  const open = await review("QN-0006");
  assert.deepEqual([open.review_state, open.days_past_original_due], ["Open", ""]);
  assert.deepEqual(await review("QN-0007"), { due_on: "", review_state: "Not released", days_past_original_due: "", age_awaiting_review: "" });
});

test("[B7] before the due date, partial and clarification rows are follow-ups and not overdue", async () => {
  const base = { question_ref: "QN-9", released_on: "2026-11-12", answered_on: "2026-11-13" };
  const partial = reviewColumns({ ...base, status: "released", answer_status: "partially-answered" }, "2026-11-13");
  assert.deepEqual([partial.review_state, partial.days_past_original_due], ["Follow-up", ""]);
  const cannot = reviewColumns({ ...base, status: "released", answer_status: "cannot-answer" }, "2026-11-16");
  assert.equal(cannot.review_state, "Follow-up");
  const clarification = reviewColumns({ ...base, status: "clarification-requested", answer_status: "answered" }, "2026-11-13");
  assert.equal(clarification.review_state, "Clarification requested");
});

test("[B7] pending changes name only proposals awaiting review for that record", async () => {
  const data = await realData();
  assert.equal(pendingChanges(data.proposals, "Use Cases", "UC-002"), "PC-001");
  assert.equal(pendingChanges(data.proposals, "Use Cases", "UC-001"), "");
  assert.equal(pendingChanges(data.proposals, "Questions", "UC-002"), "");
  const accepted = { ...data.proposals, rows: data.proposals.rows.map((r) => ({ ...r, review_status: "accepted" })) };
  assert.equal(pendingChanges(accepted, "Use Cases", "UC-002"), "");
  const two = { ...data.proposals, rows: [data.proposals.rows[0]!, { ...data.proposals.rows[0]!, change_ref: "PC-009" }] };
  assert.equal(pendingChanges(two, "Use Cases", "UC-002"), "PC-001; PC-009");
});
