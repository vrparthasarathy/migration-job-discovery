import assert from "node:assert/strict";
import { test } from "node:test";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import { baseExport, cli, ok, reviews, rowOf, rowsOf, RUN_DATE, setup, textOf, update, type RVP, DAILY, NIGHTLY, INVOICE, BILLING } from "./support.ts";

const NEW = useCaseId("Acme", "New")!;
const REVIEWS = ["--reviews"];
const run = async (env: Awaited<ReturnType<typeof setup>>, rvs: RVP[]) => {
  await reviews(env, rvs);
  return ok(env, ...REVIEWS, env.reviews);
};

test("[B2] accepted rows of all four tabs reach the master with internal columns, other_changes and proposal IDs", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", record: "UC-001", useCase: DAILY, proposals: "TP-1 | TP-2", fields: { current_version: ["1", "2", "update"], stage: ["sent", "review", "update"] }, other: "source_note:  -> check the archive [update]" },
    { tab: "Questions", record: "QN-0001", useCase: DAILY, fields: { our_owner: ["Ann", "Rae", "update"] } },
    { tab: "Identity & Access", record: "AX-001", useCase: DAILY, fields: { next_action: ["", "Chase the ticket", "update"] } },
    { tab: "Mappings", record: "MP-001", useCase: DAILY, fields: { mapping_status: ["accepted", "re-review-suggested", "suggest"] } },
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
    { tab: "Use Cases", ref: "UC-004", key: BILLING, useCase: BILLING, proposals: "TP-9", fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Billing Export", "add"], current_version: ["", "1", "add"] } },
    { tab: "Questions", ref: "QN-0005", key: `${DAILY}/Q9`, useCase: DAILY, proposals: "TP-9", fields: { question_text: ["", "Which currency is used?", "add"] } },
    { tab: "Identity & Access", ref: "AX-002", key: `${DAILY}/Reports/dev`, useCase: DAILY, fields: { service: ["", "Reports", "add"], environment: ["", "dev", "add"] } },
    { tab: "Mappings", ref: "MP-002", key: `${DAILY}->>builder`, useCase: DAILY, fields: { workflow_candidate: ["", "Report Builder 2", "add"] } },
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
    { tab: "Use Cases", record: "UC-001", useCase: DAILY, status: "", fields: { stage: ["sent", "review", "update"] } },
    { tab: "Use Cases", record: "UC-002", useCase: NIGHTLY, status: "rejected", fields: { stage: ["sent", "review", "update"] } },
    { tab: "Use Cases", record: "UC-003", useCase: INVOICE, status: "clarify", fields: { stage: ["review", "sent", "update"] } },
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
    { tab: "Use Cases", record: "UC-001", useCase: DAILY, changed: "yes", fields: stage("review") },
    { tab: "Use Cases", record: "UC-002", useCase: NIGHTLY, fields: { stage: ["sent", "review", "held"] } },
    { tab: "Use Cases", record: "UC-003", useCase: INVOICE, conflict: "update: base differs", fields: { stage: ["review", "sent", "update"] } },
    { tab: "Questions", record: "QN-0001", useCase: DAILY, digest: "not-the-digest", fields: { our_owner: ["Ann", "Rae", "update"] } },
    { tab: "Questions", record: "QN-0003", useCase: NIGHTLY, fields: { our_owner: ["Somebody Else", "Rae", "update"] } },
    { tab: "Identity & Access", record: "AX-001", useCase: DAILY, fields: { next_action: ["", "Chase", "update"] }, other: "unknowns: a -> b -> c [update]" },
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

test("[B3] a use case ID matching two master rows is a conflict", async () => {
  const data = baseExport();
  data["Use Cases"]!.push({ use_case_ref: "UC-009", use_case_name: "Daily Report", vendor: "Acme", current_version: "1" });
  const env = await setup(data);
  await run(env, [{ tab: "Questions", ref: "QN-0009", key: "x", useCase: DAILY, fields: { question_text: ["", "Which?", "add"] } }]);
  assert.equal((await rowsOf(env.out, "Questions")).length, 4);
  assert.match(await textOf(env.report), new RegExp(`the use case ID ${DAILY} matches 2 master rows`));
});

test("[B3] two vendors' same-named use cases are never confused: the question goes to the row of the ID", async () => {
  const data = baseExport();
  data["Use Cases"]!.push({ use_case_ref: "UC-009", use_case_name: "Daily Report", vendor: "Beta", current_version: "1" });
  const env = await setup(data);
  await run(env, [
    { tab: "Questions", ref: "QN-0009", key: `${useCaseId("Beta", "Daily Report")}/Q9`, useCase: useCaseId("Beta", "Daily Report")!, fields: { question_text: ["", "Which?", "add"] } },
    { tab: "Questions", ref: "QN-0010", key: `${DAILY}/Q10`, useCase: DAILY, fields: { question_text: ["", "Which else?", "add"] } },
  ]);
  const beta = await rowOf(env.out, "Questions", "question_ref", "QN-0009");
  assert.deepEqual([beta.use_case_ref, beta.vendor, beta.use_case_name], ["UC-009", "Beta", "Daily Report"]);
  const acme = await rowOf(env.out, "Questions", "question_ref", "QN-0010");
  assert.deepEqual([acme.use_case_ref, acme.vendor], ["UC-001", "Acme"]);
});

test("[B3] an unknown ID, or a name or slug in the use_case cell, stops the run naming file and line with nothing written", async () => {
  for (const [cell, message] of [[useCaseId("Acme", "Ghost")!, /line 2: use case "uc-acme-ghost" is not a use case in the master/], ["Daily Report", /line 2: use_case "Daily Report" is not a use case ID/], ["daily-report", /line 2: use_case "daily-report" is not a use case ID/], ["", /line 2: the use_case cell is blank/]] as const) {
    const env = await setup();
    await reviews(env, [{ tab: "Questions", ref: "QN-0009", key: "x", useCase: cell, fields: { question_text: ["", "Which?", "add"] } }]);
    const out = await cli("update-master-workbook", "--master", env.master, "--reviews", env.reviews, "--out", env.out, "--report", env.report);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /review-questions\.csv/);
    assert.match(out.stderr, message);
    await assert.rejects(textOf(env.out));
  }
});

test("[B3] a question for a rejected new use case is skipped, and a new use case with a wrong or duplicate ID is a conflict", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", ref: "UC-004", key: "k1", useCase: BILLING, status: "rejected", fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Billing Export", "add"] } },
    { tab: "Questions", ref: "QN-0009", key: "x", useCase: BILLING, fields: { question_text: ["", "Which?", "add"] } },
    { tab: "Use Cases", ref: "UC-005", key: "k2", useCase: useCaseId("Acme", "Other")!, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Different", "add"] } },
    { tab: "Use Cases", ref: "UC-006", key: "k3", useCase: DAILY, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Daily Report", "add"] } },
  ]);
  assert.equal((await rowsOf(env.out, "Use Cases")).length, 3);
  assert.equal((await rowsOf(env.out, "Questions")).length, 4);
  const report = await textOf(env.report);
  assert.match(report, new RegExp(`use case ${BILLING} is not in the master`));
  assert.match(report, /differs from the use_case cell/);
  assert.match(report, /already exists in the master/);
});

