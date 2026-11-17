# Review Checklist

Internal review of the behaviors `B01` to `B10` in this component's [README.md](README.md#behavior) against [discovery-batch.agent.md](discovery-batch.agent.md). Not sent to anyone. Use it as a reviewer who has not seen the file before. Mark each item pass or fail. No Copilot run has been made: this is the stand-in for an automated check of a non-executable agent file, and passing it claims nothing about the client environment.

- [ ] [B01] The agent first asks only which use cases to run, which stages (screening, identity and access, specification; any combination; default all three) and whether to run workflow recommendation (default no); reads folder, vendor and specification path from `use-case-index.csv`; asks for a folder only for a name with no row; then asks once, in one message, only for the repository root, export folder, proposals root, exporter path, validator path, review folder, the lead's name and the date.
- [ ] [B02] Proposal IDs are derived as `uc-<vendor slug>-<slug>` and the recommendations ID is fixed as `recommendations`, neither asked for; a duplicate ID stops the run, names both folders and writes nothing; one table (use case, vendor, folder, proposal ID, and per stage `run`, `skip: not chosen` or `skip: already done`) is shown before anything runs. The proposals root is checked before anything runs: not `.`, existing, holding nothing besides `tracker-updates`.
- [ ] [B03] After confirmation it writes or updates each folder's index row, runs one subagent per use case one after another, each running only the `run` stages in the fixed order screening, identity, specification and writing only its own rows, keeps only the ten-line reply record, with each worker running the validator on its own proposal folder and reporting `VALIDATION`, sets `spec` after each use case, and the worker brief forbids asking the lead.
- [ ] [B04] A failed, blocked or malformed use case does not stop the batch, a malformed reply is not repaired, and the final report lists the failed stage with the missing fact or reason. A `VALIDATION: failed` line, a missing `VALIDATION` line or a validator that cannot run is a failed use case.
- [ ] [B05] A stage is skipped as already done only by its own result (Identity & Access rows, a Use Cases row with `source_status`, a non-blank `spec`), a rerun of a stage happens only when the lead asks, specification is never blocked for missing screening, and a use case with no index row gets a row with folder, vendor and blank `spec` and is reported as `spec unknown`.
- [ ] [B06] Recommendation runs only when the lead asked, once, in its own subagent, over every index row with a `spec`, with the fixed ID `recommendations`, after one lead confirmation that carries the partial-list warning, and its brief says the list is confirmed; when not asked, the report says it was not run.
- [ ] [B07] The exporter runs once after every run into the same review folder, stops on exit 1 or 2 and shows the error unchanged, and the report gives per-use-case stage outcomes (done, not chosen, already done, blocked, failed), recommendation counts if it ran and exporter counts including rejected proposal rows.
- [ ] [B08] The review folder, the lead's name and the date go to `record-review-decisions` in the main conversation; no review cell is read, no decision recorded, no exporter rerun after a decision.
- [ ] [B09] The only own write is an index row; the Never list bars tracker writes, proposal files, specifications, review cells, releases, acknowledgements, decisions and applied changes.
- [ ] [B10] With no subagent tool it says `NO SUBAGENT TOOL`, says that `run-discovery` handles one folder at a time, and stops without running a use case.
- [ ] [Rules] The front matter has `name: discovery-batch`, `description`, `model: Claude Sonnet 5.5 (copilot)` and `tools`; the worker record equals [contract.md](contract.md#worker-reply-record); the file holds no Craft term (scan below); `editFiles` is stated in the README Design as kept for index rows, so `B09` rests on wording.

## Scan

Run from this folder. It should print nothing.

```sh
grep -niE "craft|tasks\.md|craft\.json|review-checklist|worktree|component record" discovery-batch.agent.md
```
