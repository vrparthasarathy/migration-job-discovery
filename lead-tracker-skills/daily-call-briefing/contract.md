# Contract

## Contract

Planned, not built. This is the specification the builder turns into the skill folder.

### Invocation

In VS Code agent mode, the skill `summarize-tracker`.

### Inputs

The tracker export folder, the run date (asked of the lead), an optional holidays file (one `YYYY-MM-DD` per line), and an output file.

### Outputs

One Markdown file with the same section headings and order as the Tracker Summary's output, starting with the `INTERNAL` line.

### Procedure

1. Validate the export files, columns and statuses against the schema lists; stop on any problem.
2. Count the rows of each tab.
3. Build one section at a time, each from one pass over one tab: Use Cases for the stage counts, source blockers and unassigned items; Questions for the overdue and awaiting-review rows; Identity & Access for the signals; Mappings for the decisions; Batches and capacity for the next batches.
4. Compute due dates and working days by the rules in `tracker-table-rules.md`.
5. Sort as the Tracker Summary does: owner with `unassigned` last, then due date, then reference.
6. Check that every released question row is counted exactly once.
7. Write the file with a count line at the top of each section.

### Self-checks

The count line of each section and the once-only check of question rows.

### Folder

`SKILL.md` and `tracker-table-rules.md` (a byte copy of the master in `reconcile-tracker`), byte-identical copies of `tracker-data-contract.md` and `tracker-schema.csv`, `golden/<case>/{inputs,expected}/` and `golden/COMPARE.md`. No Craft file name, command or term appears in the skill folder.

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
