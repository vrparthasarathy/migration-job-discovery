import assert from "node:assert/strict";
import { test } from "node:test";
import { baseExport, ok, reviews, rowOf, rowsOf, RUN_DATE, setup, textOf, update, type RVP } from "./support.ts";

const REVIEWS = ["--reviews"];
const run = async (env: Awaited<ReturnType<typeof setup>>, rvs: RVP[]) => {
  await reviews(env, rvs);
  return ok(env, ...REVIEWS, env.reviews);
};

test("[B2] accepted rows of all four tabs reach the master with internal columns, other_changes and proposal IDs", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", proposals: "TP-1 | TP-2", fields: { current_version: ["1", "2", "update"], stage: ["sent", "review", "update"] }, other: "source_note:  -> check the archive [update]" },
    { tab: "Questions", record: "QN-0001", useCase: "Daily Report", fields: { our_owner: ["Ann", "Rae", "update"] } },
    { tab: "Identity & Access", record: "AX-001", useCase: "Daily Report", fields: { next_action: ["", "Chase the ticket", "update"] } },
    { tab: "Mappings", record: "MP-001", useCase: "Daily Report", fields: { mapping_status: ["accepted", "re-review-suggested", "suggest"] } },
  ]);
  const uc = await rowOf(env.out, "Use Cases", "use_case_ref", "UC-001");
  assert.deepEqual([uc.current_version, uc.stage, uc.source_note, uc.proposal_refs, uc.last_updated, uc.notes_internal], ["2", "review", "check the archive", "TP-1;TP-2", RUN_DATE, "internal-only-note"]);
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0001")).our_owner, "Rae");
  assert.equal((await rowOf(env.out, "Identity & Access", "access_ref", "AX-001")).next_action, "Chase the ticket");
  assert.equal((await rowOf(env.out, "Mappings", "mapping_ref", "MP-001")).mapping_status, "re-review-suggested");
  const report = await textOf(env.report);
  assert.match(report, /Use Cases, UC-001: updated/);
  assert.match(report, /stage: "sent" -> "review"/);
});

test("[B2] new rows take the suggested reference, their use case, the run date and the proposal IDs, and a new question stays unreleased", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", ref: "UC-004", key: "Billing Export", useCase: "Billing Export", proposals: "TP-9", fields: { vendor: ["", "Acme", "add"], current_version: ["", "1", "add"] } },
    { tab: "Questions", ref: "QN-0005", key: "Daily Report/Q9", useCase: "Daily Report", proposals: "TP-9", fields: { question_text: ["", "Which currency is used?", "add"] } },
    { tab: "Identity & Access", ref: "AX-002", key: "Daily Report/Reports/dev", useCase: "Daily Report", fields: { service: ["", "Reports", "add"], environment: ["", "dev", "add"] } },
    { tab: "Mappings", ref: "MP-002", key: "Daily Report->>Builder", useCase: "Daily Report", fields: { workflow_candidate: ["", "Report Builder 2", "add"] } },
  ]);
  const uc = await rowOf(env.out, "Use Cases", "use_case_ref", "UC-004");
  assert.deepEqual([uc.use_case_name, uc.vendor, uc.current_version, uc.proposal_refs, uc.last_updated], ["Billing Export", "Acme", "1", "TP-9", RUN_DATE]);
  const q = await rowOf(env.out, "Questions", "question_ref", "QN-0005");
  assert.deepEqual([q.use_case_ref, q.use_case_name, q.vendor, q.question_text, q.captured_on, q.status, q.released_on, q.batch_ref, q.proposal_refs], ["UC-001", "Daily Report", "Acme", "Which currency is used?", RUN_DATE, "captured", "", "", "TP-9"]);
  const ax = await rowOf(env.out, "Identity & Access", "access_ref", "AX-002");
  assert.deepEqual([ax.use_case_ref, ax.vendor, ax.service, ax.environment], ["UC-001", "Acme", "Reports", "dev"]);
  const mp = await rowOf(env.out, "Mappings", "mapping_ref", "MP-002");
  assert.deepEqual([mp.use_case_ref, mp.workflow_candidate], ["UC-001", "Report Builder 2"]);
  assert.equal((await rowsOf(env.out, "Questions")).length, 5);
});

test("[B2] a blank, rejected or clarify row never applies", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", status: "", fields: { stage: ["sent", "review", "update"] } },
    { tab: "Use Cases", record: "UC-002", useCase: "Nightly Sync", status: "rejected", fields: { stage: ["sent", "review", "update"] } },
    { tab: "Use Cases", record: "UC-003", useCase: "Invoice Feed", status: "clarify", fields: { stage: ["review", "sent", "update"] } },
  ]);
  const rows = await rowsOf(env.out, "Use Cases");
  assert.deepEqual(rows.map((r) => r.stage), ["sent", "sent", "review"]);
  const report = await textOf(env.report);
  assert.match(report, /1 x not accepted \(blank\)/);
  assert.match(report, /1 x not accepted \(rejected\)/);
  assert.match(report, /1 x not accepted \(clarify\)/);
});

