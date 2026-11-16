# Contract

## Contract

Planned, not built. The rules every skill folder in the group follows; each skill's own contract has the rest.

- **Skill folders.** `<component>/<skill>/` holds `SKILL.md` (front matter `name` equal to the folder name, a description with trigger phrases, `user-invocable: true`), the contract and schema copies, `tracker-table-rules.md`, the skill's own templates and `golden/`.
- **Copies.** `tracker-data-contract.md` and `tracker-schema.csv` are byte-identical to the Tracker Data Contract's files; `tracker-table-rules.md` is byte-identical to the master in `proposal-reconciliation/reconcile-tracker/`. Golden fixtures hold no file named `tracker-schema.csv` or `tracker-data-contract.md`.
- **Chain.** `reconcile-tracker` writes its files; `export-review` reads them; `update-vendor-workbook` reads the review CSVs and the headings file of `export-review/`; `summarize-tracker` reads only the tracker export.
- **Rules in every `SKILL.md`.** Work only from the files the lead names; never read secret or credential files; Write only the named outputs; never write into the tracker, SharePoint or any input file; Never invent a row, a reference, a value, a date or a name; Stop with a named error, one `file: line N: message` per problem, and write nothing; Ask the lead for the run date and name when needed; never take them from the environment; Put a count line at the top of every output (rows in = rows classified).
