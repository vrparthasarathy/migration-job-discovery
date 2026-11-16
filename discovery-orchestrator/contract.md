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

### Planned: use case index, derived proposal ID and fixed recommendations ID

Planned, not built. When built, this section replaces the proposal ID and recommendations ID wording in Inputs, the list wording in Stages (4) and is merged into the sections above.

- **File.** `use-case-index.csv` at the repository root. UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting, LF line ends, one header row, exactly `use_case_name,slug,vendor,folder,spec`. Rows are sorted by `folder`.
- **Columns.** `use_case_name`: the name exactly as the folder or specification writes it. `slug`: the use case slug. `vendor`: the vendor as read from the folder, not a slug. `folder`: the folder path relative to the repository root, `/` separators, no leading `./`, no trailing `/`. `spec`: the root-relative path of the specification file, blank until stage 3 has written it.
- **Slug rule.** Lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed; the same rule as the reconciler's and the proposer's use case slug. An empty slug stops the run.
- **Proposal ID.** `uc-<slug of the vendor>-<slug>`. The `uc-` prefix keeps it clear of the fixed recommendations ID, and it has no colon, so the composed `update_id` stays valid. The skill derives it; it never asks for it and never invents a suffix.
- **Duplicate rule.** The derived ID is compared with the derived ID of every other row. A match in a different `folder` stops the run before any stage and writes nothing; the message names both folders and says the lead must rename one.
- **Create and update.** The key is `folder`. The same folder updates its row in place (a rerun); a new folder adds a row. A moved folder (the ID matches a row whose old `folder` no longer exists) updates `folder` and `spec` and the report says so; if the old folder still exists it is a duplicate.
- **When written.** After the duplicate check at the start of a folder (stage 1 needs the ID); `spec` after stage 3. A folder skipped for `not-located` or `empty` keeps a blank `spec`.
- **Who writes.** Only this skill, only its own row, never by hand; no other skill writes the file.
- **Repository root.** Asked once per session, never guessed; each folder must sit under it, otherwise the run stops.
- **Export step.** Planned with the Lead Tracker Skills: in place of `node <exporter path>/src/main.ts export-review ...` the skill runs `reconcile-tracker` (proposals root and export folder to a reconciliation folder) and then `export-review` (reconciliation folder, proposals root and export to the review folder). It asks once for the two folders and no longer for an exporter path or Node. If either skill stops it shows the error unchanged. The review columns are read from `export-review/review-headings.csv` in the sibling skill folder. After recording a decision it runs `export-review` in check mode, not a full rerun.
- **Fixed recommendations ID.** `recommendations`, so the recommender writes `tracker-updates/recommendations/tracker-updates.csv`. The skill never asks for it. Before stage 4 it shows the list (every index row) once with the warning that a partial list drops the other use cases' mappings, and runs only after the lead confirms.