test("[B3] a row that changed, holds, conflicts, mismatches its digest or differs from the master is listed and nothing is applied for it", async () => {
  const env = await setup();
  const stage = (to: string): RVP["fields"] => ({ stage: ["sent", to, "update"] });
  await run(env, [
    { tab: "Use Cases", record: "UC-001", useCase: "Daily Report", changed: "yes", fields: stage("review") },
    { tab: "Use Cases", record: "UC-002", useCase: "Nightly Sync", fields: { stage: ["sent", "review", "held"] } },
    { tab: "Use Cases", record: "UC-003", useCase: "Invoice Feed", conflict: "update: base differs", fields: { stage: ["review", "sent", "update"] } },
    { tab: "Questions", record: "QN-0001", useCase: "Daily Report", digest: "not-the-digest", fields: { our_owner: ["Ann", "Rae", "update"] } },
    { tab: "Questions", record: "QN-0003", useCase: "Nightly Sync", fields: { our_owner: ["Somebody Else", "Rae", "update"] } },
    { tab: "Identity & Access", record: "AX-001", useCase: "Daily Report", fields: { next_action: ["", "Chase", "update"] }, other: "unknowns: a -> b -> c [update]" },
  ]);
  const uc = await rowsOf(env.out, "Use Cases");
  assert.deepEqual(uc.map((r) => r.stage), ["sent", "sent", "review"]);
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0001")).our_owner, "Ann");
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0003")).our_owner, "Bob");
  assert.equal((await rowOf(env.out, "Identity & Access", "access_ref", "AX-001")).next_action, "");
  const report = await textOf(env.report);
  assert.match(report, /UC-001 .*changed since review/);
  assert.match(report, /UC-002 .*stage is held/);
  assert.match(report, /UC-003 .*conflict: update: base differs/);
  assert.match(report, /QN-0001 .*digest does not match/);
  assert.match(report, /QN-0003 .*our_owner: the master holds "Bob", the review row expects "Somebody Else"/);
  assert.match(report, /AX-001 .*exactly one/);
});

test("[B3] an ambiguous use case name is a conflict", async () => {
  const data = baseExport();
  data["Use Cases"]!.push({ use_case_ref: "UC-009", use_case_name: "Daily Report", vendor: "Beta", current_version: "1" });
  const env = await setup(data);
  await run(env, [{ tab: "Questions", ref: "QN-0009", key: "x", useCase: "Daily Report", fields: { question_text: ["", "Which?", "add"] } }]);
  assert.equal((await rowsOf(env.out, "Questions")).length, 4);
  assert.match(await textOf(env.report), /matches 2 master rows/);
});

test("[B3] forbidden and computed fields are listed and never applied, while the rest of the row is", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Questions", record: "QN-0001", useCase: "Daily Report", fields: { our_owner: ["Ann", "Rae", "update"] }, other: "answer: UTC plus two per the SLA -> Local [update] | due_on: 2026-11-16 -> 2026-12-01 [update] | batch_ref: BT-001 -> BT-002 [update]" },
  ]);
  const q = await rowOf(env.out, "Questions", "question_ref", "QN-0001");
  assert.deepEqual([q.our_owner, q.answer, q.due_on, q.batch_ref], ["Rae", "UTC plus two per the SLA", "2026-11-16", "BT-001"]);
  const report = await textOf(env.report);
  assert.match(report, /answer \(forbidden column\)/);
  assert.match(report, /due_on \(computed column\)/);
  assert.match(report, /batch_ref \(forbidden column\)/);
});

test("[B3] a reference collision, a bad reference or a value off the schema list stops the run with nothing written", async () => {
  for (const [rv, message] of [
    [{ tab: "Use Cases", ref: "UC-001", key: "New", useCase: "New", fields: { vendor: ["", "Acme", "add"] } }, /reference UC-001 already exists/],
    [{ tab: "Use Cases", ref: "", key: "New", useCase: "New", fields: { vendor: ["", "Acme", "add"] } }, /suggested_ref "" is not a reference/],
    [{ tab: "Use Cases", record: "UC-001", useCase: "Daily Report", fields: { stage: ["sent", "bogus", "update"] } }, /stage "bogus" is not one of/],
  ] as [RVP, RegExp][]) {
    const env = await setup();
    await reviews(env, [rv]);
    const outcome = await update(env, ...REVIEWS, env.reviews);
    assert.equal(outcome.status, 1);
    assert.match(outcome.stderr, message);
    await assert.rejects(textOf(env.out));
  }
});