test("[B3] a new use case in the same run is found by its ID and a new question takes its name from the proposed field", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Use Cases", ref: "UC-004", key: "k1", useCase: BILLING, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "Billing Export", "add"] } },
    { tab: "Questions", ref: "QN-0009", key: "x", useCase: BILLING, fields: { question_text: ["", "Which?", "add"] } },
  ]);
  const q = await rowOf(env.out, "Questions", "question_ref", "QN-0009");
  assert.deepEqual([q.use_case_ref, q.use_case_name, q.vendor], ["UC-004", "Billing Export", "Acme"]);
});

test("[B3] a new use case without a vendor or name is a conflict", async () => {
  const env = await setup();
  await run(env, [{ tab: "Use Cases", ref: "UC-004", key: "k1", useCase: "", fields: { current_version: ["", "1", "add"] } }]);
  assert.equal((await rowsOf(env.out, "Use Cases")).length, 3);
  assert.match(await textOf(env.report), /no name or no vendor, so it has no use case ID/);
});

test("[B3] forbidden and computed fields are listed and never applied, while the rest of the row is", async () => {
  const env = await setup();
  await run(env, [
    { tab: "Questions", record: "QN-0001", useCase: DAILY, fields: { our_owner: ["Ann", "Rae", "update"] }, other: "answer: UTC plus two per the SLA -> Local [update] | due_on: 2026-11-16 -> 2026-12-01 [update] | batch_ref: BT-001 -> BT-002 [update]" },
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
    [{ tab: "Use Cases", ref: "UC-001", key: "New", useCase: NEW, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "New", "add"] } }, /reference UC-001 already exists/],
    [{ tab: "Use Cases", ref: "", key: "New", useCase: NEW, fields: { vendor: ["", "Acme", "add"], use_case_name: ["", "New", "add"] } }, /suggested_ref "" is not a reference/],
    [{ tab: "Use Cases", record: "UC-001", useCase: DAILY, fields: { stage: ["sent", "bogus", "update"] } }, /stage "bogus" is not one of/],
  ] as [RVP, RegExp][]) {
    const env = await setup();
    await reviews(env, [rv]);
    const outcome = await update(env, ...REVIEWS, env.reviews);
    assert.equal(outcome.status, 1);
    assert.match(outcome.stderr, message);
    await assert.rejects(textOf(env.out));
  }
});
