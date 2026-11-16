# Requirements: Sample Tracker Workbook

The shared rules are in the [root requirements](../../requirements.md#requirements) and the [Tracker Tools requirements](../requirements.md#requirements).

## Requirements

- Goal: a small, realistic sample of the final Excel tracker, so the team can discuss its format. It is not the authoritative tracker and nothing reads it back.
- The sample is the internal shape: it mixes vendor-visible and internal columns and is **not vendor-safe**. Vendor workbooks stay separate files built as the layout guide says. A hidden sheet or column is never separation, so nothing is hidden.
- Fictional data only: 5 use cases across two vendors (Harborline Analytics and Meridian Freight Systems), as-of date 2026-11-16, no holidays.
  - UC-001 Daily Invoice Status Report (Harborline): source located; specification v2 acknowledged at v1; website sign-in access (`AX-001`).
  - UC-002 Customer Address Refresh (Harborline): source empty; a pending change `PC-001` (current_version v2 to v3).
  - UC-003 Shipment Tracking Export (Harborline): source not located, with a tagged supporting document that does not clear the blocker; not located is not confirmed unavailable.
  - UC-004 Carrier Rate Sync (Meridian): uncertain source mapping; API access (`AX-002`, `AX-004`).
  - UC-005 Rate Exception Alert (Meridian): located; shares an endpoint with UC-004 as its own row (`AX-003`) with permissions to confirm, none assumed.
  - Questions: complete answer awaiting lead review with owner and age, not overdue; unanswered and overdue; partially answered, overdue and follow-up; answered but clarification requested, overdue against the original due date; the same question for UC-004 and UC-005 with separate answers; an unreleased row with no due date.
  - Mappings: one candidate awaiting a lead decision and one pending clarification; decision fields blank. Proposed changes: `PC-001` and a suggested source note `PC-002`.
- Must match the contract: schema column names, owner and visibility classes, allowed values, reference scheme, the due-date rule (release plus two working days) and its overdue, follow-up and awaiting-review rules, per-use-case answers, and the separation of acknowledgement version, request status and verification.
- Deterministic: the same data and as-of date give a workbook that reads back identically (fixed timestamps, no `TODAY()`).
- On a dangling reference, a value outside the schema's list or a secret-like value, stop, name it and write no file. Identity columns hold names and variable references only.
- No secret value anywhere in the workbook.

## Must match the source

- `tracker-data-contract/tracker-schema.csv` and `tracker-data-contract.md`, read at generation; no column list is repeated in code.

## Need not match

- The layout guide's hand-built tab list, exact headings and formulas (see [contract.md](contract.md#differences-from-the-tracker-contract)), SharePoint, a real vendor's data, or any import into the real tracker.

## Technology and departures from the group

- Node 26 with native TypeScript, `node:test`, as the siblings, plus one exact-pinned `exceljs` (component-local `package.json` and lockfile; `npm ci` is the `install` check). Alternative if the dependency is unwanted: a hand-written OOXML writer, more build cost and risk.
- Departure (a): the group's requirements say "no dependencies"; this component has one. Departure (b): the group says Excel file formats need not be matched; this component writes `.xlsx` as a deliberate sample, not a SharePoint import. The group's owner reconciles both; this component does not edit them.

## Follow-on work (recorded, not built)

- The coordinating skill and exporter: choose a use-case folder, run the discovery stages, refresh the consolidated review CSVs, process the next folder without duplicates or manual transposing (backlog item `discovery-to-review-csv-pipeline`), including wide rows for updates and suggestions.
- A vendor-view workbook from the same data; formulas and a Holidays sheet; Question Groups, Question Links and Batches sheets; revising the layout guide from the team's feedback; the vendor storage confirmation.
- Deferred and unchanged: infrastructure scope, and `same as` answers and lead prefill.

## Planned change: review sheets and composed IDs

Planned, not built; merged into the sections above when built.

- Replace the Proposed Changes sheet with Review - Use Cases, Review - Questions and Review - Identity & Access in the Review CSV Exporter's wide-row format, produced by running the exporter on real-format proposal fixtures and a small decisions fixture, with friendly headings from `data/review-headings.csv`.
- Cover an add, an update, a suggestion and a conflict, and a pending, accepted, rejected, clarify and changed-since-review row.
- Update IDs are composed `<proposal_id>:<tab>:<record_key>:<field>`; proposal IDs are `uc-<vendor-slug>-<use-case-slug>`; the review status list is the exporter's (blank, accepted, rejected, clarify).
- Must match: the exporter's header and statuses (read from the exporter, not repeated) and the Tracker Data Contract's proposal format.
- Must not: write a vendor file (that is the Vendor Sample Workbook), change the exporter, or keep fictional counter-style IDs.
- Use case ID forms (extended): every sample reference to a use case in the fixtures and in `spec_refs` uses the derived use case ID and the local references of the Tracker Data Contract; the data check stops on any other form.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
