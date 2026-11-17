# Requirements: Discovery Orchestrator

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- Goal: one flow per use-case folder, from the four discovery stages to the hand-over of the review CSVs to `record-review-decisions`, with no hand transposing and no duplicates across folders. Folders may sit at any depth under one repository root.
- The skill invokes the four existing skills, the exporter and `record-review-decisions`; it does not change their outputs or copy their logic. It writes no proposal file and no review cell. Its only own write is one row per folder in `use-case-index.csv` at the repository root ([contract.md](contract.md#use-case-index-derived-proposal-id-and-fixed-recommendations-id)), never edited by hand.
- Plain Markdown skill for GitHub Copilot in VS Code agent mode. It needs the five skills installed beside it, Node 26 and the exporter's command line.
- Stage order: source screening, identity and access, behavior documentation, workflow recommendation. Behavior documentation is two invocations (drafting, then specification-update proposals).
- A source status of `not-located` or `empty` skips behavior documentation and workflow recommendation for that use case; `uncertain-mapping` does not skip.
- Workflow recommendation takes every index row as its list, shown once with the partial-list warning (a partial list drops the other use cases' mappings), and runs after the lead confirms, with the fixed proposal ID `recommendations`, never asked for.
- The proposal ID of a folder is derived as `uc-<vendor-slug>-<use-case-slug>`, never asked for; a duplicate ID stops the run before any stage.
- Review: after the export the skill hands the review folder, the lead's name and the date to `record-review-decisions`, which owns the walk, the accept-all step and every write to the review cells; accept-all requests are passed to it. The exporter command is unchanged.

## Must match the source

- Each skill's own contract and mode, and the Tracker Data Contract's ownership classes: no skill writes forbidden or human-owned fields.
- The exporter's command line and the reconciler's slug rule and proposal file format (`update_id` composed as `<proposal_id>:<tab>:<record_key>:<field>`).

## Must not

- Write to the tracker, release a question, record an acknowledgement or a decision on its own, or apply a change.
- Record a decision, name or date the lead did not say; take the reviewer name or date from the environment.
- Invent a vendor or source location, or ask for a proposal ID.
- Change the Tracker Data Contract or its copies, or let any other skill write the index.
- Include a Craft term, command or file in the skill folder.

## Need not match

- The sample workbook, the infrastructure scope, the `same as` shortcut and any vendor-facing view.

## Testing policy

As the root's: the behaviors are checked by the file review in the checklist and by the user's manual client-environment testing, recorded as user-reported evidence for the version tested. No Copilot run is claimed.

## Follow-on work (recorded, not built)

- None recorded.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Planned change: shared use case file location

- Convention: the use case index `use-case-index.csv` at the repository root is the single lookup: its row's `folder` is the use case's own folder and its `spec` is the root-relative path of the specification; a new specification is written in the use case's own folder as `<folder>/<use case name>.md`, never in a proposal folder.
- Stage 3 is told the use case's `folder` as the specification's home; the specification is written at `<folder>/<use case name>.md`.
- The index `spec` is set from the root-relative path the drafting stage reports, never guessed.
- The contract's `spec` column definition says the index row is the single lookup for a specification and that a new specification is written in the row's own folder.
- Must not: write a specification itself, move an existing one, or change the index columns, the proposal ID or the review hand-over.
- Applies from the build of this change; the Tracker Data Contract and its copies do not change.
