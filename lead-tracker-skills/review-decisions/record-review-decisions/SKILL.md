---
name: record-review-decisions
description: Walks a lead through the pending rows of the review CSV files and records accept, reject or clarify in that row's review cells, accepts all plain additions of one use case in one step, and lets the lead change an earlier decision. Use when a lead asks to review the pending rows, record a decision, accept all plain adds of a use case, change an earlier decision, or revisit a use case's decisions. It records only the lead's own words and never writes to the use case tracker.
user-invocable: true
---

# Record review decisions

You walk a lead through the rows of the review CSV files that wait for a decision, record each decision in that row's review cells, and let the lead come back later to change one. A lead decides every row. You never write to the use case tracker, never propose or apply a change, and never release a question.

Use plain language. `use case` is the business unit. Say `job` or `script` only for the vendor's script.

## Before you start

You can be called on your own or by `run-discovery` after the export. When `run-discovery` hands you the review folder, the lead's name and the date, do not ask for them again.

Ask once, in one message, for everything you need and do not have. Never invent any of it, and never take the lead's name or today's date from the environment:

- The review folder. It holds `review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv` and `review-mappings.csv`.
- The headings file, `review-headings.csv` in the `data` folder of the review CSV exporter.
- The lead's name and the date as `YYYY-MM-DD`, before you record any decision.

Find every review column through the `Review` rows of the headings file: `order`, `use_case`, `record`, `kind`, `conflict`, `suggestions`, `reason`, `evidence`, `changed_since_review`, `review_status`, `reviewer`, `review_note`, `reviewed_on`, `applied_on` and the field suffixes (`suffix_current`, `suffix_proposed`, `suffix_state`). Do not assume a heading. If a key is missing from the headings file, a review file is missing, or a review file's header differs from the headings, stop with one message per problem naming the file and line, and write nothing.

## Review the pending rows

A row is pending when `review_status` is blank, or `changed_since_review` is `yes`. Take the pending rows one use case at a time, in the `order` column.

For each row show:

- The use case, the record (blank for a new record), and the kind (`add`, `update`, `suggestion` or `conflict`).
- For each field, the current value, the proposed value and its state (`add`, `update`, `suggest`, `conflict` or `held`); for a conflict show both values.
- The conflict, the suggestions, the evidence and the reason. A row marked changed since review also says that it changed after the last decision.

Then ask for accept, reject or clarify, with an optional comment.

## Record a decision

Record a decision only from the lead's own words. If the answer is unclear, ask again and record nothing.

In that row only, write:

- `review_status`: `accepted`, `rejected` or `clarify`.
- `reviewer`: the lead's name.
- `review_note`: the comment, blank when there is none.
- `reviewed_on`: the date the lead gave.
- `changed_since_review`: cleared.

When the lead gives a date after applying a change by hand in the tracker, set `applied_on` on that row only, to that date. You never apply a change yourself.

Edit no other cell and no other row. Every other byte of the file stays as it was: the same quoting, line ends and cell order. A cell that holds a comma, a quote or a line break is quoted as RFC 4180 says. If a comment looks like a secret (a password, token, key or private key text), do not write it, say so, and ask for another.

## Accept all plain adds

When the lead asks to accept all plain additions of one use case, confirm which use case, then record `accepted` in one step, with the lead's name and the date the lead gave, for every pending row of that use case whose kind is `add`, with no conflict and no held change. Leave every other row of that use case and every row of other use cases untouched. Then list the rows you recorded and the rows you left, with the reason for each row left.

## Change an earlier decision

When the lead names a record or asks to revisit a use case, list the decided rows in that scope with their status, reviewer, date and note, and `applied_on` when set.

The lead picks a row and a new status among `accepted`, `rejected` and `clarify`, with an optional comment. Overwrite that row's review cells as for a new decision, and write the note as `Earlier: <old status> by <old reviewer> on <old date>. <new comment>`. When the row had a note, it follows after ` | `.

If the row has `applied_on` set, first say that the change was already applied by hand in the tracker and that the tracker must then be corrected by hand. Change the decision only after the lead confirms. `applied_on` stays as it is unless the lead gives a date or says to clear it; never clear it on your own.

You do not return a row to pending.

## Check the file

After you record, read the file back. Check that only the intended cells of the intended rows changed, that `review_status` is blank or one of `accepted`, `rejected` and `clarify`, and that the row count is unchanged. If a check fails, say which row and cell, and restore the cells you changed. Then say that the next run of the review CSV exporter keeps the decision, and that the lead applies any accepted change to the tracker by hand.

## Never

- Write to the use case tracker, propose or apply a change, or release a question.
- Edit a cell outside the review cells, or any row the lead did not decide.
- Record a decision, a name or a date the lead did not say, or take the name or date from the environment.
- Clear `applied_on` without the lead's word.
- Put a secret value in any file or in a reply.
