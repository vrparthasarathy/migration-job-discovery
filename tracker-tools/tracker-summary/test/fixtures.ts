import type { Row } from "../../tracker-tables/src/csv.ts";
import type { Export } from "./support.ts";

const uc = (ref: string, name: string, vendor: string, stage: string, extra: Row = {}): Row => ({ use_case_ref: ref, use_case_name: name, vendor, stage, source_status: "located", our_owner: "lead-a", ...extra });

const qn = (ref: string, useCase: string, vendor: string, extra: Row): Row => ({ question_ref: ref, use_case_ref: useCase, vendor, status: "released", answer_status: "not-answered", our_owner: "lead-a", ...extra });

/**
 * Three vendor tracks (alpha, beta, gamma) and a date of 2026-11-16 (a Monday).
 * Questions released on 2026-11-09 fall due on 2026-11-11, so they are overdue.
 */
export function baseExport(): Export {
  return {
    "Use Cases": [
      uc("UC-001", "Daily Report", "alpha", "draft"),
      uc("UC-002", "Export Data", "alpha", "review", { source_status: "not-located", source_owner: "ana", supporting_documents: "doc-1;doc-2", workflow_candidate: "wf-report" }),
      uc("UC-003", "Import", "beta", "sent", { source_status: "empty", source_owner: "", our_owner: "lead-b" }),
      uc("UC-004", "Refund", "beta", "awaiting-acknowledgement", { source_status: "confirmed-unavailable", source_owner: "bo", blocked_reason: "waiting on legal", our_owner: "lead-b", current_version: "3", acknowledgement_requested_on: "2026-11-10", workflow_candidate: "wf-import" }),
      uc("UC-005", "Audit", "gamma", "acknowledged", { source_status: "uncertain-mapping", source_owner: "cy", our_owner: "lead-c", acknowledged_version: "4", acknowledged_on: "2026-11-14" }),
      uc("UC-006", "Search", "gamma", "draft", { next_action: "ask vendor", next_action_owner: "", workflow_candidate: "wf-search", grouping_impact: "could-affect" }),
      uc("UC-007", "Login", "gamma", "draft", { workflow_candidate: "wf-search" }),
      uc("UC-008", "Invoice", "beta", "draft", { workflow_candidate: "wf-import", our_owner: "lead-b" }),
      uc("UC-009", "Payment", "beta", "draft", { workflow_candidate: "wf-import", our_owner: "lead-b" }),
      uc("UC-010", "Profile", "gamma", "review", { workflow_candidate: "wf-search", our_owner: "lead-c" }),
      uc("UC-011", "Settings", "gamma", "", { our_owner: "lead-c" }),
    ],
    Questions: [
      qn("QN-0001", "UC-001", "alpha", { released_on: "2026-11-09", due_on: "2026-11-11" }),
      qn("QN-0002", "UC-001", "alpha", { released_on: "2026-11-09", due_on: "2026-11-11", answer_status: "partially-answered" }),
      qn("QN-0003", "UC-003", "beta", { released_on: "2026-11-09", due_on: "2026-11-11", answer_status: "cannot-answer", resolver: "res-1", our_owner: "lead-b" }),
      qn("QN-0004", "UC-003", "beta", { released_on: "2026-11-09", due_on: "2026-11-11", answer_status: "cannot-answer", resolver: "", our_owner: "lead-b" }),
      qn("QN-0005", "UC-003", "beta", { released_on: "2026-11-09", due_on: "2026-11-11", answer_status: "answered", status: "clarification-requested", our_owner: "lead-b" }),
      qn("QN-0006", "UC-005", "gamma", { released_on: "2026-11-12", due_on: "2026-11-16", answer_status: "answered", answered_on: "2026-11-13", our_owner: "lead-c" }),
      qn("QN-0007", "UC-005", "gamma", { released_on: "2026-11-02", due_on: "2026-11-04", answer_status: "answered", status: "accepted", our_owner: "lead-c" }),
      qn("QN-0008", "UC-006", "gamma", { status: "captured", our_owner: "lead-c" }),
      qn("QN-0009", "UC-006", "gamma", { status: "captured", blocks_mapping: "yes", our_owner: "" }),
      qn("QN-0010", "UC-007", "gamma", { released_on: "2026-11-09", due_on: "", our_owner: "" }),
    ],
    Mappings: [
      { mapping_ref: "MP-001", use_case_ref: "UC-001", workflow_candidate: "wf-report", mapping_status: "candidate" },
      { mapping_ref: "MP-002", use_case_ref: "UC-005", workflow_candidate: "wf-audit", mapping_status: "pending-clarification" },
      { mapping_ref: "MP-003", use_case_ref: "UC-006", workflow_candidate: "wf-search", mapping_status: "re-review-suggested" },
      { mapping_ref: "MP-004", use_case_ref: "UC-002", workflow_candidate: "wf-report", mapping_status: "accepted" },
    ],
    "Identity & Access": [
      { access_ref: "AX-001", vendor: "alpha", use_case_ref: "UC-001", service: "portal", endpoint: "/api/a", request_status: "approved", our_coordinator: "lead-a", vendor_action_owner: "va-1", expected_availability: "2026-12-01", verification: "verified" },
      { access_ref: "AX-002", vendor: "beta", use_case_ref: "UC-003", service: "portal", endpoint: "/api/b", request_status: "blocked", our_coordinator: "", vendor_action_owner: "vb-1", expected_availability: "unknown", verification: "not-verified", affected_workflow: "wf-import", next_action: "chase", next_action_owner: "" },
      { access_ref: "AX-003", vendor: "gamma", use_case_ref: "UC-005", service: "portal", endpoint: "/api/c", request_status: "provisioned", our_coordinator: "lead-c", vendor_action_owner: "vc-1", expected_availability: "", verification: "failed" },
    ],
    Batches: [
      { batch_ref: "BT-001", vendor: "alpha", use_case_refs: "UC-002", status: "planned", provisional_limits: "up to 5 per week" },
      { batch_ref: "BT-002", vendor: "beta", use_case_refs: "UC-004;UC-008", status: "planned", provisional_limits: "3 per week", capacity_notes: "review on Fridays" },
      { batch_ref: "BT-003", vendor: "gamma", use_case_refs: "UC-007", status: "released", released_on: "2026-11-02", provisional_limits: "2 per week" },
    ],
  };
}
