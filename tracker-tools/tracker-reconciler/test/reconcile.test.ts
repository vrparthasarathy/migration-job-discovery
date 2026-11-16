import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { baseExport } from "./fixtures.ts";
import { fixture, MANIFEST, reconcile, rows, snapshot, text, writeExport, writeProposal, type Fixture, type PRow } from "./support.ts";

async function setup(proposals: PRow[], data = baseExport(), id = "mr-12", manifest = MANIFEST): Promise<Fixture> {
  const f = await fixture();
  await writeExport(f.exportDir, data, manifest);
  await writeProposal(f.proposals, id, proposals);
  return f;
}

async function run(f: Fixture) {
  const outcome = await reconcile(f);
  assert.equal(outcome.status, 0, outcome.stderr);
  return {
    additions: (name: string) => rows(join(f.out, "additions", name)),
    updates: () => rows(join(f.out, "field-updates.csv")),
    conflicts: () => rows(join(f.out, "conflicts.csv")),
    suggestions: () => rows(join(f.out, "suggestions.csv")),
    report: () => text(join(f.out, "reconciliation-report.md")),
  };
}

const question = (key: string, extra: PRow[] = []): PRow[] => [
  { tab: "Questions", op: "add", key, field: "use_case_name", value: key.split("/")[0]!, source: "daily/daily.md@v2#q3" },
  { tab: "Questions", op: "add", key, field: "spec_refs", value: `${key}@v2`, source: "daily/daily.md@v2#q3" },
  ...extra,
];

const by = (list: Row[], field: string, value: string) => list.filter((r) => r[field] === value);

test("[B01] an absent question is an addition with traceability, a suggested reference and its human fields as suggestions", async () => {
  const data = baseExport();
  data["Question Links"]!.push({ link_ref: "QL-0002", question_ref: "QN-0009" });
  const f = await setup(
    [
      { tab: "Use Cases", op: "set", key: "Daily Report", field: "mr_link", value: "https://git.example/mr/12", base: "" },
      ...question("Daily Report/Q3", [
        { tab: "Questions", op: "add", key: "Daily Report/Q3", field: "question_text", value: "What is the delivery format of the report?", source: "daily/daily.md@v2#q3" },
        { tab: "Questions", op: "add", key: "Daily Report/Q3", field: "status", value: "captured", source: "daily/daily.md@v2#q3" },
      ]),
    ],
    data,
  );
  const result = await run(f);
  const added = await result.additions("questions.csv");
  assert.equal(added.length, 1);
  const row = added[0]!;
  assert.equal(row.suggested_ref, "QN-0010", "next after every reference in the export, including QN-0009 held only in a link");
  assert.equal(row.ref_status, "suggested");
  assert.equal(row.local_key, "Daily Report/Q3");
  assert.equal(row.use_case_name, "Daily Report");
  assert.equal(row.suggested_question_text, "What is the delivery format of the report?");
  assert.equal(row.suggested_status, "captured");
  for (const column of ["question_text", "status", "answer", "answer_status", "question_ref", "released_on"]) {
    assert.equal(column in row, false, `${column} must not be a plain column of an addition`);
  }
  assert.equal(row.trace_source, "daily/daily.md@v2#q3");
  assert.equal(row.trace_spec_version, "v2");
  assert.equal(row.trace_mr_link, "https://git.example/mr/12");
  assert.deepEqual(row.suggested_proposal_refs!.split(";").sort(), ["mr-12:Questions:Daily Report/Q3:question_text", "mr-12:Questions:Daily Report/Q3:spec_refs", "mr-12:Questions:Daily Report/Q3:status", "mr-12:Questions:Daily Report/Q3:use_case_name"]);
});

test("[B01] a new use case is an addition with its own suggested reference and no reuse of an export reference", async () => {
  const f = await setup([
    { tab: "Use Cases", op: "add", key: "Fresh Case", field: "use_case_name", value: "Fresh Case", source: "fresh/fresh.md@v1#use-case" },
    { tab: "Use Cases", op: "add", key: "Fresh Case", field: "current_version", value: "1", source: "fresh/fresh.md@v1#change-log" },
    { tab: "Use Cases", op: "add", key: "Fresh Case", field: "our_owner", value: "Lena", source: "fresh/fresh.md@v1#use-case" },
    { tab: "Use Cases", op: "add", key: "Other Case", field: "use_case_name", value: "Other Case", source: "other/other.md#use-case" },
  ]);
  const result = await run(f);
  const added = await result.additions("use-cases.csv");
  assert.deepEqual(added.map((r) => [r.suggested_ref, r.local_key, r.suggested_our_owner ?? ""]), [["UC-004", "Fresh Case", "Lena"], ["UC-005", "Other Case", ""]]);
  assert.equal(added[0]!.trace_spec_version, "v1");
  assert.equal(added[1]!.trace_spec_version, "", "no version is invented when the source names none");
  assert.equal(added[0]!.current_version, "1");
});

