# Requirements: Discovery Orchestrator

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- Goal: one flow per use-case folder, from the four discovery stages to the lead's decisions in the review CSVs, with no hand transposing and no duplicates across folders.
- The skill invokes the four existing skills and the exporter; it does not change their outputs or copy their logic. It writes no proposal file of its own.
- Plain Markdown skill for GitHub Copilot in VS Code agent mode. It needs the four skills installed beside it, Node 26 and the exporter's command line.
- Stage order: source screening, identity and access, behavior documentation, workflow recommendation. Behavior documentation is two invocations (drafting, then specification-update proposals).
- A source status of `not-located` or `empty` skips behavior documentation and workflow recommendation for that use case; `uncertain-mapping` does not skip.
- Workflow recommendation compares every specification processed so far; the lead confirms the list before the run. One recommendations proposal ID per session keeps repeat runs from duplicating mappings.
- Review walk: pending rows (blank review status, or changed since review) in the exporter's order; the skill edits only the review cells of the row and only from the lead's own words; an unclear answer is asked again.

## Must match the source

- Each skill's own contract and mode, and the Tracker Data Contract's ownership classes: no skill writes forbidden or human-owned fields.
- The exporter's command line, headings file and column keys.

## Must not

- Write to the tracker, release a question, record an acknowledgement or a decision on its own, or apply a change.
- Record a decision, name or date the lead did not say; take the reviewer name or date from the environment.
- Invent a proposal ID, vendor or source location.
- Include a Craft term, command or file in the skill folder.

## Need not match

- The sample workbook, the infrastructure scope, the `same as` shortcut and any vendor-facing view.

## Testing policy

As the root's: the behaviors are checked by the file review in the checklist and by the user's manual client-environment testing, recorded as user-reported evidence for the version tested. No Copilot run is claimed.

## Follow-on work (recorded, not built)

- An exporter `record-decision` subcommand, if hand-editing review cells breaks rows.
- A small run log, if deriving "specifications processed so far" from the proposals proves insufficient.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Planned change: use case index

Planned, not built; merged into the sections above when built.

- Use-case folders may sit at any depth under one repository root. The skill keeps `use-case-index.csv` at that root (one row per use case; defined in [contract.md](contract.md#planned-use-case-index-derived-proposal-id-and-fixed-recommendations-id)), writes it for every folder it processes and never expects it to be hand-edited.
- The proposal ID of a folder is derived as `uc-<vendor-slug>-<use-case-slug>`; the skill no longer asks for it, and a duplicate ID stops the run before any stage.
- The recommendations proposal ID is the fixed value `recommendations`; the skill no longer asks for it. The list for workflow recommendation is every index row, shown to the lead once with the partial-list warning.
- Must match: the reconciler's slug rule and the proposal file format (`update_id` composed as `<proposal_id>:<tab>:<record_key>:<field>`).
- Must not: change the Tracker Data Contract or its copies, write a proposal file itself, or let the index be written by any other skill.
