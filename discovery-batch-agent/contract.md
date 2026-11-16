# Contract

## Contract

### Invocation

In VS Code agent mode, the custom agent `discovery-batch` chosen in Copilot Chat, with the use cases to run. The file `discovery-batch.agent.md` is copied into the workspace's `.github/agents/` folder.

### Inputs

- First, on its own: the use cases to run, by name or slug.
- Read from `use-case-index.csv` at the repository root, never asked for: each use case's folder, vendor and specification path. A name with no row needs its folder asked once.
- Derived, never asked for: the proposal ID `uc-<vendor-slug>-<use-case-slug>` and the fixed recommendations ID `recommendations`, by the section "The use case index and the proposal ID" of `run-discovery`.
- Asked once and never invented, remembered for the session: the repository root, the tracker export folder, the proposals root, the exporter path, the folder for the review CSVs, the lead's name and today's date.

### Confirmation table

One table before anything runs: use case, vendor, folder, proposal ID, and `skip` where `<proposals root>/tracker-updates/<proposal-id>/tracker-updates.csv` exists. The run starts only after the lead confirms it. A duplicate proposal ID stops the run, names both folders and writes nothing.

### Worker subagent

One subagent per use case, started one at a time with a brief that holds the use case's facts and the shared answers and nothing else from the conversation. It runs, through the installed skills, source screening (`propose-tracker-updates`), `discover-identity-access`, and behavior documentation (`document-job-behavior` then `propose-tracker-updates` in specification-update mode). It never asks the lead anything; a missing fact makes that stage blocked. It skips behavior documentation when the proposed `source_status` is `not-located` or `empty`.

### Worker reply record

The subagent replies with exactly these nine lines, in this order, and nothing else:

```text
USE-CASE: <name>
PROPOSAL-ID: <proposal-id>
SOURCE-STATUS: <value>
STAGE-1: done | blocked: <reason>
STAGE-2: done | blocked: <reason>
STAGE-3: done | skipped: <reason> | blocked: <reason>
SPEC-PATH: <path of the specification, or none>
FILES-WRITTEN: <paths>
OPEN-QUESTIONS: <count and one line each, or none>
```

A reply in any other form is a failed use case and is not repaired by the agent.

### Index writes

The agent's only own write. After the lead confirms the table it writes or updates the row of each folder to run, following the index rules of `run-discovery`; after each use case it sets that row's `spec` from `SPEC-PATH` (blank when `none`). A skipped use case with no row gets a row with its folder and vendor and a blank `spec`.

### Recommendation subagent

After the loop, one subagent runs `recommend-workflows` over every index row that has a `spec`, with the fixed proposal ID `recommendations` and the lead's name and date. The lead has confirmed the list once, shown with the warning that a partial list drops the other use cases' mappings, and the brief says so. It never asks the lead anything and writes no tracker file.

### Export and report

The agent runs once `node <exporter path>/src/main.ts export-review --export <dir> --proposals <root> --out <dir>`. On exit 1 or 2 it stops and shows the error unchanged. It then reports one table per use case (outcome per stage, skipped, blocked or failed with the reason, `spec unknown` where it applies), the recommendation counts, and the exporter's counts including rejected proposal rows.

### Review hand-over

The agent invokes `record-review-decisions` in the main conversation with the review folder, the lead's name and the date. It reads and edits no review cell, records no decision and does not rerun the exporter after a decision. A request to accept all plain adds of one use case is passed to that skill.

### No subagent tool

The agent says `NO SUBAGENT TOOL`, says that `run-discovery` handles one folder at a time, and stops.

### Wording rules

The agent file says `use case` for the business unit and `job` or `script` only for the vendor's script, names no Craft term, and holds no copy of the Tracker Data Contract.