test("[B02] a differing spec field is a field update with both values and never touches the export", async () => {
  const f = await setup([{ tab: "Use Cases", op: "set", key: "Daily Report", field: "current_version", value: "2", base: "1" }]);
  const before = await snapshot(f.exportDir);
  const result = await run(f);
  const updates = await result.updates();
  assert.equal(updates.length, 1);
  assert.deepEqual(
    [updates[0]!.tab, updates[0]!.record, updates[0]!.field, updates[0]!.current_value, updates[0]!.proposed_value, updates[0]!.update_id],
    ["Use Cases", "UC-001", "current_version", "1", "2", "mr-12:Use Cases:Daily Report:current_version"],
  );
  assert.deepEqual(await snapshot(f.exportDir), before);
});

test("[B02] a human-owned field is suggested only and is never overwritten", async () => {
  const f = await setup([
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "our_owner", value: "Zed" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "source_owner", value: "Quinn", base: "Sam" },
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "next_action", value: "Ask Acme for the sample file" },
  ]);
  const result = await run(f);
  assert.deepEqual(await result.updates(), []);
  const suggestions = by(await result.suggestions(), "kind", "human-field");
  assert.deepEqual(
    suggestions.map((s) => [s.record, s.field, s.current_value, s.suggested_value, s.review]),
    [
      ["UC-001", "our_owner", "Ann", "Zed", "current-value-kept"],
      ["UC-001", "source_owner", "Sam", "Quinn", "current-value-kept"],
      ["UC-001", "next_action", "", "Ask Acme for the sample file", "copy-if-agreed"],
    ],
  );
});

test("[B02] a blank suggestion is ignored, a record missing from the export cannot be set and a value outside its list is rejected", async () => {
  const f = await setup([
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "next_action_owner", value: "" },
    { tab: "Questions", op: "set", key: "Daily Report/Q9", field: "spec_refs", value: "Daily Report/Q9@v2", base: "" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "last_change_class", value: "sideways", base: "" },
  ]);
  const result = await run(f);
  assert.deepEqual(await result.updates(), []);
  assert.deepEqual(await result.suggestions(), []);
  const report = await result.report();
  assert.match(report, /Daily Report\/Q9:spec_refs` rejected: record "Daily Report\/Q9" is not in the export; only add creates a record/);
  assert.match(report, /last_change_class` rejected: invalid value: "sideways" is not one of behavior-change, non-behavior-change/);
});

test("[B02] a reworded question is a current_spec_text update with a text-review suggestion and the released text and answer stay untouched", async () => {
  const f = await setup([
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "current_spec_text", value: "Which time zone does the daily report use for its timestamps?", base: "Which time zone does the daily report use?" },
    { tab: "Questions", op: "suggest", key: "Daily Report/Q1", field: "text_review", value: "possible-meaning-change", reason: "timestamps are new" },
    { tab: "Questions", op: "suggest", key: "Daily Report/Q1", field: "question_text", value: "Reworded released text" },
  ]);
  const result = await run(f);
  const updates = await result.updates();
  assert.deepEqual(updates.map((u) => [u.record, u.field, u.current_value]), [["QN-0001", "current_spec_text", "Which time zone does the daily report use?"]]);
  const review = by(await result.suggestions(), "kind", "text-review");
  assert.equal(review.length, 1);
  assert.equal(review[0]!.record, "QN-0001");
  assert.equal(review[0]!.field, "current_spec_text");
  assert.equal(review[0]!.current_value, "Which time zone does the daily report use?");
  assert.equal(review[0]!.suggested_value, "Which time zone does the daily report use for its timestamps?");
  assert.equal(review[0]!.review, "lead-review");
  assert.match(review[0]!.reason!, /possible-meaning-change/);
  const everything = JSON.stringify([updates, await result.suggestions()]);
  assert.equal(everything.includes("Reworded released text"), false, "released question text is never proposed for change");
  assert.equal(everything.includes("UTC plus two"), false, "an answer is never touched");
  assert.match(await result.report(), /released question text/);
});

