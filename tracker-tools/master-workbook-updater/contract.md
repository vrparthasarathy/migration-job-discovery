# Contract

## Contract

### Command

```
node src/main.ts update-master-workbook
  ( --master <downloaded-master.xlsx> | --from-export <dir> )   exactly one base
  --out <new-master.xlsx> --report <report.md>
  [--reviews <dir> [--headings <file>]]
  [--vendor <vendor>=<downloaded-vendor.xlsx>]...   sync, then rebuild that vendor
  [--new-vendor <vendor>]...                        build from the master, no sync (first release)
  [--vendor-out <dir>]                              required when a vendor is named; writes <dir>/<vendor>.xlsx
  [--run-date <YYYY-MM-DD>] [--holidays <file>] [--columns <file>]
```

- `--from-export` takes the Tracker Data Contract's export folder (a CSV per tab plus `manifest.csv`), read through the Tracker Reconciler's loader; it bootstraps the first master.
- `--reviews` holds the four exporter files, `review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv` and `review-mappings.csv`; `--headings` is the file the exporter used and defaults to the exporter's.
- `--run-date` is the only clock input and defaults to today, supplied by the adapter. Holidays come from the master's Holidays sheet, else `--holidays`, else none.
- Exit 0 done; exit 1 any input problem, every finding as `file: line N: message`, nothing written; exit 2 bad usage. Conflicts, skips and held vendor workbooks are not errors.
- `--out`, `--report` and every vendor output must differ from each other and from every input file and must not be a folder; a violation is an input problem. Every output is written to a temporary name and renamed, the review files last.

### Inputs

- **Master workbook.** Sheets read: Use Cases, Questions, Identity & Access, Workflow Mappings, Question Groups, Question Links, Batches and Holidays. The header is in row 1 or 2, by the sample heading or the schema column name. Columns outside the schema and headings are extra lead columns, kept as values at the right. A formula cell gives its result; an extra column of formulas is dropped and listed. `review_state`, `days_past_original_due` and `age_awaiting_review` are ignored and recomputed, and `pending_change` is ignored and not kept. The Holidays sheet is one column headed `holiday`, one ISO date per row. A secret-looking value, a duplicate or blank key, an error cell or a schema error stops the run.
- **Review CSVs.** Read as the Vendor Workbook Updater does: exact exporter header, digest recomputed, statuses checked, secrets stop the run.
- **Vendor workbooks.** Read with the Updater's strict reader. A `--vendor` name must appear in the master's Use Cases `vendor` column and in every row of its file.

### Decision order

For each review row, on every tab:

1. **Scope.** A record is found by its central reference; a new question or access row finds its use case by name.
2. Only `accepted` goes on; blank, `rejected` and `clarify` are listed as skipped.
3. **Conflict** (the whole row left alone and listed): `changed_since_review` is `yes`; a field is `held` or `conflict` or the `conflict` cell is filled; the digest does not match; a field's `current` differs from the master cell (trimmed, newlines normalized); an `other_changes` entry cannot be read; the use case name matches more than one master row.
4. Fields with state `add`, `update` or `suggest` apply when their schema owner is `spec` or `human`, including internal columns and every readable `other_changes` entry. Forbidden fields (`released_on`, `batch_ref`, answers, acknowledgements, `ticket_ref`, `verification`, decision fields) and computed fields (`due_on`) are never applied and are listed. A value outside the schema's list, date or reference format stops the run.
5. A new record takes `suggested_ref`; a blank or malformed ref, or one that collides with the master or earlier in the run, stops the run. A new question takes `captured_on` = the run date and `status` `captured`, left unreleased; a new use case takes its name from the `use_case` cell.
6. The row's proposal IDs are appended verbatim to `proposal_refs`; a changed row's `last_updated` is the run date.
7. `applied_on` already set: skipped, and listed under "marked applied, not in the master" when its proposed values are not in the master; the lead clears the cell to re-apply.

