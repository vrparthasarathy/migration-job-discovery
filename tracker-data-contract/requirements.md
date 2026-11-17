# Requirements: Tracker Data Contract

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The component defines one data contract for the use case tracker, used by every skill and tool: tabs and columns (with the owner and visibility class of each column), the reference scheme, the status lists, the captured versus released rule with due dates, the per-row answer rule, the proposal file format, the export format and the workbook layout guide. The shapes are in [contract.md](contract.md#contract).
- The authoritative tracker is Excel on SharePoint: one internal master workbook and vendor-specific workbooks. Leads copy vendor answers into the master row for row and apply reconciler output by hand. No integration is built.
- Local references used in proposals, and `spec_refs`, are built from the use case ID `uc-<vendor-slug>-<use-case-slug>` (derived from `vendor` and `use_case_name`, never stored); a use case without a vendor has no ID.
- Every question row traces to a specification question (its ID and version); the contract has no free-standing intake. Existing questions that developers supply are structured into a specification first and then proposed.
- A question for several use cases is one row per use case with its own answer and status. Grouping and links are internal and never copy or inherit an answer.
- A response is not a resolution. A partial answer stays open with its original due date; a cannot-answer row stays open until a lead assigns a resolver or closes it; neither resets the deadline or leaves overdue visibility, and follow-up and overdue can both apply.
- Grouping impact is assessed separately from behavior change, with a short reason and a lead override; unknown stays visible.
- Use cases carry a source status, and access requests are one row per use case and endpoint, with identity references and never a secret.
- Vendors see only their own use cases, released questions, answers, acknowledgement and access requests. Mappings, lead decisions, workflow candidates and cross-vendor comparisons are internal.
- Behavior acknowledgement and verified access readiness are separate signals. Captured and released are separate facts; a vendor's due date starts only on release.
- The deliverable files are plain Markdown and CSV with no Craft term, no real vendor data and no secret. The contract and schema files are copied byte for byte into the skill folders that use them.
- Document components are not run by any tool; each behavior is marked `untested: benchmark pending` and the component's `review-checklist.md` file review is the stand-in (testing policy in the [root requirements](../requirements.md#requirements)).

## Must match the source

- Not applicable; this is new. It must agree with the root's [pack contract](../contract.md#contract) and the vendor-visibility rules there.

## Need not match

- SharePoint or Excel file internals, any real vendor data, or the specific number of vendor tracks (the contract reads vendors as free slugs).

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Contract drift.** Several copies exist (skill folders). The root integration check compares them.
- **Meaning of `QN-####` changed.** It now names a use case and question row, not a central question; the grouping is the internal `QG-###`. Earlier drafts of other components that used one shared answer cell were revised with this change.
- **Hand application.** Because leads apply changes by hand, the contract keeps stable references and human-owned fields easy to see.

## Planned change: proposal file shape rules

- The Proposal file section states: exactly 12 fields per row; the file ends with one line feed, LF only, no byte order mark; a stage that appends to a shared file first makes sure the file ends with a line feed; an empty `base_value` is written blank (never a placeholder), and on a `set` a blank `base_value` means the field was blank when seen; the key form of each tab; and the candidate slug rule of the reconciler.
- Must not: change `tracker-schema.csv`, the references or the statuses.