test("[B04] a base mismatch is a conflict with both values; the record and the rows that refer to it are held and unrelated changes are still reported", async () => {
  const f = await setup([
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "current_version", value: "2", base: "0" },
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "our_owner", value: "Zed" },
    ...question("Daily Report/Q3", [{ tab: "Questions", op: "add", key: "Daily Report/Q3", field: "question_text", value: "Held question text about delivery?" }]),
    { tab: "Use Cases", op: "set", key: "Nightly Sync", field: "current_version", value: "2", base: "1" },
    ...question("Nightly Sync/Q2"),
  ]);
  const result = await run(f);
  const conflicts = await result.conflicts();
  const base = by(conflicts, "kind", "base-mismatch");
  assert.equal(base.length, 1);
  assert.deepEqual([base[0]!.record, base[0]!.field, base[0]!.current_value, base[0]!.proposed_value, base[0]!.base_value], ["UC-001", "current_version", "1", "2", "0"]);
  const held = by(conflicts, "kind", "held");
  const heldIds = held.map((h) => h.update_id).sort();
  assert.ok(heldIds.includes("mr-12:Use Cases:Daily Report:our_owner"), "another change to the affected record is held");
  assert.ok(heldIds.includes("mr-12:Questions:Daily Report/Q3:question_text"), "a row that refers to the record is held");
  assert.ok(held.every((h) => h.detail === `held by base-mismatch:mr-12:Use Cases:Daily Report:current_version`));
  const added = await result.additions("questions.csv");
  assert.deepEqual(added.map((r) => r.local_key), ["Nightly Sync/Q2"], "the unrelated question is still an addition");
  assert.deepEqual((await result.updates()).map((u) => u.record), ["UC-002"], "the unrelated field update is still reported");
  assert.equal(by(await result.suggestions(), "update_id", "mr-12:Use Cases:Daily Report:our_owner").length, 0);
});

test("[B04] a row edited after the proposal was created is a later-edit conflict and is never overwritten", async () => {
  const f = await setup([{ tab: "Questions", op: "set", key: "Daily Report/Q1", field: "spec_refs", value: "Daily Report/Q1@v2", base: "Daily Report/Q1@v1", created: "2026-11-12" }]);
  const result = await run(f);
  const conflicts = await result.conflicts();
  assert.equal(conflicts.length, 1);
  assert.deepEqual([conflicts[0]!.kind, conflicts[0]!.record, conflicts[0]!.current_value, conflicts[0]!.proposed_value], ["later-edit", "QN-0001", "Daily Report/Q1@v1", "Daily Report/Q1@v2"]);
  assert.match(conflicts[0]!.detail!, /2026-11-13.*2026-11-12/);
  assert.deepEqual(await result.updates(), []);
});

test("[B04] an export older than the proposal is a stale-export conflict; a new record that touches nothing in the export is still an addition", async () => {
  const f = await setup(
    [
      { tab: "Use Cases", op: "set", key: "Nightly Sync", field: "current_version", value: "2", base: "1", created: "2026-11-18" },
      { tab: "Use Cases", op: "add", key: "Fresh Case", field: "use_case_name", value: "Fresh Case", created: "2026-11-18" },
    ],
    baseExport(),
    "mr-13",
    [{ scope: "internal", workbook: "master.xlsx", exported_at: "2026-11-10T08:00:00Z", exported_by: "lead-a" }],
  );
  const result = await run(f);
  const conflicts = await result.conflicts();
  assert.deepEqual(by(conflicts, "kind", "stale-export").map((c) => [c.record, c.current_value, c.proposed_value]), [["UC-002", "2026-11-10", "2026-11-18"]]);
  assert.deepEqual(await result.updates(), []);
  assert.deepEqual((await result.additions("use-cases.csv")).map((r) => r.local_key), ["Fresh Case"]);
});

