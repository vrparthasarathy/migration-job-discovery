import assert from "node:assert/strict";
import { test } from "node:test";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { baseExport, download, ok, rowOf, rowsOf, RUN_DATE, setup, textOf, vendorRows, type Env } from "./support.ts";

/** The base export with three more Acme questions: open with an answer, resolved with an answer, and open with none. */
function data(): Record<string, Row[]> {
  const d = baseExport();
  const q = (ref: string, status: string, answer: string, answerStatus: string): Row => ({ question_ref: ref, use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", question_text: `Question ${ref}`, batch_ref: "BT-001", released_on: "2026-11-12", due_on: "2026-11-16", answer, answer_status: answerStatus, status, resolver: "Lead Rae", our_owner: "Ann", last_updated: "2026-11-13" });
  d.Questions!.push(q("QN-0010", "released", "Old answer", "answered"), q("QN-0011", "accepted", "Settled answer", "answered"), q("QN-0012", "released", "", "not-answered"));
  return d;
}

/** The vendor's download: the master's Acme rows with the edits given by reference. */
async function acme(env: Env, edits: Record<string, Row>): Promise<string> {
  const rows = vendorRows("Acme", data());
  for (const tab of Object.keys(rows)) rows[tab] = rows[tab]!.map((r) => ({ ...r, ...edits[(r.question_ref ?? r.access_ref ?? r.use_case_ref)!] }));
  return download(env, "acme.xlsx", "Acme", rows);
}

const sync = (env: Env, path: string) => ok(env, "--vendor", `Acme=${path}`, "--vendor-out", env.vendorOut);

test("[B4] vendor-owned columns are copied into the master row of the same reference, and nothing else", async () => {
  const env = await setup(data());
  const path = await acme(env, {
    "QN-0012": { answer: "Vendor typed", answer_status: "answered", answered_on: "2026-11-19", answered_by: "Acme Bob", question_text: "Edited by the vendor", status: "closed", resolver: "Acme" },
    "UC-001": { acknowledged_version: "2", acknowledged_on: "2026-11-19", acknowledgement_reference: "ACK-9", current_version: "99" },
    "AX-001": { vendor_action_owner: "Acme IT", additional_requirements: "Static address", service: "Changed by the vendor" },
  });
  await sync(env, path);
  const q = await rowOf(env.out, "Questions", "question_ref", "QN-0012");
  assert.deepEqual([q.answer, q.answer_status, q.answered_on, q.answered_by, q.last_updated], ["Vendor typed", "answered", "2026-11-19", "Acme Bob", RUN_DATE]);
  assert.deepEqual([q.question_text, q.status, q.resolver], ["Question QN-0012", "released", "Lead Rae"]);
  const uc = await rowOf(env.out, "Use Cases", "use_case_ref", "UC-001");
  assert.deepEqual([uc.acknowledged_version, uc.acknowledged_on, uc.acknowledgement_reference, uc.current_version, uc.notes_internal], ["2", "2026-11-19", "ACK-9", "1", "internal-only-note"]);
  const ax = await rowOf(env.out, "Identity & Access", "access_ref", "AX-001");
  assert.deepEqual([ax.vendor_action_owner, ax.additional_requirements, ax.service], ["Acme IT", "Static address", "Reports"]);
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0003")).answer, "Only on weekdays so far");
  const report = await textOf(env.report);
  assert.match(report, /Acme: Questions, QN-0012, answer: "" -> "Vendor typed" \(copied into a blank cell\)/);
});

test("[B5] a different filled value on an open question is copied and listed; on a resolved question it is a conflict", async () => {
  const env = await setup(data());
  const path = await acme(env, { "QN-0010": { answer: "New answer" }, "QN-0011": { answer: "Changed after acceptance" } });
  await sync(env, path);
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0010")).answer, "New answer");
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0011")).answer, "Settled answer");
  const report = await textOf(env.report);
  assert.match(report, /QN-0010, answer: "Old answer" -> "New answer" \(differs from the master, copied\)/);
  assert.match(report, /QN-0011 .*answer differs from the master on a question already accepted/);
});

test("[B5] a vendor value that would blank a master cell, is off the list or is not a date leaves the whole row alone", async () => {
  const env = await setup(data());
  const path = await acme(env, {
    "QN-0001": { answer: "", answer_status: "partially-answered" },
    "QN-0010": { answer_status: "bogus", answer: "Would be copied" },
    "QN-0012": { answered_on: "tomorrow", answer: "Would be copied too" },
  });
  await sync(env, path);
  const q1 = await rowOf(env.out, "Questions", "question_ref", "QN-0001");
  assert.deepEqual([q1.answer, q1.answer_status], ["UTC plus two per the SLA", "answered"]);
  const q10 = await rowOf(env.out, "Questions", "question_ref", "QN-0010");
  assert.deepEqual([q10.answer, q10.answer_status], ["Old answer", "answered"]);
  const q12 = await rowOf(env.out, "Questions", "question_ref", "QN-0012");
  assert.deepEqual([q12.answer, q12.answered_on], ["", ""]);
  const report = await textOf(env.report);
  assert.match(report, /QN-0001 .*answer would blank a filled master cell/);
  assert.match(report, /QN-0010 .*answer_status "bogus" is not one of/);
  assert.match(report, /QN-0012 .*answered_on "tomorrow" is not a date/);
});

test("[B5] a row of another vendor or an unreleased question is a conflict and is never copied", async () => {
  const env = await setup(data());
  const rows = vendorRows("Acme", data());
  rows.Questions!.push({ ...data().Questions!.find((r) => r.question_ref === "QN-0003")!, vendor: "Acme", answer: "Hijacked" }, { ...data().Questions!.find((r) => r.question_ref === "QN-0002")!, released_on: "2026-11-12", vendor: "Acme", answer: "Early" });
  const path = await download(env, "acme.xlsx", "Acme", rows);
  const outcome = await sync(env, path);
  assert.match(outcome.stdout, /1 vendor workbook\(s\) held/);
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0003")).answer, "Only on weekdays so far");
  assert.equal((await rowOf(env.out, "Questions", "question_ref", "QN-0002")).answer, "");
  const report = await textOf(env.report);
  assert.match(report, /QN-0003 .*belongs to another vendor/);
  assert.match(report, /QN-0002 .*master question is unreleased/);
});

test("[B4] a vendor value is never copied to a different row", async () => {
  const env = await setup(data());
  const path = await acme(env, { "QN-0012": { answer: "Only for QN-0012" } });
  await sync(env, path);
  const answers = (await rowsOf(env.out, "Questions")).map((r) => r.answer);
  assert.deepEqual(answers, ["UTC plus two per the SLA", "", "Only on weekdays so far", "", "Old answer", "Settled answer", "Only for QN-0012"]);
});
