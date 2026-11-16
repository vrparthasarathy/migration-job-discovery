# Requirements: Master Workbook Updater

The shared rules are in the [root requirements](../../requirements.md#requirements) and the [Tracker Tools requirements](../requirements.md#requirements).

## Requirements

- Goal: produce the internal master workbook from the SharePoint download with the lead's accepted review rows applied, bring each vendor's own entries into it, and rebuild each named vendor's workbook from it, so nothing is copied by hand and the master and the vendor workbooks agree. The SharePoint workbook stays authoritative; the lead downloads and uploads by hand. The tool writes nothing to SharePoint.
- Covers the backlog item `internal-tracker-apply`: internal-column values and `other_changes` that the Vendor Workbook Updater only lists, `acknowledgement_requested_on` refreshed in vendor workbooks, master rows missing from a vendor workbook added, and vendor fields that were only in `other_changes` reaching the vendor workbook.
- Vendor sync is limited to the vendor-owned columns of the Updater's `data/vendor-edited.csv`; the lead's review decision (`status`, `resolver`, `closed_reason`) is never touched.
- Vendor-safe rules are reused, not changed: the vendor workbook holds only that vendor's rows, vendor-visible columns and released questions, never an internal column, mapping, group, link or another vendor's row, and no secret value is written anywhere.
- Deterministic: the same inputs and run date give identical bytes (fixed timestamps, no `TODAY()`); no input is overwritten; any input problem stops with the file and line named and nothing written.

## Must match the source

- `tracker-data-contract/tracker-schema.csv` (owner, visibility, type, allowed values) read at run time; no column list in code beyond the sample's headings files.
- The Review CSV Exporter's header, digest, statuses and `other_changes` format, the Vendor Workbook Updater's reader and writer (a test feeds the output to the reader), and the Sample Tracker Workbook's layout.

## Need not match

- The lead's formatting and helper formulas in the downloaded master (values only; formulas dropped and listed), the Vendor Workbook Updater's release flags, direct SharePoint writes (backlog `tracker-direct-integration`), Review, Proposed Changes or Trace sheets in the master, and proposals or the use case index (proposal IDs are copied verbatim).

## Technology and departures from the group

- Node 26 with native TypeScript and `node:test`, as the siblings, plus one exact-pinned `exceljs` 4.4.0 (component-local `package.json` and lockfile; `npm ci` is the `install` check), the same version as the Sample Tracker Workbook and the Vendor Workbook Updater. The group's owner reconciles the dependency count and the "no dependencies" rule; this component does not edit them. The client environment needs a reachable npm registry, as the Updater already does.
- Reuse by relative import, never copies: Tracker Tables (`csv`, `schema`, `vendor_view`, `working_days`), the Reconciler (`inputs`, `secrets`), the Exporter (`headings`, `rows`, `review`), the sample (`layout`, `review_columns`, `headings.csv`) and the Updater (`columns`, `reviews`, `workbook_read`, `workbook_write`, `archive`, `files`). The Updater's `loadReviews` (fixed to its three tabs), `cellText` and `headerRow` (private) are not exported, so this tool carries its own copies of about 80 lines; if the Updater's owner later exports them, the copies go.

## Risks

- A whole-workbook rebuild loses formatting and formulas the lead added; the report lists dropped formulas.
- Using this tool and the Vendor Workbook Updater on the same review rows can double-apply; B9's drift list catches the mix.
- A vendor's later edit on a downloaded copy older than the master is detected only as a value difference; the lead should download fresh copies before a run.

## Follow-on work (recorded, not built)

- Writing the next export CSVs and `manifest.csv` from the master (backlog `master-csv-export`).
- Sharing the sheet-writing code between the sample, the Updater and this tool (backlog `workbook-sheet-code-sharing`).

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