test("[B04] two proposals that disagree about the same field are a conflict that holds the record", async () => {
  const f = await setup([{ tab: "Use Cases", op: "set", key: "Daily Report", field: "current_version", value: "2", base: "1" }]);
  await writeProposal(f.proposals, "mr-14", [
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "current_version", value: "3", base: "1" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "spec_revision", value: "abc123", base: "" },
  ]);
  const result = await run(f);
  const conflicts = await result.conflicts();
  assert.deepEqual(by(conflicts, "kind", "proposal-disagreement").map((c) => c.update_id).sort(), ["mr-12:Use Cases:Daily Report:current_version", "mr-14:Use Cases:Daily Report:current_version"]);
  assert.deepEqual(by(conflicts, "kind", "held").map((c) => c.update_id), ["mr-14:Use Cases:Daily Report:spec_revision"]);
  assert.deepEqual(await result.updates(), []);
});

test("[B04] two proposals that add the same new record with different values conflict under its local key", async () => {
  const f = await setup([{ tab: "Use Cases", op: "add", key: "Fresh Case", field: "current_version", value: "1" }]);
  await writeProposal(f.proposals, "mr-14", [{ tab: "Use Cases", op: "add", key: "Fresh Case", field: "current_version", value: "2" }]);
  const result = await run(f);
  assert.deepEqual((await result.conflicts()).map((c) => [c.kind, c.record, c.current_value, c.proposed_value]), [["proposal-disagreement", "Fresh Case", "2", "1"], ["proposal-disagreement", "Fresh Case", "1", "2"]]);
  assert.deepEqual(await result.additions("use-cases.csv"), []);
});

test("[B04] a conflict on a question holds the mapping that names it as blocking", async () => {
  const data = baseExport();
  data.Mappings!.push({ mapping_ref: "MP-002", use_case_ref: "UC-002", workflow_candidate: "Sync Hub", mapping_status: "candidate", blocking_question_refs: "QN-0001", last_updated: "2026-11-10" });
  const f = await setup(
    [
      { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "spec_refs", value: "Daily Report/Q1@v2", base: "stale", created: "2026-11-18" },
      { tab: "Mappings", op: "set", key: "Nightly Sync->>sync-hub", field: "parameter_differences", value: "Schedules differ", base: "" },
      { tab: "Mappings", op: "set", key: "Nightly Sync->>sync-hub", field: "blocking_question_refs", value: "QN-0001;Daily Report/Q1", base: "QN-0001" },
    ],
    data,
  );
  const result = await run(f);
  const held = by(await result.conflicts(), "kind", "held");
  assert.deepEqual(held.map((h) => h.update_id).sort(), ["mr-12:Mappings:Nightly Sync->>sync-hub:blocking_question_refs", "mr-12:Mappings:Nightly Sync->>sync-hub:parameter_differences"]);
  assert.deepEqual(await result.updates(), []);
});

test("[B04] a new mapping that names a conflicted question is held whole, not added without it", async () => {
  const f = await setup([
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "spec_refs", value: "Daily Report/Q1@v2", base: "stale" },
    { tab: "Mappings", op: "add", key: "Daily Report->>fresh-hub", field: "workflow_candidate", value: "Fresh Hub" },
    { tab: "Mappings", op: "add", key: "Daily Report->>fresh-hub", field: "blocking_question_refs", value: "Daily Report/Q1" },
  ]);
  const result = await run(f);
  assert.deepEqual(await result.additions("mappings.csv"), []);
  assert.deepEqual(by(await result.conflicts(), "kind", "held").map((h) => h.update_id).sort(), ["mr-12:Mappings:Daily Report->>fresh-hub:blocking_question_refs", "mr-12:Mappings:Daily Report->>fresh-hub:workflow_candidate"]);
});

