# Requirements: Tracker Tables

The shared rules are in the [group requirements](../requirements.md#requirements).

## Requirements

- The library reads and writes the tracker CSV tables (RFC 4180, UTF-8, LF), validates them against the contract's schema, builds vendor views and does working-day arithmetic. It is imported by the reconciler and the summary and has no entry point.
- Unknown columns are warned about and preserved; a missing required column is an error naming the file and column. Status, reference and date problems are reported with file, row and field.
- The vendor view contains only that vendor's rows and vendor-visible columns, question rows only after release and with no group, link or other-row reference, and no Question Groups, Question Links or Mappings tab.
- Working days are Monday to Friday minus an optional holidays file; two working days are added to the release day, `due_on` is never moved by a response, and overdue is true after `due_on` for an open question row whose lead-owned status is `clarification-requested` or whose vendor-owned answer status is not `answered`; a complete answer awaiting lead review is not vendor-overdue.

## Must match the source

- The Tracker Data Contract's `tracker-schema.csv`, encoding and status lists.

## Need not match

- Excel file formats or any SharePoint behavior.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
