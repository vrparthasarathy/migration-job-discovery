/** Layout rules for the sample workbook: sheet order, colours, widths, frozen panes and the columns kept off the main sheets. */

export type Visibility = "V" | "I";

/** The contract tabs shown as main sheets, by the schema's tab name. */
export const CONTRACT_TABS = ["Use Cases", "Questions", "Identity & Access", "Mappings"];
export const SHEET_FOR_TAB: Record<string, string> = {
  "Use Cases": "Use Cases",
  Questions: "Questions",
  "Identity & Access": "Identity & Access",
  Mappings: "Workflow Mappings",
  "Proposed Changes": "Proposed Changes",
  Trace: "Trace",
};
/** Every tab that has headings: the contract tabs and this component's two own sheets. */
export const HEADING_TABS = Object.keys(SHEET_FOR_TAB);

export const KEY_COLUMN: Record<string, string> = {
  "Use Cases": "use_case_ref",
  Questions: "question_ref",
  "Identity & Access": "access_ref",
  Mappings: "mapping_ref",
};

/** Schema columns that move to Trace or are dropped from the main sheets. */
export const OMITTED = ["proposal_refs", "source_links", "evidence_refs", "mr_link", "last_updated"];
/** Omitted columns that become Trace rows, with the Trace kind each one carries. */
export const TRACE_KIND: Record<string, string> = {
  proposal_refs: "proposal",
  source_links: "source",
  evidence_refs: "evidence",
  mr_link: "merge-request",
};
export const TRACE_KINDS = ["proposal", "specification", "evidence", "source", "merge-request"];

/** Columns the workbook computes, by tab, with how they are described in the Read Me dictionary. */
export const COMPUTED: Record<string, Record<string, string>> = {
  "Use Cases": { pending_change: "computed from Proposed Changes" },
  Questions: {
    review_state: "computed at the as-of date",
    days_past_original_due: "computed at the as-of date, in working days",
    age_awaiting_review: "computed at the as-of date, in calendar days",
    pending_change: "computed from Proposed Changes",
  },
  "Identity & Access": { pending_change: "computed from Proposed Changes" },
};

export const PROPOSAL_OPERATIONS = ["set", "suggest", "add", "link"];
export const PROPOSAL_STATUSES = ["pending-review", "accepted", "rejected"];
export const PROPOSED_COLUMNS = ["change_ref", "tab", "record_ref", "field", "operation", "current_value", "proposed_value", "reason", "review_status", "reviewer", "proposal_id", "update_id", "base_value", "source", "mr_link", "author", "created_on"];
export const TRACE_COLUMNS = ["tab", "record_ref", "kind", "reference"];
export const DATE_COLUMNS = ["created_on"];

/** Sheets, in workbook order, with how each is marked in the Read Me. */
export const SHEET_INFO: { name: string; visibility: string; purpose: string }[] = [
  { name: "Read Me", visibility: "Reference", purpose: "This guide: what the workbook is, the colour key and a dictionary of every column." },
  { name: "Use Cases", visibility: "Mixed: vendor-visible and internal columns", purpose: "One row per use case, with its specification version, acknowledgement and source." },
  { name: "Questions", visibility: "Mixed: vendor-visible and internal columns", purpose: "One row per use case and question, with the due date, the answer and the review state." },
  { name: "Identity & Access", visibility: "Mixed: vendor-visible and internal columns", purpose: "One row per use case, endpoint and environment, with the access request and its verification." },
  { name: "Workflow Mappings", visibility: "Internal only", purpose: "Workflow candidates for each use case, awaiting a lead's decision." },
  { name: "Proposed Changes", visibility: "Internal only", purpose: "Changes proposed to the tracker, not yet accepted, with their proposal metadata." },
  { name: "Trace", visibility: "Internal only", purpose: "Where each record's specification, proposals, evidence, sources and merge requests come from." },
  { name: "Lists", visibility: "Reference", purpose: "The allowed values behind the dropdowns, read from the tracker schema." },
];

export const COLOURS = {
  vendorHeader: "FF2F5597",
  internalHeader: "FF7F7F7F",
  internalTab: "FFC00000",
  mixedTab: "FF2F5597",
  referenceTab: "FF548235",
  bands: ["FFE7E6E6", "FFF2F2F2"],
  white: "FFFFFFFF",
};

export const DATE_FORMAT = "yyyy-mm-dd";
/** Rows below the data that also carry dropdowns, so a lead can add records. */
export const SPARE_ROWS = 100;
/** Header rows on a main sheet: row 1 is the group band and row 2 the table header. */
export const HEADER_ROWS = 2;

export function tabColour(sheet: string): string {
  if (["Workflow Mappings", "Proposed Changes", "Trace"].includes(sheet)) return COLOURS.internalTab;
  return ["Read Me", "Lists"].includes(sheet) ? COLOURS.referenceTab : COLOURS.mixedTab;
}

/** Columns frozen on the left of each sheet. */
export function frozenColumns(sheet: string): number {
  return ["Use Cases", "Questions", "Identity & Access", "Workflow Mappings"].includes(sheet) ? 2 : 1;
}

/** A readable width: wide enough for the heading and the longest value, within 12 and 50. */
export function columnWidth(heading: string, values: string[]): number {
  const longest = Math.max(0, ...values.map((v) => v.length));
  const wanted = Math.max(Math.min(longest, 60) + 2, Math.min(heading.length + 4, 22));
  return Math.min(50, Math.max(12, wanted));
}
