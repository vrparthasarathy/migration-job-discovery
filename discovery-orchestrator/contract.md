# Contract

## Contract

### Invocation

In VS Code agent mode, the skill `run-discovery` with a use-case folder path.

### Inputs

- The folder: the source, an optional `external_tools.md`, an optional `logic.md` and tagged documents.
- Derived, never asked for: the proposal ID `uc-<vendor-slug>-<use-case-slug>` (shared by stages 1 to 3) and the fixed recommendations ID `recommendations`.
- Asked once and never invented: the repository root, the vendor and source location when absent, the tracker export folder, the proposals root, the exporter path, the folder for the review CSVs, the lead's name and today's date.

### Stages, in order

1. `propose-tracker-updates` in source-screening mode.
2. `discover-identity-access`.
3. `document-job-behavior`, then `propose-tracker-updates` in specification-update mode.
4. `recommend-workflows` over every row of the use case index, with the fixed proposal ID `recommendations`; shown once with the partial-list warning, run after the lead confirms.

Each stage rewrites only its own tabs in its own file. After stage 1 the skill reads the proposed `source_status`; `not-located` or `empty` skips stages 3 and 4 for the folder and says why.

### Exporter call and report

`node <exporter path>/src/main.ts export-review --export <dir> --proposals <root> --out <dir>`. On exit 1 the skill stops and shows the error. The report gives, per stage, what was proposed, skipped or blocked, then the exporter's counts including rejected proposal rows.

### Review hand-over

After the export the skill invokes `record-review-decisions` with the review folder, the lead's name and the date, and states that the walk and every decision are recorded there. It reads and edits no review cell, does not rerun the exporter after a decision, and passes an accept-all request for one use case to that skill. The headings file is not read here.

### Prohibitions

As B08: it never writes to the tracker, releases a question, records an acknowledgement or a decision on its own, applies a change, edits a proposal file or a review cell, or edits another skill's output. The index row is its only own write.

### Wording rules

No Craft term. `use case` names the business unit; `job` or `script` only the vendor's script; plain language.

### Use case index, derived proposal ID and fixed recommendations ID

- **File.** `use-case-index.csv` at the repository root. UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting, LF line ends, one header row, exactly `use_case_name,slug,vendor,folder,spec`. Rows are sorted by `folder`.
- **Columns.** `use_case_name`: the name exactly as the folder or specification writes it. `slug`: the use case slug. `vendor`: the vendor as read from the folder, not a slug. `folder`: the folder path relative to the repository root, `/` separators, no leading `./`, no trailing `/`. `spec`: the root-relative path of the specification file, blank until stage 3 has written it.
- **Slug rule.** Lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed; the same rule as the reconciler's and the proposer's use case slug. An empty slug stops the run.
- **Proposal ID.** `uc-<slug of the vendor>-<slug>`. The `uc-` prefix keeps it clear of the fixed recommendations ID, and it has no colon, so the composed `update_id` stays valid. The skill derives it; it never asks for it and never invents a suffix. The proposal ID is the use case ID defined in the Tracker Data Contract; the stages derive their keys from the index row's name and vendor.
- **Duplicate rule.** The derived ID is compared with the derived ID of every other row. A match in a different `folder` stops the run before any stage and writes nothing; the message names both folders and says the lead must rename one.
- **Create and update.** The key is `folder`. The same folder updates its row in place (a rerun); a new folder adds a row. A moved folder (the ID matches a row whose old `folder` no longer exists) updates `folder` and `spec` and the report says so; if the old folder still exists it is a duplicate.
- **When written.** After the duplicate check at the start of a folder (stage 1 needs the ID); `spec` after stage 3. A folder skipped for `not-located` or `empty` keeps a blank `spec`.
- **Who writes.** Only this skill, only its own row, never by hand; no other skill writes the file.
- **Repository root.** Asked once per session, never guessed; each folder must sit under it, otherwise the run stops.
- **Fixed recommendations ID.** `recommendations`, so the recommender writes `tracker-updates/recommendations/tracker-updates.csv`. The skill never asks for it. Before stage 4 it shows the list (every index row) once with the warning that a partial list drops the other use cases' mappings, and runs only after the lead confirms.
- **Export step.** Unchanged: the skill runs the exporter command above and stops on exit 1. It asks for the exporter path and needs Node 26.

## Planned change: shared use case file location

- Convention: the use case index `use-case-index.csv` at the repository root is the single lookup: its row's `folder` is the use case's own folder and its `spec` is the root-relative path of the specification; a new specification is written in the use case's own folder as `<folder>/<use case name>.md`, never in a proposal folder.
- `spec` column definition gains: "The index row is the single lookup for a specification, and a new specification is written in the row's own `folder` as `<folder>/<use case name>.md`; the stage reports the root-relative path and this skill sets `spec` from it."
- Stage 3 brief: names the `folder` as the specification's home and asks for the root-relative path of the file written.
- Applies from the build of this change; the Tracker Data Contract and its copies do not change.
