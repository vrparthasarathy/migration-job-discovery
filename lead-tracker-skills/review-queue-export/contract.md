# Contract

## Contract

Planned, not built. This is the specification the builder turns into the skill folder.

### Invocation

In VS Code agent mode, the skill `export-review`.

### Inputs

The reconciliation output folder of `reconcile-tracker`, the proposals root, the tracker export folder, an output folder that may hold earlier `review-*.csv` files, and optionally a list of use cases for a scoped refresh. A `check review files` mode validates the review files without refreshing.

### Outputs

The four review CSVs with the same headings, keys, tiers and `order` column as the Review CSV Exporter, so `run-discovery` and `update-vendor-workbook` read them unchanged. The reconciliation files are read, not re-derived.

### Procedure

1. Read the reconciliation outputs (additions, field updates, conflicts, suggestions), not the whole export.
2. Map each `update_id` back to its proposal row, which gives the source, reason, proposal ID and use case.
3. Build one record per tab and identity; the strongest field state wins in the order add, update, suggest, held, conflict.
4. Read the export only for the existence test and the current values of conflict and held fields.
5. Assign the tier and kind, sort, and number `order` across the four files.
6. Merge the earlier review cells by tab and identity, comparing the previous row's content cells with the new ones to set `changed_since_review`.
7. Tally: the field entries equal the entries of the four reconciliation files.
8. Write the four files with the count line first.

### Self-checks

The tally of field entries, the heading check against `review-headings.csv`, and no secret value written.

### Folder

`SKILL.md` and `review-headings.csv` (a byte copy of the Review CSV Exporter's `data/review-headings.csv`, kept here as the single owner in skill form), `tracker-table-rules.md`, byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv`, `golden/<case>/{inputs,expected}/` and `golden/COMPARE.md`. No Craft file name, command or term appears in the skill folder.

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
