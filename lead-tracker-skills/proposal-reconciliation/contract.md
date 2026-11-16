# Contract

## Contract

Planned, not built. This is the specification the builder turns into the skill folder.

### Invocation

In VS Code agent mode, the skill `reconcile-tracker`.

### Inputs

The tracker export folder (one CSV per tab plus `manifest.csv`), the proposals root (the folder holding the `tracker-updates` folders), an optional scope (the manifest row used for the stale check, default `internal`), an output folder, and optionally the proposal folders and the vendors to process.

### Outputs

The same names and shapes as the Tracker Reconciler's contract: `reconciliation-report.md`, `additions/<tab>.csv`, `field-updates.csv`, `conflicts.csv`, `suggestions.csv` and `vendor/<slug>/` (the vendor view of the export and a `field-updates.csv` of the non-held spec updates for the visible rows and columns).

### Procedure

1. Validate the manifest, the schema headings and the proposal headers, and scan for secret-looking values with the pattern list in `tracker-table-rules.md`; stop on any problem.
2. Count the rows of each proposal file and each export tab.
3. Compute the highest reference of each prefix by reading the reference columns only.
4. Chunk by use case: group the proposal rows by use case, sorted by proposal path and then by `update_id`.
5. Classify each row in this order: reject, reflected, spec or human field, conflict, held, addition.
6. Do the cross-use-case checks separately: proposal disagreement, holds from blocking questions, and link candidates from a shortlist of questions of the same use case or vendor.
7. Tally: rows in = additions + field updates + conflicts + held + suggestions + rejected + reflected; on a mismatch stop and name it.
8. Write the files with the count line first.
9. Vendor folders are a separate pass per named vendor, followed by the vendor-safe self-check that re-reads the written files.

### Self-checks

The tally, no secret value written, and the vendor-safe self-check of each vendor folder.

### Folder

`SKILL.md` and `tracker-table-rules.md` (the master copy: CSV rules, reference format and widths, working-day arithmetic, vendor projection steps, the secret pattern list and the link scoring), byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv`, `golden/<case>/{inputs,expected}/` and `golden/COMPARE.md`. No Craft file name, command or term appears in the skill folder.

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
