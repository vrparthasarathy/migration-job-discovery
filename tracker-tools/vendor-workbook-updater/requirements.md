# Requirements: Vendor Workbook Updater

The shared rules are in the [root requirements](../../requirements.md#requirements) and the [Tracker Tools requirements](../requirements.md#requirements).

## Requirements

- Goal: apply the review rows a lead accepted to one vendor's vendor-facing workbook, so the lead no longer copies accepted values by hand. The tool writes a new workbook in the repository, the lead checks it and uploads it to SharePoint by hand.
- The starting point is the vendor workbook **downloaded from SharePoint**: vendors edit answers, answer status and acknowledgements there, so it is the only up-to-date copy. The tool never starts from an older repository copy, never opens the input for writing and writes a new file.
- The tool rebuilds the whole workbook from the downloaded copy's rows plus the applied changes, in the Sample Tracker Workbook's format. Formatting a vendor added is not kept.
- The workbook is vendor-safe: that vendor's rows and vendor-visible columns only, on Use Cases, Questions and Identity & Access, a visible Lists sheet and a vendor-only Read Me. No internal column, Mappings, other vendor, hidden sheet or column, comment or link to the master. The Tracker Data Contract's vendor-view rule governs.
- Only rows with `review_status` `accepted` apply. A question row never reaches the vendor without a release the lead names in the command (batch and date); the tool never releases anything on its own. `due_on` is release plus two working days, from Tracker Tables.
- Vendor-owned cells and the release and due dates of existing rows never change. A value that differs from the review row's current value, a row changed since review, a conflict or a held field is listed and not applied.
- A new record takes the exporter's suggested reference; a collision stops the run. A new question row starts with `answer_status` `not-answered`.
- Repeat-safe: a row with `applied_on` set and an unchanged digest is skipped, and the same inputs and run date give a byte-identical workbook and report with no duplicate rows. The run date is the only clock input.
- After a successful run, `applied_on` is set (the run date) on applied rows in the review CSVs, and nothing is written when any step fails. A row applies when a cell changed or a row was added, so an internal-only or no-change row gets no `applied_on`.
- Input problems and secret-looking values stop the run with `file: line N: message` and write nothing. Conflicts, skips and pending items are reported with exit 0. An output path that is an input, inside the export or a folder is an input problem.
- Reuse by relative path, none changed: Tracker Tables, the Tracker Reconciler's `inputs` and `secrets`, the Review CSV Exporter's `headings`, `rows` and `review`, and only `layout.ts` and `headings.csv` of the Sample Tracker Workbook.

## Must match the source

- `tracker-schema.csv` and the vendor-view and update rules of the Tracker Data Contract, read at run time; no column list is repeated in code.
- The exporter's review CSV header, content digest and statuses, and its reference scheme and suggested references.
- The due-date rule of Tracker Tables.

## Need not match

- Formatting a vendor added to the downloaded copy, SharePoint, the internal tracker and the internal workbook, a Holidays sheet (`due_on` is a value), or the optional `same as` shortcut.

## Technology

- Inherited from Tracker Tools: Node 26 with native TypeScript (erasable syntax, `.ts` import extensions) and `node:test` with real temporary directories. One departure, as in the Sample Tracker Workbook: the exact-pinned dependency `exceljs` 4.4.0 reads and writes `.xlsx` (component-local `package.json` and lockfile; `npm ci` is the `install` check). Built-ins only otherwise (`node:crypto` through the exporter's digest; the zip entry times are fixed with `Buffer` writes, because `exceljs` stamps them from the clock). `src/main.ts` is the adapter excluded from coverage by the group's `adapterGlob`.
- The group's Technology line and requirements name `exceljs` as an exception for the sample only; the group's owner reconciles that and the new member (recorded as a request in the task narrative).

## Depends on

- Tracker Data Contract, Tracker Tables, Tracker Reconciler, Review CSV Exporter and Sample Tracker Workbook, read-only.

## Follow-on work (recorded, not built)

- The internal tracker apply: accepted internal-column values and `other_changes` are listed in the report for now (backlog item `internal-tracker-apply`).
- Refreshing `acknowledgement_requested_on` from the export, adding master rows missing from the workbook, widening the headings for vendor fields now only in `other_changes`, and uploading to SharePoint.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