test("[B05] a similar new question is a link suggestion for review, nothing is linked and no answer is inherited", async () => {
  const f = await setup([
    ...question("Daily Report/Q3", [{ tab: "Questions", op: "add", key: "Daily Report/Q3", field: "question_text", value: "Which time zone is used by the daily report?" }]),
    ...question("Nightly Sync/Q2", [{ tab: "Questions", op: "add", key: "Nightly Sync/Q2", field: "question_text", value: "How are retries scheduled for the nightly sync?" }]),
    ...question("Invoice Feed/Q2", [{ tab: "Questions", op: "add", key: "Invoice Feed/Q2", field: "question_text", value: "What colour is the logo on the invoice?" }]),
    ...question("Invoice Feed/Q3", [{ tab: "Questions", op: "add", key: "Invoice Feed/Q3", field: "question_text", value: "What is the main brand colour of the logo on the invoice?" }]),
    ...question("Daily Report/Q4", [{ tab: "Questions", op: "add", key: "Daily Report/Q4", field: "question_text", value: "Which time zone is used by the daily report job?" }]),
  ]);
  const result = await run(f);
  const links = by(await result.suggestions(), "kind", "link");
  const summary = links.map((l) => [l.record, l.related_record, l.score, l.review]);
  assert.deepEqual(summary, [
    ["QN-0005", "QN-0001", "0.71", "uncertain-review"],
    ["QN-0006", "QN-0003", "1", "likely"],
    ["QN-0008", "QN-0007", "0.67", "uncertain-review"],
    ["QN-0009", "QN-0005", "0.86", "likely"],
    ["QN-0009", "QN-0001", "0.63", "uncertain-review"],
  ]);
  assert.ok(links.every((l) => l.field === "question_text"));
  const added = await result.additions("questions.csv");
  assert.equal(added.length, 5);
  for (const row of added) {
    for (const column of Object.keys(row)) assert.equal(/answer/.test(column), false, `no ${column} column`);
  }
  const written = JSON.stringify([added, links]);
  assert.equal(written.includes("UTC plus two"), false);
  assert.equal(written.includes("Only on weekdays"), false);
  const files = Object.keys(await snapshot(f.out));
  assert.equal(files.some((name) => /link|group|mapping/.test(name)), false, "no link, group or mapping file is written");
});

test("[B06] forbidden fields and non-suggestible request statuses are rejected with a reason and release status comes only from the tracker", async () => {
  const forbidden: PRow[] = [
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "released_on", value: "2026-11-30", base: "2026-11-12" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "batch_ref", value: "BT-009", base: "BT-001" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "answer", value: "Proposed answer", base: "x" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "answer_status", value: "answered", base: "x" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "acknowledged_on", value: "2026-11-19", base: "2026-11-05" },
    { tab: "Mappings", op: "set", key: "Daily Report->>report-builder", field: "decision_ref", value: "WD-009", base: "WD-001" },
    { tab: "Identity & Access", op: "add", key: "Daily Report/reports/prod", field: "ticket_ref", value: "TCK-99" },
    { tab: "Identity & Access", op: "add", key: "Daily Report/reports/prod", field: "verification", value: "verified" },
    { tab: "Identity & Access", op: "add", key: "Daily Report/reports/prod", field: "request_status", value: "raised" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "last_updated", value: "2026-11-30", base: "2026-11-13" },
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "proposal_refs", value: "x:y:z:w" },
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "use_case_ref", value: "UC-777" },
    { tab: "Batches", op: "add", key: "BT-new", field: "vendor", value: "Acme" },
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "spec_link", value: "https://elsewhere.example" },
  ];
  const f = await setup([
    ...forbidden,
    { tab: "Identity & Access", op: "add", key: "Daily Report/reports/prod", field: "service", value: "Reports" },
    { tab: "Identity & Access", op: "add", key: "Daily Report/reports/prod", field: "request_status", value: "proposed", id: "mr-13" },
  ]);
  const result = await run(f);
  const report = await result.report();
  for (const row of forbidden) {
    const id = `mr-12:${row.tab}:${row.key}:${row.field}`;
    const line = report.split("\n").find((l) => l.includes(id) && /rejected|forbidden|computed|central|not proposed|suggest/i.test(l));
    assert.ok(line, `${id} is listed with a reason`);
  }
  assert.match(report, /ticket_ref.*forbidden|forbidden.*ticket_ref/);
  assert.deepEqual(await result.updates(), []);
  assert.deepEqual(await result.conflicts(), []);
  const added = await result.additions("identity-access.csv");
  assert.equal(added.length, 1);
  assert.equal(added[0]!.service, "Reports");
  assert.equal(added[0]!.suggested_request_status, "proposed");
  for (const column of ["ticket_ref", "verification", "suggested_ticket_ref"]) assert.equal(column in added[0]!, false);
  assert.deepEqual(await result.additions("batches.csv"), []);
});

test("[B06] a suggested ready-to-raise request status is accepted and any other status is rejected", async () => {
  const f = await setup([
    { tab: "Identity & Access", op: "suggest", key: "Daily Report/reports/prod", field: "request_status", value: "approved" },
    { tab: "Identity & Access", op: "add", key: "Daily Report/billing/prod", field: "request_status", value: "ready-to-raise" },
  ]);
  const result = await run(f);
  const added = await result.additions("identity-access.csv");
  assert.deepEqual(added.map((r) => [r.local_key, r.suggested_request_status]), [["Daily Report/billing/prod", "ready-to-raise"]]);
  assert.match(await result.report(), /mr-12:Identity & Access:Daily Report\/reports\/prod:request_status.*(request_status|suggested)/);
});

