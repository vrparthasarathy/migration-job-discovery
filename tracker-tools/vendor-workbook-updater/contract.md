# Contract

## Contract

### Command

`node src/main.ts update-vendor-workbook --workbook <downloaded.xlsx> --reviews <dir> --export <dir> --vendor <vendor> --out <updated.xlsx> --report <report.md> [--release-batch <ref> --release-date <YYYY-MM-DD>] [--run-date <YYYY-MM-DD>] [--holidays <file>] [--headings <file>] [--columns <file>]`

- `--workbook` is the vendor workbook downloaded from SharePoint. It is only read.
- `--reviews` holds `review-use-cases.csv`, `review-questions.csv` and `review-identity-access.csv` of the Review CSV Exporter. `review-mappings.csv` is never read, validated or written.
- `--export` is a tracker export with `manifest.csv`, as the exporter takes it. `--vendor` must appear in its Use Cases `vendor` column.
- `--release-batch` and `--release-date` come as a pair; one without the other is a usage error. The batch is a reference and the date is valid. If the export holds the batch, its vendor is `--vendor` and its `released_on`, if set, equals the date.
- `--run-date` defaults to today's date, supplied by the adapter. It is the only clock input (`applied_on`, document properties, Read Me); tests pass it.
- `--headings` defaults to the exporter's `data/review-headings.csv` and must be the file the exporter used. `--columns` defaults to the sample's `data/headings.csv`. `--holidays` is one `YYYY-MM-DD` per line, default none.
- `--out` and `--report` differ from each other and from every input file, do not sit inside `--export` and are not folders; otherwise exit 1 as an input problem. Their parent folders are created at write time.
- Exit 0 and the files on success. Exit 1 with every finding as `file: line N: message` on standard error (for the workbook, N is the sheet row and the message names the sheet), and nothing written. Exit 2 on bad usage. Conflicts, skips and pending items are not errors.

### Inputs