**`other_changes`** is `field: current -> proposed [state]`, entries joined by ` | `. An entry is accepted only when the field is a column of the tab, the state is valid, there is exactly one ` -> ` and a single proposed value; anything else makes the row a conflict (re-export with a headings file that shows the field as cells).

### Vendor sync

Per matched row (by `question_ref`, `use_case_ref` or `access_ref`), vendor-owned columns only (the Updater's `data/vendor-edited.csv`):

- same value: no change; master blank and vendor filled: copy;
- both filled and different: copy and list as an update, unless the question's `status` is resolved (`accepted`, `incorporated`, `closed`, `withdrawn`, `superseded`), which is a conflict;
- vendor blank and master filled: conflict, never cleared;
- also a conflict, with nothing copied for the row: the vendor value is off the schema list or not a date; the master row belongs to another vendor; the master question is unreleased;
- `status`, `resolver`, `closed_reason` and every other lead column are never touched; nothing is copied to another row;
- a vendor row absent from the rebuilt view (no master row, another vendor's row, or unreleased) is listed with its vendor-owned values and that vendor's workbook is **held**, not rebuilt.

### Outputs

- **New master**, sample layout: sheets Read Me, Use Cases, Questions, Identity & Access, Workflow Mappings, Question Groups, Question Links, Batches, Holidays and Lists. Headings and bands from the sample's `headings.csv` where it has them and schema names elsewhere; every schema column is kept, with `proposal_refs`, `source_links`, `evidence_refs`, `mr_link` and `last_updated` in a trailing band, then the lead's extra columns. Blue and grey headers by visibility, red internal tabs, enum dropdowns on Lists, no sheet protection, nothing hidden, values only, fixed zip times.
- **Vendor workbooks**, one per named vendor, in the Updater's vendor-safe format built by its writer: that vendor's rows, vendor-visible columns, released questions, `due_on` filled as release plus two working days where blank (a differing stored value is listed, not changed), rows in master order, `evidence_refs` dropped because the sample headings omit it.
- **Report**, Markdown, marked internal, no absolute paths and no secret value. Sections: run facts; applied rows with old and new values; skipped rows with reasons; conflicts with causes; marked applied but not in the master; vendor values synced; sync conflicts; vendor rows held; master rows added to each vendor workbook; fields not applied; extra columns carried or dropped; files written.
- **Review CSVs**: only `applied_on` of the rows this run applied, rewritten last through the library's CSV writer.

### Planned: use case ID matching

Planned, not built; these replace the matching text above when built (Decision order items 1, 3 and 5, and one bullet of Inputs).

- **Review CSVs** (added to the Inputs bullet). The `use_case` cell is blank or a use case ID `uc-<vendor-slug>-<use-case-slug>`; any other text, including the use case name or the slug alone, stops the run with `file: line N: message` naming the expected form.
- **Decision order, item 1.** Scope. A record is found by its central reference; a new question, access or mapping row finds its use case by the ID in its `use_case` cell, matched against the ID derived from each master Use Cases row's `vendor` and `use_case_name`. An ID that is not in the master but is a new use case row of the review files is skipped as "not in the master"; an ID that is in neither stops the run.
- **Decision order, item 3.** Conflict (the whole row left alone and listed): `changed_since_review` is `yes`; a field is `held` or `conflict` or the `conflict` cell is filled; the digest does not match; a field's `current` differs from the master cell (trimmed, newlines normalized); an `other_changes` entry cannot be read; the use case ID matches more than one master row; a new use case has no name or no vendor, or its ID differs from its `use_case` cell or already exists in the master.
- **Decision order, item 5.** A new record takes `suggested_ref`; a blank or malformed ref, or one that collides with the master or earlier in the run, stops the run. A new question takes `captured_on` = the run date and `status` `captured`, left unreleased, with `use_case_ref`, `use_case_name` and `vendor` from its use case; a new access row takes `use_case_ref` and `vendor` and a new mapping `use_case_ref` the same way; a new use case takes its `use_case_name` from the proposed field.
