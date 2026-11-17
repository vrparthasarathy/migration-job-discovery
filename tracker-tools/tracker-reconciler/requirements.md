# Requirements: Tracker Reconciler

The shared rules are in the [group requirements](../requirements.md#requirements).

## Requirements

- The tool compares proposals with the latest export and writes additions, field updates, conflicts, duplicate and link suggestions, re-review suggestions and vendor-safe copies for a lead to review and apply by hand. It writes only to its output directory.
- Human-entered values and central references are preserved: it never changes an existing central reference, answer, answer status, released question text, owner, status, ticket, date or acknowledgement, never overwrites a human-owned field (it suggests only), and never lets a proposal set a forbidden field.
- A use case is identified by its use case ID (`uc-<vendor-slug>-<use-case-slug>`), not its name: use cases of two vendors with one name are never merged or matched to each other.
- Repeated runs are idempotent: the same inputs give identical outputs, and a proposal already reflected in the export yields nothing. It does not overwrite a newer human edit; a base mismatch, a later edit or an older export is a conflict that it lists with both values and never resolves. The affected record and the changes of rows that refer to it are held with it, and unrelated safe changes are still reported.
- A new question row that resembles an existing row is a link suggestion; nothing is merged, linked or grouped automatically, and the new row starts blank with no inherited answer. A reworded released question is a `current_spec_text` update with a text-review suggestion; the released text and any answer are untouched and no row is withdrawn or replaced.
- Re-review of a decided mapping follows the grouping impact (a lead's override first, else the proposer's suggestion): it is suggested when the impact could affect grouping or is unknown, an unknown impact is listed as unknown and never treated as no impact, and a behavior change with no grouping impact, a version bump or a wording edit suggests nothing. Nothing is released or applied by the tool.
- Additions carry source, specification version and MR link. Vendor outputs hold only that vendor's released question rows and vendor-visible columns; internal columns, groups, links, mappings and cross-vendor suggestions stay in the internal outputs.
- Bad input (header, tab, field, unknown use case ID, a key in the use case name form, two export use cases with one ID, malformed CSV, secret-looking value) stops the run with exit status 1, names the file and line and writes no partial output.

## Must match the source

- The Tracker Data Contract's field classes, references, proposal and export formats.

## Need not match

- A direct integration with SharePoint, which is deferred.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Duplicate matching is heuristic.** It is deterministic and conservative, and uncertain matches always go to a lead.

## Strict proposal shape

- The proposal loader stops, naming file and line, on: a missing final line feed or more than one; a CRLF or lone CR; a byte order mark; a row with fewer or more than 12 fields (counted on the raw text, since short rows are padded today); a `record_key` whose form does not fit its tab; a date-typed `value` or `base_value` that is not `YYYY-MM-DD`; and, for a folder, a `proposal_id` that differs from the folder name.
- `validate <file-or-dir>` runs exactly these checks and needs no export. Exit codes and the output format are unchanged.
- Blank lines are not skipped silently in a way that shifts line numbers.
- Must not: change the CSV parser's tolerance for the export files, or add an exporter mode.
