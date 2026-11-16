# Contract

## Contract

Planned, not built. This is the specification the builder turns into the skill folder.

### Invocation

In VS Code agent mode, the skill `update-vendor-workbook`.

### Inputs

The vendor's downloaded workbook exported by the lead as one CSV per sheet (the header is the first of rows 1 and 2 holding the tab's key heading), the three review CSVs (`review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv`; `review-mappings.csv` is never read), a tracker export with `manifest.csv`, the vendor, optionally a release batch and date as a pair, optionally a holidays file, and an output folder.

### Outputs

Per-tab CSVs of the vendor-safe sheets, `vendor-update-report.md` (applied rows with each field's old and new value, skipped rows with reasons and counts, conflicts with the cause, pending question releases, accepted internal values and `other_changes` left for the internal tracker, fields not applied, and the lead checklist), and, after the lead's confirmation, the `applied_on` cells of the review CSVs. No `.xlsx` is written.

### Procedure

1. Validate the sheet headings against `vendor-columns.csv`, the review headings against the sibling `export-review/review-headings.csv`, the references and the secret patterns; stop on any problem.
2. Scope each review row to the vendor; other vendors' rows are counted, never applied.
3. Apply the decision order of the Vendor Workbook Updater per accepted row: already applied, conflict, existing record (each field's current cell must equal the sheet's cell), new record (a question needs a release, else it is pending; the reference is the suggested one and must not collide).
4. Process one tab at a time in review `order`, in chunks of one use case.
5. Write the three CSVs and the report.
6. Run the mandatory vendor-safe self-check as a separate pass that re-reads the written files, not memory: every header is a vendor column of its tab, every row's vendor is the vendor, every question row has `released_on`, no reference points to a row that is not visible, no cell holds a group, link or mapping marker, no other vendor's name from the export appears, no secret pattern appears, and the rows written equal the rows downloaded plus the rows added.
7. On a failed check write nothing further, delete nothing and name the check.
8. Print the lead checklist in the report, the same checks to eyeball before pasting and uploading.
9. After the lead confirms the paste, set `applied_on` on the applied rows of the review CSVs, written together or not at all.

### Self-checks

The vendor-safe self-check as a separate re-read pass, the rows-written tally, and the lead's checklist before upload.

### Folder

`SKILL.md` and `vendor-edited.csv` (a byte copy of the Vendor Workbook Updater's data file listing the vendor-owned columns), `vendor-columns.csv` (the vendor-visible columns of the three tabs with their headings and bands, from the Sample Tracker Workbook's headings file), `vendor-safe-checklist.md` (the lead-facing checklist and report template), `tracker-table-rules.md` (a byte copy), byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv`, `golden/<case>/{inputs,expected}/` and `golden/COMPARE.md`. No Craft file name, command or term appears in the skill folder.

### Rules in every `SKILL.md`

- Work only from the files the lead names; never read secret or credential files.
- Write only the named outputs; never write into the tracker, SharePoint or any input file.
- Never invent a row, a reference, a value, a date or a name.
- Stop with a named error, one `file: line N: message` per problem, and write nothing.
- Ask the lead for the run date and name when needed; never take them from the environment.
- Put a count line at the top of every output (rows in = rows classified).

### Stop errors

One line per problem, `file: line N: message`, naming the file and the row; the skill writes nothing and says which input to fix. A tally that does not match, a heading that differs from the schema or the headings file, a status outside its list, a secret-looking value, a reference collision and a missing sibling file are all stop errors.

### Wording rules

`use case` names the business unit; `job` or `script` only the vendor's script; plain language; no secret value in any output.
