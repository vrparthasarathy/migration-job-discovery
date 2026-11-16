# Requirements: Review Decisions

The shared rules are in the [root requirements](../../requirements.md#requirements) and the group's in the [group requirements](../requirements.md#requirements).

## Requirements

- Goal: a lead records and later revisits decisions on the review CSV rows in chat, and never has to edit the CSVs by hand.
- One Markdown skill for GitHub Copilot in VS Code agent mode, folder `record-review-decisions`, holding `SKILL.md` and `review-checklist.md` only. It needs only Copilot, the review folder and the Review CSV Exporter's `review-headings.csv`.
- Pending rows are those with a blank `review_status` or `changed_since_review` = `yes`, taken in the `order` column, one use case at a time. Every column is found through the headings file keys, never assumed.
- A decision is the lead's own words: accept, reject or clarify, with an optional comment. The skill writes `review_status`, `reviewer`, `review_note` and `reviewed_on` of that row and clears its `changed_since_review`; it asks again when an answer is unclear.
- Accept all plain adds of one use case is one step over that use case's pending `add` rows with no conflict and no held change.
- Revisit: the lead names a record or asks to revisit a use case; the skill lists the decided rows in that scope and overwrites the review cells of the one the lead picks, keeping the earlier status and name in the note. A row with `applied_on` set is warned about first.
- After recording it reads the file back and checks that only the intended cells changed and that the status is allowed.

## Must match the source

- The Review CSV Exporter's file names (`review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv`, `review-mappings.csv`), its headings file keys, its allowed statuses (`accepted`, `rejected`, `clarify`) and its rule that a review cell that looks like a secret stops the run.
- The review walk and the accept-all text of the built Discovery Orchestrator, which this skill replaces there.

## Must not

- Write to the tracker, propose or apply a change, release a question, or edit a cell outside the review cells.
- Record a decision, name or date the lead did not say, or take the name or date from the environment.
- Clear `applied_on` without the lead's word, or write a value that looks like a secret.
- Run an executable, hold a copy of the Tracker Data Contract, or include a Craft term, command or file in the skill folder.

## Need not match

- A reopen answer that blanks a decision, a history column, and any change to how the exporter merges review cells.

## Testing policy

As the root's: the behaviors are checked by the file review in the checklist and by the user's manual client-environment testing, recorded as user-reported evidence for the version tested. No Copilot run is claimed.

## Follow-on work (recorded, not built)

- A `record-decision` subcommand of the Review CSV Exporter, if hand edits by Copilot break rows.
- A reopen answer, if leads need to return a row to pending.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
