import type { Export, PRow } from "./support.ts";

/**
 * A three-vendor export (Acme, Beta, Gamma) as of 2026-11-16 (a Monday).
 * Each vendor has a distinctive word in its rows so a leak is easy to see. It holds unreleased question rows,
 * a question group and link, a decided mapping, a clarification-requested row whose answer is complete
 * and a complete answer awaiting lead review.
 */
export function threeVendorExport(): Export {
  return {
    "Use Cases": [
      { use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", current_version: "1", spec_link: "https://specs.example/daily", stage: "sent", our_owner: "Ann", workflow_candidate: "Report Builder", notes_internal: "internal-only-note", source_status: "located", last_updated: "2026-11-10" },
      { use_case_ref: "UC-002", use_case_name: "Nightly Sync", vendor: "Beta", current_version: "1", stage: "sent", our_owner: "Bob", source_status: "located", last_updated: "2026-11-10" },
      { use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Gamma", current_version: "1", stage: "review", our_owner: "Cy", source_status: "located", last_updated: "2026-11-10" },
    ],
    Questions: [
      { question_ref: "QN-0001", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", spec_refs: "Daily Report/Q1@v1", question_text: "Which time zone does the daily report use?", batch_ref: "BT-001", released_on: "2026-11-09", due_on: "2026-11-11", answer: "UTC plus two per the SLA", answer_status: "answered", answered_on: "2026-11-13", answered_by: "Acme Bob", status: "released", our_owner: "Ann", current_spec_text: "Which time zone does the daily report use?", text_review: "none", last_updated: "2026-11-13" },
      { question_ref: "QN-0002", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", spec_refs: "Daily Report/Q2@v1", question_text: "Unreleased Acme question about archive retention", status: "captured", captured_on: "2026-11-09", our_owner: "Ann", current_spec_text: "Unreleased Acme question about archive retention", last_updated: "2026-11-09" },
      { question_ref: "QN-0003", use_case_ref: "UC-002", use_case_name: "Nightly Sync", vendor: "Beta", spec_refs: "Nightly Sync/Q1@v1", question_text: "How are retries scheduled for the nightly sync?", batch_ref: "BT-002", released_on: "2026-11-09", due_on: "2026-11-11", answer: "Only on weekdays so far", answer_status: "answered", answered_on: "2026-11-10", status: "clarification-requested", our_owner: "Bob", current_spec_text: "How are retries scheduled for the nightly sync?", last_updated: "2026-11-12" },
      { question_ref: "QN-0004", use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Gamma", spec_refs: "Invoice Feed/Q1@v1", question_text: "Which tax codes appear in the invoice feed?", batch_ref: "BT-003", released_on: "2026-11-12", due_on: "2026-11-16", answer: "Standard and reduced rates", answer_status: "answered", answered_on: "2026-11-13", status: "released", our_owner: "Cy", current_spec_text: "Which tax codes appear in the invoice feed?", last_updated: "2026-11-13" },
      { question_ref: "QN-0005", use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Gamma", spec_refs: "Invoice Feed/Q2@v1", question_text: "Unreleased Gamma question about credit notes", status: "captured", captured_on: "2026-11-09", our_owner: "Cy", current_spec_text: "Unreleased Gamma question about credit notes", last_updated: "2026-11-09" },
    ],
    "Question Groups": [{ group_ref: "QG-001", canonical_text: "Retry scheduling (internal group)", last_updated: "2026-11-10" }],
    "Question Links": [{ link_ref: "QL-0001", group_ref: "QG-001", question_ref: "QN-0003", link_status: "confirmed", last_updated: "2026-11-10" }],
    Mappings: [
      { mapping_ref: "MP-001", use_case_ref: "UC-001", workflow_candidate: "Report Builder", mapping_status: "accepted", decision_ref: "WD-001", decided_by: "Lead Rae", decided_on: "2026-11-08", spec_versions_considered: "1", last_updated: "2026-11-08" },
    ],
    "Identity & Access": [
      { access_ref: "AX-001", vendor: "Acme", use_case_ref: "UC-001", service: "Reports", endpoint: "/api/report", environment: "prod", request_status: "raised", our_coordinator: "Ann", vendor_action_owner: "Acme Sam", affected_workflow: "Report Builder", last_updated: "2026-11-10" },
    ],
    Batches: [
      { batch_ref: "BT-001", vendor: "Acme", use_case_refs: "UC-001", released_on: "2026-11-09", due_on: "2026-11-11", status: "released", last_updated: "2026-11-09" },
      { batch_ref: "BT-002", vendor: "Beta", use_case_refs: "UC-002", released_on: "2026-11-09", due_on: "2026-11-11", status: "released", last_updated: "2026-11-09" },
      { batch_ref: "BT-003", vendor: "Gamma", use_case_refs: "UC-003", released_on: "2026-11-12", due_on: "2026-11-16", status: "released", last_updated: "2026-11-12" },
    ],
  };
}

/** A small revision of two specifications so the reconciler has something to report on the three-vendor export. */
export const revisionOfThreeVendors: PRow[] = [
  { tab: "Use Cases", op: "set", key: "Daily Report", field: "spec_link", value: "https://specs.example/daily-v2", base: "https://specs.example/daily" },
  { tab: "Use Cases", op: "set", key: "Nightly Sync", field: "current_version", value: "2", base: "1" },
  { tab: "Use Cases", op: "set", key: "Invoice Feed", field: "current_version", value: "2", base: "1" },
  { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "current_spec_text", value: "Which time zone does the daily report use for timestamps?", base: "Which time zone does the daily report use?" },
  { tab: "Questions", op: "add", key: "Daily Report/Q9", field: "use_case_name", value: "Daily Report" },
  { tab: "Questions", op: "add", key: "Daily Report/Q9", field: "question_text", value: "How are retries scheduled for the nightly sync?" },
];

/**
 * An export for the revision case (B08): a vendor's answer to a question row, an owner and a decided mapping
 * on a use case, and four more use cases, each with a decided mapping, for the grouping-impact cases.
 */
export function answeredExport(): Export {
  const data: Export = {
    "Use Cases": [
      { use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", current_version: "1", spec_link: "https://specs.example/daily", stage: "sent", our_owner: "Ann", source_status: "located", last_updated: "2026-11-10" },
    ],
    Questions: [
      { question_ref: "QN-0001", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", spec_refs: "Daily Report/Q1@v1", question_text: "Which time zone does the daily report use?", batch_ref: "BT-001", released_on: "2026-11-12", due_on: "2026-11-16", answer: "UTC plus two per the SLA", answer_status: "answered", answered_on: "2026-11-13", answered_by: "Acme Bob", status: "released", our_owner: "Ann", current_spec_text: "Which time zone does the daily report use?", text_review: "none", last_updated: "2026-11-13" },
    ],
    Mappings: [],
    Batches: [{ batch_ref: "BT-001", vendor: "Acme", use_case_refs: "UC-001", released_on: "2026-11-12", due_on: "2026-11-16", status: "released", last_updated: "2026-11-12" }],
  };
  const decided = (n: number, useCase: string) => ({ mapping_ref: `MP-00${n}`, use_case_ref: useCase, workflow_candidate: "Report Builder", mapping_status: "accepted", decision_ref: `WD-00${n}`, decided_by: "Lead Rae", decided_on: "2026-11-08", spec_versions_considered: "1", last_updated: "2026-11-08" });
  data.Mappings!.push(decided(1, "UC-001"));
  [
    ["UC-002", "Could Case"],
    ["UC-003", "Behavior No Impact"],
    ["UC-004", "Unknown Case"],
    ["UC-005", "Version Only"],
  ].forEach(([ref, name], index) => {
    data["Use Cases"]!.push({ use_case_ref: ref!, use_case_name: name!, vendor: "Acme", current_version: "1", stage: "sent", our_owner: "Ann", source_status: "located", last_updated: "2026-11-10" });
    data.Mappings!.push(decided(index + 2, ref!));
  });
  return data;
}

/** The proposal from the revised specifications: every kind of change the behavior names, plus two rows nobody may propose. */
export const revisedSpecification: PRow[] = [
  // The existing question row is re-stated (an add of what already exists) and its wording is edited.
  { tab: "Questions", op: "add", key: "Daily Report/Q1", field: "use_case_name", value: "Daily Report" },
  { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "current_spec_text", value: "Which time zone does the daily report use for its timestamps?", base: "Which time zone does the daily report use?", reason: "wording edit: timestamps named" },
  { tab: "Questions", op: "suggest", key: "Daily Report/Q1", field: "text_review", value: "wording-edit", reason: "wording edit only" },
  // The owner is suggested differently; the vendor's answer and the status are proposed anyway and must be refused.
  { tab: "Use Cases", op: "suggest", key: "Daily Report", field: "our_owner", value: "Zed", reason: "new owner suggested" },
  { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "answer", value: "Invented answer", base: "UTC plus two per the SLA" },
  { tab: "Questions", op: "set", key: "Daily Report/Q1", field: "released_on", value: "2026-12-01", base: "2026-11-12" },
  // Grouping impact: could-affect, a behavior change with no grouping impact, unknown, and a version-only change.
  { tab: "Use Cases", op: "set", key: "Could Case", field: "current_version", value: "2", base: "1" },
  { tab: "Use Cases", op: "set", key: "Could Case", field: "last_change_class", value: "behavior-change", base: "" },
  { tab: "Use Cases", op: "set", key: "Could Case", field: "grouping_impact", value: "could-affect", base: "", reason: "a new step changes the shared steps" },
  { tab: "Use Cases", op: "set", key: "Behavior No Impact", field: "current_version", value: "2", base: "1" },
  { tab: "Use Cases", op: "set", key: "Behavior No Impact", field: "last_change_class", value: "behavior-change", base: "" },
  { tab: "Use Cases", op: "set", key: "Behavior No Impact", field: "grouping_impact", value: "not-expected", base: "", reason: "the new behavior touches no shared step" },
  { tab: "Use Cases", op: "set", key: "Unknown Case", field: "current_version", value: "2", base: "1" },
  { tab: "Use Cases", op: "set", key: "Unknown Case", field: "last_change_class", value: "behavior-change", base: "" },
  { tab: "Use Cases", op: "set", key: "Unknown Case", field: "grouping_impact", value: "unknown", base: "", reason: "the source does not show the effect on shared steps" },
  { tab: "Use Cases", op: "set", key: "Version Only", field: "current_version", value: "2", base: "1" },
  { tab: "Use Cases", op: "set", key: "Version Only", field: "last_change_class", value: "non-behavior-change", base: "" },
  { tab: "Use Cases", op: "set", key: "Version Only", field: "grouping_impact", value: "not-expected", base: "", reason: "version number only" },
];
