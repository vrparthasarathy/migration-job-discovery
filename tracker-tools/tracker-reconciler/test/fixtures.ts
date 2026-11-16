import type { Row } from "../../tracker-tables/src/csv.ts";

/** A three-vendor export with unreleased rows, groups, links, mappings, tickets and acknowledgements. */
export function baseExport(): Record<string, Row[]> {
  return {
    "Use Cases": [
      { use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", current_version: "1", spec_link: "https://specs.example/daily", stage: "sent", source_owner: "Sam", our_owner: "Ann", acknowledgement_requested_on: "2026-11-03", acknowledged_version: "1", acknowledged_on: "2026-11-05", acknowledgement_reference: "ACK-77", notes_internal: "internal-only-note", last_updated: "2026-11-10" },
      { use_case_ref: "UC-002", use_case_name: "Nightly Sync", vendor: "Beta", current_version: "1", stage: "sent", our_owner: "Bob", last_updated: "2026-11-10" },
      { use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Gamma", current_version: "1", stage: "review", our_owner: "Cy", last_updated: "2026-11-10" },
    ],
    Questions: [
      { question_ref: "QN-0001", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", spec_refs: "Daily Report/Q1@v1", question_text: "Which time zone does the daily report use?", batch_ref: "BT-001", released_on: "2026-11-12", due_on: "2026-11-16", answer: "UTC plus two per the SLA", answer_status: "answered", answered_on: "2026-11-13", answered_by: "Acme Bob", status: "released", resolver: "Lead Rae", our_owner: "Ann", current_spec_text: "Which time zone does the daily report use?", text_review: "none", last_updated: "2026-11-13" },
      { question_ref: "QN-0002", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", spec_refs: "Daily Report/Q2@v1", question_text: "Unreleased Acme question about archive retention", status: "captured", captured_on: "2026-11-09", our_owner: "Ann", current_spec_text: "Unreleased Acme question about archive retention", last_updated: "2026-11-09" },
      { question_ref: "QN-0003", use_case_ref: "UC-002", use_case_name: "Nightly Sync", vendor: "Beta", spec_refs: "Nightly Sync/Q1@v1", question_text: "How are retries scheduled for the nightly sync?", batch_ref: "BT-002", released_on: "2026-11-12", due_on: "2026-11-16", answer: "Only on weekdays so far", answer_status: "partially-answered", answered_on: "2026-11-13", status: "released", our_owner: "Bob", current_spec_text: "How are retries scheduled for the nightly sync?", last_updated: "2026-11-13" },
      { question_ref: "QN-0004", use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Gamma", spec_refs: "Invoice Feed/Q1@v1", question_text: "Which tax codes appear in the invoice feed?", batch_ref: "BT-003", released_on: "2026-11-12", due_on: "2026-11-16", answer_status: "cannot-answer", answered_on: "2026-11-13", status: "released", our_owner: "Cy", current_spec_text: "Which tax codes appear in the invoice feed?", last_updated: "2026-11-13" },
    ],
    "Question Groups": [{ group_ref: "QG-001", canonical_text: "Retry scheduling (internal group)", last_updated: "2026-11-10" }],
    "Question Links": [{ link_ref: "QL-0001", group_ref: "QG-001", question_ref: "QN-0003", link_status: "confirmed", last_updated: "2026-11-10" }],
    Mappings: [
      { mapping_ref: "MP-001", use_case_ref: "UC-001", workflow_candidate: "Report Builder", mapping_status: "accepted", decision_ref: "WD-001", decided_by: "Lead Rae", decided_on: "2026-11-08", spec_versions_considered: "1", last_updated: "2026-11-08" },
    ],
    "Identity & Access": [
      { access_ref: "AX-001", vendor: "Acme", use_case_ref: "UC-001", service: "Reports", endpoint: "/api/report", environment: "prod", ticket_ref: "TCK-9", raised_on: "2026-11-02", request_status: "raised", expected_availability: "2026-12-01", verification: "verified", last_updated: "2026-11-10" },
    ],
    Batches: [
      { batch_ref: "BT-001", vendor: "Acme", use_case_refs: "UC-001", released_on: "2026-11-12", due_on: "2026-11-16", status: "released", last_updated: "2026-11-12" },
      { batch_ref: "BT-002", vendor: "Beta", use_case_refs: "UC-002", released_on: "2026-11-12", due_on: "2026-11-16", status: "released", last_updated: "2026-11-12" },
      { batch_ref: "BT-003", vendor: "Gamma", use_case_refs: "UC-003", released_on: "2026-11-12", due_on: "2026-11-16", status: "released", last_updated: "2026-11-12" },
    ],
  };
}
