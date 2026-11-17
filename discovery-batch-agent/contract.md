# Contract

## Contract

### Invocation

In VS Code agent mode, the custom agent `discovery-batch` chosen in Copilot Chat, with the use cases to run. The file `discovery-batch.agent.md` is copied into the workspace's `.github/agents/` folder.

### Inputs

- First, on its own: the use cases to run, by name or slug; the stages to run (`screening`, `identity`, `specification`, any combination, default all three); and whether to run workflow recommendation too (default no).
- Read from `use-case-index.csv` at the repository root, never asked for: each use case's folder, vendor and specification path. A name with no row needs its folder asked once.
- Derived, never asked for: the proposal ID `uc-<vendor-slug>-<use-case-slug>` and the fixed recommendations ID `recommendations`, by the section "The use case index and the proposal ID" of `run-discovery`.
- Asked once and never invented, remembered for the session: the repository root, the tracker export folder, the proposals root (a dedicated folder: not `.`, existing, holding nothing besides its `tracker-updates` folder; checked before anything runs), the exporter path, the validator path (the Tracker Reconciler's `main.ts`), the folder for the review CSVs, the lead's name and today's date.

### Confirmation table

One table before anything runs: use case, vendor, folder, proposal ID and one column per stage (screening, identity, specification), each `run`, `skip: not chosen` or `skip: already done`. A stage is already done when its own result exists: screening when the use case's `<proposals root>/tracker-updates/<proposal-id>/tracker-updates.csv` holds a Use Cases row with `source_status`, identity when it holds an Identity & Access row, specification when the use case's index row has a non-blank `spec`. A done stage is `run` again only when the lead asks for a rerun of that stage. The agent only reads the proposal file to decide. The run starts only after the lead confirms the table. A duplicate proposal ID stops the run, names both folders and writes nothing.

### Worker subagent

One subagent per use case, started one at a time with a brief that holds the use case's facts and the shared answers and nothing else from the conversation. The brief carries `Stages to run:` with `run` or `skip: <not chosen | already done>` for each stage. It runs only the `run` stages, in the fixed order screening (`propose-tracker-updates`), identity (`discover-identity-access`), specification (`document-job-behavior` then `propose-tracker-updates` in specification-update mode), never an unchosen stage, and each stage writes only its own rows. It never asks the lead anything; a missing fact makes that stage blocked. Specification is never blocked for missing screening: it reads `source_status` from the file when there is one, skips when it is `not-located` or `empty`, and otherwise proceeds; a source it cannot find is reported as blocked.

### Worker reply record

The subagent replies with exactly these ten lines, in this order, and nothing else:

```text
USE-CASE: <name>
PROPOSAL-ID: <proposal-id>
SOURCE-STATUS: <value, or none when no value is known>
STAGE-1: done | skipped: not chosen | skipped: already done | blocked: <reason>
STAGE-2: done | skipped: not chosen | skipped: already done | blocked: <reason>
STAGE-3: done | skipped: not chosen | skipped: already done | skipped: <source status reason> | blocked: <reason>
SPEC-PATH: <path of the specification, or none>
FILES-WRITTEN: <paths>
OPEN-QUESTIONS: <count and one line each, or none>
VALIDATION: ok | failed: <file:line message; ...>
```

After its stages the worker runs `node <validator path> validate <proposals root>/tracker-updates/<proposal-id>` and may rerun its own stage once to fix the reported errors; it never edits another stage's rows. A reply in any other form, a `VALIDATION: failed` line, a missing `VALIDATION` line or a validator that cannot run is a failed use case and is not repaired by the agent; the report lists the errors with their lines.

### Index writes

The agent's only own write. After the lead confirms the table it writes or updates the row of each folder to run, following the index rules of `run-discovery`; after each use case it sets that row's `spec` from `SPEC-PATH` (blank when `none`). A skipped use case with no row gets a row with its folder and vendor and a blank `spec`.

### Recommendation subagent

Only when the lead asked for it, after the loop, one subagent runs `recommend-workflows` over every index row that has a `spec`, with the fixed proposal ID `recommendations` and the lead's name and date. The lead has confirmed the list once, shown with the warning that a partial list drops the other use cases' mappings, and the brief says so. It never asks the lead anything and writes no tracker file.

### Export and report

After every run, even when every stage was skipped, the agent runs once `node <exporter path>/src/main.ts export-review --export <dir> --proposals <root> --out <dir>`. The review folder is the same each time, so earlier review decisions are kept. On exit 1 or 2 it stops and shows the error unchanged. It then reports one table per use case (outcome per stage: done, not chosen, already done, blocked or failed with the reason, `spec unknown` where it applies), the recommendation counts, and the exporter's counts including rejected proposal rows.

### Review hand-over

The agent invokes `record-review-decisions` in the main conversation with the review folder, the lead's name and the date. It reads and edits no review cell, records no decision and does not rerun the exporter after a decision. A request to accept all plain adds of one use case is passed to that skill.

### No subagent tool

The agent says `NO SUBAGENT TOOL`, says that `run-discovery` handles one folder at a time, and stops.

### Wording rules

The agent file says `use case` for the business unit and `job` or `script` only for the vendor's script, names no Craft term, and holds no copy of the Tracker Data Contract.

## Planned change: shared use case file location

- Convention: the use case index `use-case-index.csv` at the repository root is the single lookup: its row's `folder` is the use case's own folder and its `spec` is the root-relative path of the specification; a new specification is written in the use case's own folder as `<folder>/<use case name>.md`, never in a proposal folder.
- Worker brief: adds the specification location and the exception to the proposals-root rule.
- Worker reply record: the `SPEC-PATH` line is the root-relative path of the specification written at `<folder>/<use case name>.md`; the line count is unchanged.
- Applies from the build of this change; the Tracker Data Contract and its copies do not change.
