# Requirements: Vendor Sample Workbook

The shared rules are in the [root requirements](../../requirements.md#requirements) and the [Tracker Tools requirements](../requirements.md#requirements).

## Requirements

- Goal: a sample of the vendor-facing workbook, so the team can see exactly what one vendor receives, and so the Vendor Workbook Updater has a representative input. It is a sample, not a release: nothing reads it back and no real vendor data is used.
- Input is the Sample Tracker Workbook's fictional data and headings (`use-cases.csv`, `questions.csv`, `identity-access.csv`, `headings.csv`), read by relative path and validated with Tracker Tables. The first sample is Harborline Analytics, as of 2026-11-16, no holidays.
- Rows: only the named vendor's rows; a question only when `released_on` is set; the sample's Mappings, Proposed Changes or Review, Trace and Lists content never appears.
- Columns: only those the sample's `headings.csv` marks vendor-visible (`V`) for Use Cases, Questions and Identity & Access, in that order, with the sample's friendly headings and column-group band (row 1 band, row 2 header). Internal columns are never written, hidden or blank-filled.
- `Questions > Due on` is the release date plus two working days, computed, not a formula.
- Vendor-editable columns are the Vendor Workbook Updater's `data/vendor-edited.csv` (answer, answer status, answered on and by, the acknowledgement fields except the requested-on date, vendor action owner and additional requirements); their data cells are shaded and the Read Me names them. Everything else is plain text.
- The Read Me is short: what the file is, the shaded cells, the due-date rule, the answer statuses and a reminder never to type a secret; it names nothing internal.
- Deterministic: the same data and as-of date give files that read back identically (fixed timestamps, no `TODAY()`).
- On an unknown vendor, a dangling reference, a value outside the schema's list or a secret-like value, stop, name it and write no file.
- No secret value anywhere in the file.

## Must match the source

- `tracker-data-contract/tracker-schema.csv` (visibility, owner and type) and the sample's `data/headings.csv`, read at run time; no column list in code.
- The Vendor Workbook Updater's workbook input rules (header row in row 1 or 2 holding the tab's key heading, sample headings or schema names), checked by its own reader in a test.

## Need not match

- The sample workbook's internal sheets, colours of internal columns, dropdowns on internal columns, a real SharePoint workbook, or any import into one.

## Technology and departures from the group

- Node 26 with native TypeScript, `node:test`, as the siblings, plus one exact-pinned `exceljs` (component-local `package.json` and lockfile; `npm ci` is the `install` check), the same version as the Sample Tracker Workbook and the Vendor Workbook Updater. Alternative if the dependency is unwanted: a hand-written OOXML writer, as the throwaway prototype was. The group's owner reconciles the third dependency and the "no dependencies" rule; this component does not edit them.
- Reuse by relative import where it fits, never copies: Tracker Tables (`csv`, `schema`, `working_days`, `vendor_view`), the sample's data files, and for tests the Vendor Workbook Updater's `workbook_read`.

## Follow-on work (recorded, not built)

- The Meridian Freight Systems vendor file; `--vendor` already takes the name.
- A vendor sample for a vendor with released and unreleased batches across more days, and the formulas and Holidays sheet the sample also defers.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