function impactFixture() {
  const data = baseExport();
  data["Use Cases"] = [];
  data.Mappings = [];
  data.Questions = [];
  const cases: Record<string, { impact: string; lead?: string; change: string; considered?: string }> = {
    "Could Case": { impact: "could-affect", change: "behavior-change" },
    "None Case": { impact: "not-expected", change: "behavior-change" },
    "Unknown Case": { impact: "unknown", change: "behavior-change" },
    "Lead Quiet": { impact: "could-affect", lead: "no-impact", change: "behavior-change" },
    "Lead Loud": { impact: "not-expected", lead: "could-affect", change: "non-behavior-change" },
    "Version Only": { impact: "not-expected", change: "non-behavior-change" },
    "No Statement": { impact: "", change: "" },
    "Already There": { impact: "could-affect", change: "behavior-change", considered: "1;2" },
    "Empty Versions": { impact: "could-affect", change: "behavior-change", considered: "" },
  };
  const proposals: PRow[] = [];
  Object.entries(cases).forEach(([name, c], index) => {
    data["Use Cases"]!.push({ use_case_ref: `UC-${100 + index}`, use_case_name: name, vendor: "Acme", current_version: "1", grouping_impact_lead: c.lead ?? "", last_updated: "2026-11-10" });
    data.Mappings!.push({ mapping_ref: `MP-${100 + index}`, use_case_ref: `UC-${100 + index}`, workflow_candidate: "Candidate", mapping_status: "accepted", decision_ref: `WD-${100 + index}`, decided_by: "Lead Rae", decided_on: "2026-11-08", spec_versions_considered: c.considered ?? "1", last_updated: "2026-11-08" });
    proposals.push({ tab: "Use Cases", op: "set", key: name, field: "current_version", value: "2", base: "1" });
    if (c.change) proposals.push({ tab: "Use Cases", op: "set", key: name, field: "last_change_class", value: c.change, base: "" });
    if (c.impact) proposals.push({ tab: "Use Cases", op: "set", key: name, field: "grouping_impact", value: c.impact, base: "", reason: `${c.impact}: reason text` });
  });
  data.Mappings!.push({ mapping_ref: "MP-900", use_case_ref: "UC-100", workflow_candidate: "Undecided", mapping_status: "candidate", spec_versions_considered: "1" });
  return { data, proposals };
}

test("[B07] re-review is suggested for could-affect and unknown, never for not-expected, a version-only change or a lead no-impact override", async () => {
  const { data, proposals } = impactFixture();
  const f = await setup(proposals, data);
  const result = await run(f);
  const re = by(await result.suggestions(), "kind", "re-review");
  const byMapping = Object.fromEntries(re.map((r) => [r.record, r]));
  assert.deepEqual(Object.keys(byMapping).sort(), ["MP-100", "MP-102", "MP-104", "MP-106", "MP-108"], "could, unknown, lead-loud, the unstated case and a decision that recorded no version");
  assert.ok(re.every((r) => r.tab === "Mappings" && r.field === "mapping_status" && r.suggested_value === "re-review-suggested" && r.current_value === "accepted"));
  assert.equal(byMapping["MP-100"]!.review, "impact: could-affect");
  assert.match(byMapping["MP-100"]!.reason!, /Could Case.*version 2.*considered 1/);
  assert.equal(byMapping["MP-102"]!.review, "impact: unknown");
  assert.match(byMapping["MP-102"]!.reason!, /unknown/);
  assert.equal(/no impact/i.test(byMapping["MP-102"]!.reason!), false, "unknown is never described as no impact");
  assert.equal(byMapping["MP-104"]!.review, "impact: could-affect", "the lead override replaces the proposer's not-expected");
  assert.match(byMapping["MP-104"]!.reason!, /lead override/);
  assert.equal(byMapping["MP-106"]!.review, "impact: unknown", "no stated impact is unknown, not none");
  assert.match(byMapping["MP-108"]!.reason!, /considered no version/);
  for (const quiet of ["MP-101", "MP-103", "MP-105", "MP-107", "MP-900"]) assert.equal(quiet in byMapping, false, quiet);
});

