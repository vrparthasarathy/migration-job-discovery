# Requirements: Tracker Summary

The shared rules are in the [group requirements](../requirements.md#requirements).

## Requirements

- The tool writes one internal daily summary from the latest export, in the call agenda's order, across the vendor tracks found in the data: use cases by stage, overdue question rows from day three after release (partial and cannot-answer rows stay overdue and are also follow-ups; a clarification-requested row is overdue on its original due date even when the vendor's answer status is complete; complete answers awaiting lead review are listed apart with owner and age and are not vendor-overdue), pending acknowledgements, missing-source and other blocked use cases and workflows, identity and access actions per use case and endpoint with owners and expected availability, mappings pending decision or re-review, unassigned actions, and next batch suggestions.
- Captured or unreleased questions are never counted as overdue; a response never resets the original due date, which stays visible. Missing, empty, unlocated and uncertain source stay visible as blockers with their owner, and an action, source or question with no owner is flagged unassigned; available documents do not clear a source blocker. `unknown` expected availability stays visible. Access verification is shown separately from acknowledgement.
- Batch suggestions group unreleased use cases by workflow candidate per vendor, rank by use cases unblocked, show the lead's provisional limits as provisional and invent no distribution; they are advisory and never release a question or set a commitment.
- Output is deterministic for the same export and date, marked internal, and never produced from a partial or invalid export.

## Must match the source

- The Tracker Data Contract's stages, statuses and due-date rule.

## Need not match

- A dashboard, a notification or any vendor-facing report.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
