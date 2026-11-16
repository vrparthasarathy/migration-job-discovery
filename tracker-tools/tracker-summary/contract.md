# Contract

## Contract

### Command

`summary --export <dir> [--date <YYYY-MM-DD>] [--holidays <file>] --out <file>` reads the export directory and writes one internal summary file. The date defaults to today and is a parameter so a run is repeatable.

### Summary sections, in call-agenda order

| Section | Content |
| --- | --- |
| Status | Use cases per vendor track and per stage (draft, review, sent, awaiting-acknowledgement, acknowledged). |
| Overdue questions | Open released question rows after `due_on`, from day three, with the original due date and days overdue, grouped by owner. Partially answered and cannot-answer rows stay in this list and are also marked follow-up (a cannot-answer row shows its resolver or `unassigned`); a response never resets the due date. A `clarification-requested` row stays in this list on its original due date even when the vendor's answer status is complete. A complete answer awaiting lead review (`released` and `answered`) is listed apart with its owner and age and is not vendor-overdue. Captured and unreleased rows are never counted. |
| Pending acknowledgements | Use cases in `awaiting-acknowledgement`, with the version and the date requested. |
| Missing source and other blockers | Use cases whose source is not located, empty, confirmed unavailable or of uncertain mapping come first, each with its owner and the status kept distinct, then use cases or workflows with a `blocked_reason`, an open mapping-blocking question or a blocked access request. Available documents never remove a source blocker. |
| Identity and access | Each use case and endpoint request with coordinator, vendor action owner, status and expected availability (blank or `unknown` is shown as `unknown`); approval or provisioning, verification and acknowledgement are shown separately; blocked requests first. |
| Mappings | Mappings pending a decision, pending clarification or suggested for re-review, with an unknown grouping impact shown as unknown. |
| Next batches and capacity | Unreleased use cases grouped by workflow candidate per vendor, ranked by how many use cases they unblock, with the provisional limits shown as provisional. No distribution is invented, the suggestions are advisory, and the summary never releases a question or sets a commitment. |
| Unassigned | Pending actions, source blockers, questions and cannot-answer rows with no owner or resolver. |

The output is marked internal. A missing file, column or valid status is an error naming it, and no partial summary is written.
