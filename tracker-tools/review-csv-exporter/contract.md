# Contract

## Contract

### Command

`node src/main.ts export-review --export <dir> --proposals <dir> [--scope <slug>] [--headings <file>] --out <dir>`

- `--proposals` is a root searched recursively for `tracker-updates/<proposal-id>/tracker-updates.csv`.
- `--export` is a tracker export with `manifest.csv`; an empty tracker is an export folder holding only `manifest.csv`.
- `--scope` defaults to `internal`. `--headings` defaults to `data/review-headings.csv` of the component.
- `--out` may not be, contain or sit inside an input.
- Exit 0 and the files on success, with counts per tab and per tier on standard output, and the reconciler's rejected proposal rows with their reasons (never fatal, never in the CSVs). Exit 1 with every finding as `file: line N: message` on standard error and nothing written. Exit 2 on bad usage. Files are written to temporary names and renamed only after everything validated.

### Output files

`review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv` and `review-mappings.csv` in `--out`. A tab with no rows still gets a header-only file, so a stale file is never left. No other file is written. No timestamp, run ID or absolute path appears in them.

### Headings file

`review-headings.csv`, header `tab,column,heading,band,visibility` (the sample workbook's `headings.csv` shape; only `tab`, `column` and `heading` are read).

- A row with a proposable tab (`Use Cases`, `Questions`, `Identity & Access`, `Mappings`) and a schema column name lists a shown field; fields are shown in file order.
- A row with tab `Review` maps a fixed key to its heading: `order`, `use_case`, `record`, `suggested_ref`, `record_key`, `kind`, `conflict`, `suggestions`, `other_changes`, `reason`, `evidence`, `proposals`, `content_digest`, `changed_since_review`, `review_status`, `reviewer`, `review_note`, `reviewed_on`, `applied_on`, and the suffix keys `suffix_current`, `suffix_proposed`, `suffix_state`. A required key must be present; a missing non-required key falls back to the key itself.
- A tab or column that is not in `tracker-schema.csv`, or a missing required key, stops the run.

### Wide row layout, in this order

1. `order`: global rank 1 to N across the four files.
2. `use_case`.
3. `record`: the central reference; blank for a new record.
4. `suggested_ref`: informational only, never identity.
5. `record_key`: the local reference.
6. `kind`: `add`, `update`, `suggestion` or `conflict`.
7. `conflict`: `<kind>: <detail>` entries, including held changes.
8. `suggestions`: link (with score and review), text-review and re-review entries.
9. For each field the headings file lists for the tab, three cells headed `<heading> (<suffix_current>)`, `(<suffix_proposed>)` and `(<suffix_state>)`. The state is `add`, `update`, `suggest`, `conflict` or `held`; a conflicting field shows both values.
10. `other_changes`: `field: current -> proposed [state]` entries for proposed fields not listed in the headings file, so nothing is dropped silently.
11. `reason`.
12. `evidence`: the unique `source` values.
13. `proposals`: the proposal IDs.
14. `content_digest`: sha256 of the content cells above.
15. `changed_since_review`: `yes` or blank.
16. The five review columns: `review_status`, `reviewer`, `review_note`, `reviewed_on`, `applied_on`.

### Identity, merge and ordering

- Identity is the central reference when the record exists in the export, else `new:<local_key>`. The same record in several proposals or folders is one row. The same field proposed twice with the same value is one field entry with both proposal IDs.
- Tier 1: a record with a conflict or a held change. Tier 2: a record with suggestions for the lead's fields (human-field suggestions, link, text-review or re-review). Tier 3: plain evidence-backed adds and plain specification updates. Within a tier: use case name, then tab order (Use Cases, Questions, Identity & Access, Mappings), then record.
- A record that matches the export yields no row.

### Preserving review

- Existing `review-*.csv` files in `--out` are read before writing. A row is matched by (tab, identity). Its five review cells are copied. When the stored `content_digest` differs from the new one and a review cell is filled, the review cells are kept and `changed_since_review` is `yes`.
- A row that no longer appears (it now matches the export, or its proposal is gone) is dropped with its review cells; the tracker is then the record.
- A review cell that is not valid (`review_status` outside the list) or that looks like a secret stops the run.

### Input validation and secrets

The reconciler's findings for a bad header, tab, field, operation, `update_id`, unknown use case name or CSV shape are reported as `file: line N: message`, plus a bad headings file, a bad review file, a secret-looking value anywhere and a bad `--out`.
