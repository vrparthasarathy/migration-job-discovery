# Contract

## Contract

### Invocation

In VS Code agent mode, the skill `run-discovery` with a use-case folder path.

### Inputs

- The folder: the source, an optional `external_tools.md`, an optional `logic.md` and tagged documents.
- Asked once and never invented: the proposal ID (one per folder, shared by stages 1 to 3), the vendor and source location when absent, a recommendations proposal ID (one per session), the tracker export folder, the proposals root, the exporter path, the lead's name and today's date.

### Stages, in order

1. `propose-tracker-updates` in source-screening mode.
2. `discover-identity-access`.
3. `document-job-behavior`, then `propose-tracker-updates` in specification-update mode.
4. `recommend-workflows` over every specification processed so far, taken from the Use Cases rows of the proposals under the proposals root; the lead confirms the list.

Each stage rewrites only its own tabs in its own file. After stage 1 the skill reads the proposed `source_status`; `not-located` or `empty` skips stages 3 and 4 for the folder and says why.

### Exporter call and report

`node <exporter path>/src/main.ts export-review --export <dir> --proposals <root> --out <dir>`. On exit 1 the skill stops and shows the error. The report gives, per stage, what was proposed, skipped or blocked, then the exporter's counts including rejected proposal rows.

### Review walk

- Pending rows: blank `review_status`, or `changed_since_review` = `yes`, taken in the `order` column; the review columns are found through the headings file.
- Per row it shows the use case, the record, the kind, the current and proposed value per field with its state, the conflict, the suggestions, the evidence and the reason.
- Answers: accept, reject or clarify, with an optional comment. The skill edits only `review_status`, `reviewer`, `review_note` and `reviewed_on` of that row, with the lead's name and the date the lead gave. It sets `applied_on` only when the lead gives a date after applying by hand. After recording it reruns the exporter, which stops if a hand edit broke a file.

### Accept all

On the lead's request it records `accepted` for every row of that one use case whose kind is `add`, with no conflict and no held change, in the lead's name, in one step, then lists the rows it recorded and the rows it left.

### Prohibitions

As B08: it never writes to the tracker, releases a question, records an acknowledgement or a decision on its own, applies a change, edits a proposal file itself or edits another skill's output.

### Wording rules

No Craft term. `use case` names the business unit; `job` or `script` only the vendor's script; plain language.
