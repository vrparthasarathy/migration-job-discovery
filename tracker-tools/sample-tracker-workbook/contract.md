# Contract

## Contract

### Command

`node src/main.ts generate --out <file.xlsx> --as-of <YYYY-MM-DD> [--data <folder>]`. `--data` names another folder of the same CSV files (the default is `data/`); the tests use it to try invalid data. Exit 0 and the file on success. Exit 1 with every finding on standard error and no file on invalid data. Exit 2 on bad usage. The file is written to a temporary name and renamed.

### Data files (`data/`)

- `use-cases.csv`, `questions.csv`, `identity-access.csv`, `mappings.csv`: every column of the matching tab in `tracker-schema.csv`, validated with the Tracker Tables library.
- `proposed-changes.csv`: `change_ref` (`PC-###`), `tab`, `record_ref`, `field`, `operation`, `current_value`, `proposed_value`, `reason`, `review_status`, `reviewer`, then the technical `proposal_id`, `update_id`, `base_value`, `source`, `mr_link`, `author`, `created_on`.
- `trace.csv`: `tab`, `record_ref`, `kind` (proposal, specification, evidence, source, merge-request), `reference`. The Trace sheet is these rows plus one row for every value of `proposal_refs`, `source_links`, `evidence_refs` and `mr_link` in the four contract files, without duplicates.
- `headings.csv`: `tab`, `column`, `heading`, `band`, `visibility` (`V` or `I`) for every sheet with a table, including Proposed Changes and Trace and the added `Pending change`, `Review state`, `Days past original due` and `Age awaiting review`. It sets the column order. Every schema column of a main tab has a heading except `proposal_refs`, `source_links`, `evidence_refs`, `mr_link` and `last_updated`.

### Sheets, in order

Read Me, Use Cases, Questions, Identity & Access, Workflow Mappings, Proposed Changes, Trace, Lists. Main sheets: row 1 column-group band, row 2 Excel table header, blue header for a vendor-visible column and grey for an internal one, tab colour red for Workflow Mappings, Proposed Changes and Trace. Docs refer to a column as `` `Sheet > Heading` ``.

### Differences from the tracker contract

1. Adds Read Me, Proposed Changes and Trace; renames Mappings to Workflow Mappings; omits Question Groups, Question Links, Batches and Holidays (`batch_ref` and `released_on` stay on Questions).
2. Row 1 holds a group band and headings are friendly; schema names appear only in the Read Me column dictionary (the layout guide says headings are exactly the schema names).
3. `due_on`, review state, days past original due and age awaiting review are values at the as-of date, not `WORKDAY` and `TODAY` formulas; the guide's helpers `overdue`, `follow_up`, `awaiting_review` and `age_days` become these columns.
4. A `Pending change` column on Use Cases, Questions and Identity & Access is not a schema column.
5. `proposal_refs`, `source_links`, `evidence_refs` and `mr_link` move to Trace and `last_updated` is dropped from main sheets.
6. Proposed Changes reshapes the one-row-per-field proposal file into one readable row per change, keeping `update_id`, `proposal_id`, `base_value` and `source`.
7. Blue and grey headers and red tabs are added.
8. One workbook mixes vendor and internal columns, where the contract has a master and separate vendor workbooks; it is not vendor-safe.

### Planned: review sheets and composed IDs

Planned, not built; merged into the sections above when built.

- **Data files.** `data/proposed-changes.csv` is removed. Added: `data/proposals/<proposal-id>/tracker-updates.csv` (the contract's long proposal format, composed `update_id`, `proposal_id` of the form `uc-<vendor-slug>-<use-case-slug>`), `data/review-decisions.csv` (`record`, `review_status`, `reviewer`, `review_note`, `reviewed_on`) and `data/review-headings.csv` (the exporter's headings file shape with friendly headings). `trace.csv` keeps the proposal and update IDs.
- **Sheets.** The order becomes Read Me, Use Cases, Questions, Identity & Access, Workflow Mappings, Review - Use Cases, Review - Questions, Review - Identity & Access, Trace, Lists. The Review sheets are internal (red tabs) and hold exactly the exporter's columns for the tab, loaded from its review CSV.
- **Dropdown.** `review_status` takes the exporter's list: blank, accepted, rejected, clarify.
- **Differences from the tracker contract** (replaces item 6): the Review sheets show one wide row per record in the exporter's format instead of a separate Proposed Changes sheet, and proposal metadata sits on Trace and the Review sheets.
