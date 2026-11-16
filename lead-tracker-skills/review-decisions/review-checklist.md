# Review Checklist

Internal review of the `record-review-decisions/` skill folder. Not sent to anyone. Use it as a reviewer who has not seen the folder before. Mark each item pass or fail. This is the stand-in for automated checks; no tool runs it. Every item stays unticked until a fresh review passes it.

Testing policy: behaviors are checked by reading the files and by manual testing in the client environment, recorded against the version they cover. No Copilot run has been made for this folder, and nothing here claims one. Items that need a real run say so.

- [ ] [B01] `SKILL.md` lists pending rows (blank `review_status` or `changed_since_review` = `yes`) one use case at a time in the `order` column, found through the headings file keys (every key named exists in `tracker-tools/review-csv-exporter/data/review-headings.csv`), and shows use case, record, kind, per-field current, proposed and state, conflict, suggestions, evidence and reason. Needs a real run to confirm what Copilot does.
- [ ] [B02] `SKILL.md` records accept, reject or clarify only from the lead's words in `review_status`, `reviewer`, `review_note` and `reviewed_on` of that row, with the name and date the lead gave, clears `changed_since_review`, and edits no other cell and no other row.
- [ ] [B03] `SKILL.md` asks again and records nothing when an answer is unclear.
- [ ] [B04] `SKILL.md` accepts all pending `add` rows of one use case with no conflict and no held change in one step, touches no other row, and lists rows recorded and rows left.
- [ ] [B05] `SKILL.md` lists the decided rows of a named record or use case with status, reviewer, date and note, overwrites the picked row's review cells, and keeps the earlier status and name in the note as `Earlier: <status> by <name> on <date>. <comment>`.
- [ ] [B06] `SKILL.md` warns about a row with `applied_on` set before changing it, changes it only after the lead confirms, and leaves `applied_on` as it is unless the lead gives a date or says to clear it.
- [ ] [B07] `SKILL.md` sets `applied_on` on that row only, from a date the lead gives after applying a change by hand.
- [ ] [B08] `SKILL.md` reads the file back, checks that only the intended cells changed, that the status is `accepted`, `rejected` or `clarify` (or blank) and that the row count is unchanged, and says the next export refresh keeps the decision. Needs a real run to confirm what Copilot does.
- [ ] [B09] `SKILL.md` forbids writing to the tracker, proposing or applying a change, editing a cell outside the review cells, and recording a decision, name or date the lead did not say.
- [ ] [B10] `SKILL.md` asks once for the review folder, the headings file, the lead's name and the date when any is missing, skips asking when `run-discovery` passes them, and never takes the name or date from the environment.
- [ ] [Rules] The skill folder holds only `SKILL.md`, front matter `name: record-review-decisions` equal to the folder name, a description with trigger phrases, `user-invocable: true`. The four review file names and statuses match the exporter's. Wording scan: no Craft term, command or file (`craft`, `task`, `acceptance`, `component`, `README`, `contract.md`, `requirements.md`, `/craft:`), `use case` for the business unit, `job` or `script` only for the vendor's script, no secret, no real vendor data.