test("[B07] re-review never edits decision fields or writes a mapping update", async () => {
  const { data, proposals } = impactFixture();
  const f = await setup(proposals, data);
  const result = await run(f);
  const updates = await result.updates();
  assert.ok(updates.length > 0);
  assert.equal(updates.some((u) => u.tab === "Mappings"), false);
  const suggestions = JSON.stringify(await result.suggestions());
  for (const field of ["decision_ref", "decided_by", "decided_on"]) assert.equal(suggestions.includes(field), false, field);
});

test("[B07] a held version change suggests nothing", async () => {
  const { data, proposals } = impactFixture();
  const f = await setup(
    proposals.map((p) => (p.key === "Could Case" && p.field === "current_version" ? { ...p, base: "0" } : p)),
    data,
  );
  const result = await run(f);
  assert.deepEqual(by(await result.conflicts(), "kind", "base-mismatch").map((c) => c.record), ["UC-100"]);
  const re = by(await result.suggestions(), "kind", "re-review");
  assert.equal(by(re, "record", "MP-100").length, 0);
  assert.ok(by(re, "record", "MP-102").length > 0, "other use cases are still reviewed");
});

test("[B10] existing references, answers, owners, tickets, dates and acknowledgements are never changed, reassigned or proposed for change", async () => {
  const f = await setup([
    { tab: "Questions", op: "suggest", key: "Daily Report/Q1", field: "status", value: "closed" },
    { tab: "Questions", op: "suggest", key: "Daily Report/Q1", field: "our_owner", value: "Zed" },
    { tab: "Questions", op: "suggest", key: "Daily Report/Q1", field: "resolver", value: "Other Lead" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "answer", value: "Changed", base: "x" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "answer_status", value: "not-answered", base: "answered" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "released_on", value: "2026-12-01", base: "2026-11-12" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "due_on", value: "2026-12-03", base: "2026-11-16" },
    { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "question_ref", value: "QN-0099", base: "QN-0001" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "use_case_ref", value: "UC-099", base: "UC-001" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "acknowledged_version", value: "9", base: "1" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "acknowledgement_reference", value: "ACK-99", base: "ACK-77" },
    { tab: "Identity & Access", op: "set", key: "Daily Report/Reports/prod", field: "ticket_ref", value: "TCK-1", base: "TCK-9" },
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "current_version", value: "2", base: "1" },
  ]);
  const before = await snapshot(f.exportDir);
  const result = await run(f);
  assert.deepEqual((await result.updates()).map((u) => u.field), ["current_version"]);
  const human = by(await result.suggestions(), "kind", "human-field");
  assert.deepEqual(human.map((s) => [s.record, s.field, s.current_value, s.suggested_value]), [
    ["QN-0001", "status", "released", "closed"],
    ["QN-0001", "our_owner", "Ann", "Zed"],
    ["QN-0001", "resolver", "Lead Rae", "Other Lead"],
  ]);
  assert.deepEqual(await snapshot(f.exportDir), before, "the export is never written");
  const files = await snapshot(f.out);
  assert.equal(Object.values(files).some((content) => content.includes("QN-0099") && !content.includes("rejected")), false);
});

test("[B10] a repeated run does not overwrite a newer human edit", async () => {
  const f = await setup([
    { tab: "Use Cases", op: "set", key: "Daily Report", field: "current_version", value: "2", base: "1" },
    { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "our_owner", value: "Zed" },
  ]);
  const first = await run(f);
  assert.equal((await first.updates()).length, 1);
  const data = baseExport();
  data["Use Cases"]![0] = { ...data["Use Cases"]![0]!, current_version: "3", our_owner: "Mia", last_updated: "2026-11-19" };
  await writeExport(f.exportDir, data);
  const second = await run(f);
  assert.deepEqual(await second.updates(), []);
  const conflicts = await second.conflicts();
  assert.deepEqual(by(conflicts, "kind", "base-mismatch").map((c) => [c.current_value, c.proposed_value]), [["3", "2"]]);
  assert.deepEqual(by(await second.suggestions(), "kind", "human-field").map((s) => s.current_value), [], "the suggestion on the held record is held, not repeated over Mia's edit");
  assert.equal((await text(join(f.out, "field-updates.csv"))).includes("Mia"), false);
});
