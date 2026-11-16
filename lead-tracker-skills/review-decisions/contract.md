# Contract

## Contract

Planned, not built.

### Invocation

In VS Code agent mode, the skill `record-review-decisions`, called on its own or by `run-discovery` after the export.

### Inputs

Asked once for the session and never invented or taken from the environment:

- The review folder, which holds `review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv` and `review-mappings.csv`.
- The headings file, the Review CSV Exporter's `data/review-headings.csv`. A review column is found through its `Review` rows (`order`, `use_case`, `record`, `kind`, `conflict`, `suggestions`, `reason`, `evidence`, `changed_since_review`, `review_status`, `reviewer`, `review_note`, `reviewed_on`, `applied_on`, and the field suffixes). A key that is missing, or a review file whose header differs from the headings, stops the run.
- The lead's name and a date in `YYYY-MM-DD`, before any decision is recorded. When `run-discovery` calls the skill it passes the folder, the name and the date and the skill does not ask again.

### Pending rows and display

A row is pending when `review_status` is blank or `changed_since_review` is `yes`. Rows are taken in the `order` column, one use case at a time. For each row it shows the use case, the record (blank for a new record), the kind (`add`, `update`, `suggestion` or `conflict`), per field the current value, the proposed value and the state (`add`, `update`, `suggest`, `conflict` or `held`; both values for a conflict), the conflict, the suggestions, the evidence and the reason. A row changed since review says it changed after the last decision.

### Recording a decision

| The lead says | Cells written in that row |
| --- | --- |
| accept, reject or clarify, with an optional comment | `review_status` = `accepted`, `rejected` or `clarify`; `reviewer` = the lead's name; `review_note` = the comment (blank when none); `reviewed_on` = the date the lead gave; `changed_since_review` cleared |
| a date after applying a change by hand | `applied_on` = that date |

Only the lead's own words count; an unclear answer is asked again and nothing is recorded. No other cell and no other row is edited, and every other byte of the file stays as it was (the same quoting, line ends and cell order). A cell that holds a comma, a quote or a line break is quoted as RFC 4180 says.

### Accept all plain adds

On the lead's request for one use case, after confirming which use case, it records `accepted` in one step, with the lead's name and the date the lead gave, for every pending row of that use case whose kind is `add`, with no conflict and no held change. Every other row of that use case and every row of other use cases stays untouched. It then lists the rows recorded and the rows left, with the reason for each row left.

### Changing an earlier decision

The lead names a record or asks to revisit a use case. The skill lists the decided rows in that scope with their status, reviewer, date and note, and `applied_on` when set. The lead picks a row and a new status among `accepted`, `rejected` and `clarify`, with an optional comment. The skill overwrites that row's review cells as for a new decision and writes the note as `Earlier: <old status> by <old reviewer> on <old date>. <new comment>`; the old note, when there was one, follows after ` | `. If the row has `applied_on`, it first says that the change was already applied by hand in the tracker and that the tracker must then be corrected by hand, and it changes the decision only after the lead confirms. `applied_on` stays as it is unless the lead gives a date or says to clear it.

### Check after recording

It reads the file back and checks that only the intended cells of the intended rows changed, that `review_status` is blank or one of `accepted`, `rejected` and `clarify`, and that the row count is unchanged. On a failure it says which row and cell, and restores the cells it changed. It then says that the next run of the Review CSV Exporter keeps the decision, and that the lead applies any accepted change to the tracker by hand.

### Stop errors

One message per problem, naming the file and line, and nothing written: a missing review file, a header that differs from the headings file, a missing key, a status outside the list, a row that cannot be found, or a comment that looks like a secret (a password, token, key or private key text).

### Prohibitions

As `B09`: it never writes to the tracker, proposes or applies a change, releases a question, edits a cell outside the review cells, or records a decision, name or date the lead did not say.

### Wording rules

No Craft term, command or file in the skill folder. `use case` names the business unit; `job` or `script` only the vendor's script; plain language.