- **Workbook.** Only Use Cases, Questions and Identity & Access are read; Read Me, Lists, hidden sheets, comments and other sheets are ignored and never reach the output. The header row is the first of rows 1 and 2 holding the tab's key heading, and a heading may be the sample heading or the schema column name. A header that is not a vendor column, a secret-looking value, a blank reference on a non-empty row, a duplicate reference, an error cell or a `vendor` that is not `--vendor` stops the run. Cell values become trimmed strings (a date as `YYYY-MM-DD`, a hyperlink as its text, a formula as its result). Empty rows are skipped and row order is kept.
- **Review CSVs.** The header equals the exporter's full header exactly. Used: `record`, `record_key`, `suggested_ref`, `use_case`, `kind`, `conflict`, `content_digest`, `changed_since_review`, `review_status`, `applied_on`, the three cells per shown field (current, proposed, state) and `other_changes` (listed only). `review_status` is in the exporter's list, `reviewed_on` and `applied_on` are blank or ISO, `order` is a whole number, each field state is blank, `add`, `update`, `suggest`, `held` or `conflict`, a secret-looking value anywhere stops the run, and a duplicate identity stops the run. The three files must exist. The `use_case` cell is blank or a use case ID `uc-<vendor-slug>-<use-case-slug>`; any other text, including the use case name or the slug alone, stops the run with `file: line N: message` naming the expected form. The cell holds the ID derived from the row's vendor and use case name, never a stored value.
- **Identity.** `record` when not blank, else `new:<record_key>`. An existing record maps to its workbook row by the reference column. A `new:` record becomes a new row whose reference is `suggested_ref`. A new question or access row finds its use case by the ID in its `use_case` cell: the ID derived from each workbook Use Cases row's `vendor` and `use_case_name` (two workbook rows with one ID stop the run), which includes an accepted new use case of the same run. An ID that is only in the export, or is a new use case of this vendor that is not accepted, is this vendor's but missing from the workbook (skipped and listed); an ID of another vendor, in the export or among the new use case rows of the review files, is counted; an ID that is in none of them stops the run. A new use case needs a proposed `vendor` equal to `--vendor` (another vendor's is counted, none is skipped and listed) and a proposed `use_case_name` (none is skipped and listed); the ID derived from them must equal its `use_case` cell and must not already exist in the workbook or earlier in the run, or the run stops. Its `use_case_name` is the proposed field, and a new question or access row takes `use_case_ref`, `use_case_name` and `vendor` from the matched workbook row.

### Field classification

A field is applicable when its schema visibility is `V`, its owner is `spec` or `human`, it is a column of the vendor sheet and it is not in `data/vendor-edited.csv`. `data/vendor-edited.csv` (`tab,column`, checked against the schema) lists the vendor-owned columns: `answer`, `answer_status`, `answered_on`, `answered_by`; `acknowledged_version`, `acknowledged_on`, `acknowledgement_reference`; `vendor_action_owner`, `additional_requirements`. `released_on` and `due_on` are protected in code: a review row never sets them, and only a release gives a new question its dates. Any other field is left for the internal tracker or not applicable, and is listed.

### Decision order per review row

1. Scope to the vendor, for every row: another vendor's row is counted and nothing else; an unknown record, a master row missing from the workbook, a use case that is not in the workbook or a new use case with no vendor or name is skipped with a reason (a row that is not accepted is listed as skipped with its status first); an unknown use case ID stops the run.
2. Only `accepted` rows go on; a blank, `rejected` or `clarify` row is listed as skipped.
3. `applied_on` set: skip as already applied, or list a conflict when `changed_since_review` is `yes`.
4. Conflict (nothing applied, nothing marked) when `changed_since_review` is `yes`, a field state is `conflict` or `held`, the `conflict` cell is not empty, or the recomputed digest differs from `content_digest`.
5. The row's internal-column values, its `other_changes` and its vendor-visible fields that cannot be applied are recorded for the report.
6. Existing record: each applicable field's current cell must equal the workbook cell (trimmed, newlines normalized), else the whole row is a conflict; then fields with state `add`, `update` or `suggest` are set, an equal value is a no-op, and a value outside the schema's list, date or reference format stops the run.
7. New record: a question needs a release, else it is pending and listed; `suggested_ref` must be a reference and must not collide with the export, the workbook or other new rows of the run, else the run stops; a new question adds `use_case_ref`, `use_case_name` and `vendor` from the matched workbook row, `batch_ref`, `released_on`, `due_on` and `answer_status` `not-answered`; a new access row adds `use_case_ref`, `use_case_name` and `vendor` the same way; a new use case adds the proposed `use_case_name`.
8. A row is applied only when a cell changed or a row was added; otherwise it is skipped as a no-change row.

Rows are decided tab by tab (Use Cases, Questions, Identity & Access) in review `order`, so a new use case exists before its new questions.

### Outputs

- **Workbook** (`--out`): sheets Read Me (vendor facts only: the vendor, the run date, the sheets and the colour key), Use Cases, Questions, Identity & Access and Lists, nothing hidden. Row 1 is the group band, row 2 an Excel table header, and column order, headings and bands come from `--columns`. Lists holds only the lists of columns present, with stop-alert dropdowns. Vendor-edited columns have a distinct (orange) header and unlocked cells; other cells are locked with sheet protection and no password. No comments, hyperlinks or external links. Document properties are fixed and generic. Rows are the downloaded rows in order, then new rows by tab and review `order`; downloaded dates are written back as dates. A tab with no rows still has a table with one blank row. The zip entry times are fixed (1980-01-01), so the bytes do not depend on the clock.
- **Report** (`--report`, Markdown, marked internal, no absolute paths, no secret values): the run (base names, vendor, run date, release or none); applied rows with assigned references and each field's old and new value; skipped rows with reason and counts; conflicts with the cause; pending question releases; accepted internal-column values and `other_changes` left for the internal tracker (for every in-scope accepted row that is not a conflict); fields not applied (vendor-owned, forbidden, computed or not shown); a note that `review-mappings.csv` was ignored.
- **Review CSVs**: only the `applied_on` cell of applied rows changes, with the run date. A file with no applied row is not rewritten; a rewritten file is normalized by the library's CSV writer.

### Writing

All inputs are read and validated and every decision is computed before any write. The workbook, report and changed CSVs are written to temporary names beside their targets, then renamed (workbook, report, CSVs last); a failure removes the temporary files. If a rename fails partway, a rerun rebuilds from the downloaded copy and re-applies rows not yet marked.
