import { test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { loadSampleData } from "../src/sample_data.ts";
import { SCHEMA, dataCopy, findingsFor, realData } from "./support.ts";

type Rows = Record<string, string>[];
const by = (rows: Rows, column: string, value: string): Record<string, string> => {
  const found = rows.find((r) => r[column] === value);
  assert.ok(found, `${column} ${value} exists`);
  return found;
};

test("[B3] five fictional use cases across two vendors cover the source and access scenarios", async () => {
  const { tables } = await realData();
  const useCases = tables["Use Cases"]!.rows;
  assert.equal(useCases.length, 5);
  assert.deepEqual([...new Set(useCases.map((u) => u.vendor))].sort(), ["Harborline Analytics", "Meridian Freight Systems"]);
  const status = (ref: string) => by(useCases, "use_case_ref", ref).source_status;
  assert.deepEqual(["UC-001", "UC-002", "UC-003", "UC-004", "UC-005"].map(status), ["located", "empty", "not-located", "uncertain-mapping", "located"]);

  const notLocated = by(useCases, "use_case_ref", "UC-003");
  assert.match(notLocated.supporting_documents!, /preliminary-work/);
  assert.match(notLocated.blocked_reason!, /does not clear the blocker/);
  assert.notEqual(notLocated.source_status, "confirmed-unavailable");

  const access = tables["Identity & Access"]!.rows;
  assert.equal(by(access, "access_ref", "AX-001").auth_type, "website-sign-in");
  assert.equal(by(access, "access_ref", "AX-002").auth_type, "api-credential");
  assert.equal(by(access, "access_ref", "AX-004").auth_type, "api-credential");

  const shared = access.filter((a) => a.endpoint === "/v2/rates" && a.environment === "production");
  assert.deepEqual(shared.map((a) => a.use_case_ref).sort(), ["UC-004", "UC-005"], "one row per use case for the shared endpoint");
  for (const row of shared) {
    assert.match(row.permissions_to_confirm!, /none are assumed/);
    assert.equal(row.proposed_access, "", "no permission is assumed");
  }
  assert.equal(by(access, "access_ref", "AX-003").shared_with, "AX-002");
  const [sandbox, production] = [by(access, "access_ref", "AX-004"), by(access, "access_ref", "AX-002")];
  assert.equal(sandbox.use_case_ref, production.use_case_ref);
  assert.notEqual(sandbox.environment, production.environment);
});

test("[B4] question, acknowledgement, mapping and proposal rows show the review scenarios", async () => {
  const data = await realData();
  const q = data.tables.Questions!.rows;
  const state = (ref: string) => {
    const r = by(q, "question_ref", ref);
    return `${r.status}/${r.answer_status}`;
  };
  assert.equal(state("QN-0001"), "released/answered");
  assert.equal(state("QN-0002"), "released/not-answered");
  assert.equal(state("QN-0003"), "released/partially-answered");
  assert.equal(state("QN-0004"), "clarification-requested/answered");
  assert.equal(by(q, "question_ref", "QN-0007").released_on, "");
  const same = ["QN-0005", "QN-0006"].map((ref) => by(q, "question_ref", ref));
  assert.equal(same[0]!.question_text, same[1]!.question_text);
  assert.notEqual(same[0]!.use_case_ref, same[1]!.use_case_ref);
  assert.notEqual(same[0]!.answer_status, same[1]!.answer_status);

  const uc1 = by(data.tables["Use Cases"]!.rows, "use_case_ref", "UC-001");
  assert.equal(uc1.current_version, "v2");
  assert.equal(uc1.acknowledged_version, "v1");

  const mappings = data.tables.Mappings!.rows;
  assert.equal(by(mappings, "mapping_ref", "MP-001").mapping_status, "candidate");
  assert.equal(by(mappings, "mapping_ref", "MP-002").mapping_status, "pending-clarification");
  for (const m of mappings) assert.deepEqual([m.decision_ref, m.decided_by, m.decided_on], ["", "", ""]);

  assert.deepEqual(data.proposals.rows.map((p) => [p.change_ref, p.review_status]), [["PC-001", "pending-review"], ["PC-002", "pending-review"]]);
  assert.deepEqual([...new Set(data.headings.map((h) => h.tab))], ["Use Cases", "Questions", "Identity & Access", "Mappings", "Proposed Changes", "Trace"]);
});

test("[B5] the real sample data validates with no findings", async () => {
  assert.deepEqual(await findingsFor("trace.csv", () => {}), []);
});

const dangling: [string, string, string, string][] = [
  ["questions.csv", "use_case_ref", "UC-999", "UC-999"],
  ["identity-access.csv", "use_case_ref", "UC-998", "UC-998"],
  ["mappings.csv", "use_case_ref", "UC-997", "UC-997"],
  ["identity-access.csv", "shared_with", "AX-002;AX-999", "AX-999"],
  ["identity-access.csv", "consolidated_request_ref", "AX-996", "AX-996"],
  ["mappings.csv", "blocking_question_refs", "QN-9999", "QN-9999"],
  ["questions.csv", "superseded_by", "QN-9998", "QN-9998"],
  ["proposed-changes.csv", "record_ref", "UC-777", "UC-777"],
  ["trace.csv", "record_ref", "UC-888", "UC-888"],
];
for (const [file, column, value, named] of dangling) {
  test(`[B5] a dangling reference in ${file} ${column} is reported by name`, async () => {
    const findings = await findingsFor(file, (rows) => (rows[0]![column] = value));
    assert.ok(findings.some((f) => f.includes(file) && f.includes(column) && f.includes(named)), findings.join("\n"));
  });
}

test("[B5] a value outside the schema's list or a bad reference or date is reported by file, row and field", async () => {
  const findings = await findingsFor("use-cases.csv", (rows) => {
    rows[1]!.stage = "bogus-stage";
    rows[2]!.acknowledged_on = "not-a-date";
  });
  assert.ok(findings.some((f) => /use-cases\.csv: row 3: stage/.test(f) && f.includes("bogus-stage")), findings.join("\n"));
  assert.ok(findings.some((f) => /use-cases\.csv: row 4: acknowledged_on/.test(f)));
});

const secrets = [
  "password=hunter2hunter2",
  "token: abcd1234efgh5678",
  "Bearer abcdefghijklmnopqrstuvwx",
  "ghp_abcdefghijklmnopqrstuvwxyz",
  "-----BEGIN PRIVATE KEY-----",
  "QWxhZGRpbjpvcGVuIHNlc2FtZVF1aWNrQnJvd25Gb3g=",
];
for (const secret of secrets) {
  test(`[B5] a secret-like value (${secret.slice(0, 12)}) in any cell is reported`, async () => {
    const findings = await findingsFor("identity-access.csv", (rows) => (rows[0]!.identity_reference = secret));
    assert.ok(findings.some((f) => f.includes("identity-access.csv") && f.includes("identity_reference") && /secret/i.test(f)), findings.join("\n"));
  });
}

test("[B5] variable names are allowed in identity columns and long references are not mistaken for secrets", async () => {
  const findings = await findingsFor("identity-access.csv", (rows) => {
    rows[0]!.identity_reference = "Variable HARBORLINE_PORTAL_PASSWORD (name only)";
    rows[0]!.evidence_refs = "specs/harborline-analytics/daily-invoice-status-report.md@v2#access";
  });
  assert.deepEqual(findings, []);
});

test("[B5] a decision field that is filled, a duplicate key and a mismatched due date are reported", async () => {
  const decided = await findingsFor("mappings.csv", (rows) => (rows[0]!.decided_by = "Lead"));
  assert.ok(decided.some((f) => f.includes("decided_by") && /blank/.test(f)));
  const duplicate = await findingsFor("use-cases.csv", (rows) => (rows[1]!.use_case_ref = "UC-001"));
  assert.ok(duplicate.some((f) => f.includes("use_case_ref") && f.includes("UC-001") && /duplicate/.test(f)));
  const due = await findingsFor("questions.csv", (rows) => (rows[0]!.due_on = "2026-11-30"));
  assert.ok(due.some((f) => f.includes("due_on") && f.includes("2026-11-11")));
  assert.deepEqual(await findingsFor("questions.csv", (rows) => (rows[0]!.due_on = "2026-11-11")), []);
});

test("[B5] proposals must name the current accepted value and use known lists", async () => {
  const stale = await findingsFor("proposed-changes.csv", (rows) => (rows[0]!.current_value = "v9"));
  assert.ok(stale.some((f) => f.includes("current_value") && f.includes("v9")));
  const unknownField = await findingsFor("proposed-changes.csv", (rows) => (rows[0]!.field = "no_such_field"));
  assert.ok(unknownField.some((f) => f.includes("no_such_field")));
  const status = await findingsFor("proposed-changes.csv", (rows) => ((rows[0]!.review_status = "maybe"), (rows[1]!.operation = "swap")));
  assert.ok(status.some((f) => f.includes("review_status") && f.includes("maybe")));
  assert.ok(status.some((f) => f.includes("operation") && f.includes("swap")));
  const proposalTab = await findingsFor("proposed-changes.csv", (rows) => (rows[0]!.tab = "Nowhere"));
  assert.ok(proposalTab.some((f) => f.includes("proposed-changes.csv") && f.includes("Nowhere")));
  const kind = await findingsFor("trace.csv", (rows) => (rows[0]!.kind = "rumour"));
  assert.ok(kind.some((f) => f.includes("kind") && f.includes("rumour")));
  const tab = await findingsFor("trace.csv", (rows) => (rows[0]!.tab = "Nowhere"));
  assert.ok(tab.some((f) => f.includes("Nowhere")));
});

test("[B5] headings must agree with the schema's visibility and cover every column", async () => {
  const flipped = await findingsFor("headings.csv", (rows) => {
    const row = rows.find((r) => r.tab === "Questions" && r.column === "answer")!;
    row.visibility = "I";
  });
  assert.ok(flipped.some((f) => f.includes("headings.csv") && f.includes("answer") && /visibility/.test(f)));
  const missing = await findingsFor("headings.csv", (rows) => rows.splice(rows.findIndex((r) => r.column === "stage"), 1));
  assert.ok(missing.some((f) => f.includes("stage") && /no heading/.test(f)));
  const unknown = await findingsFor("headings.csv", (rows) => (rows[0]!.column = "made_up"));
  assert.ok(unknown.some((f) => f.includes("made_up")));
  const duplicate = await findingsFor("headings.csv", (rows) => (rows[1]!.heading = rows[0]!.heading));
  assert.ok(duplicate.some((f) => /duplicate heading/.test(f)));
});

test("[B5] a missing data file is an error from the loader", async () => {
  const dir = await dataCopy();
  await rm(join(dir, "mappings.csv"));
  await assert.rejects(loadSampleData(dir, SCHEMA), /mappings\.csv/);
});
