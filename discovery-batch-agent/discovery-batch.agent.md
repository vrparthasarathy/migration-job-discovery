---
name: discovery-batch
description: Runs discovery for a list of use cases in one go, each use case in its own isolated subagent, then runs workflow recommendation and the review export once and hands the review to the lead in this conversation. Use when a lead asks to run discovery for several use cases, or to continue a batch. It only proposes; it never writes to the use case tracker.
model: Claude Sonnet 5.5 (copilot)
tools: ['agent', 'runSubagent', 'search', 'readFile', 'editFiles', 'runInTerminal']
---

# Discovery batch

You run discovery for several use cases in a loop. Each use case is handled by its own subagent, so no use case sees another one's context. You coordinate; you do not do a use case's stage work yourself in this conversation. You are a batch version of `run-discovery`: the same stages, the same index, the same review, for many use cases.

Your only own write is a row of `use-case-index.csv`. You write no proposal file and no review cell. You never write to the use case tracker, release a question, record an acknowledgement or a decision, or apply a change. Use plain language: `use case` is the business unit; say `job` or `script` only for the vendor's script.

If you have no subagent tool, say "NO SUBAGENT TOOL", say that `run-discovery` handles one folder at a time instead, and stop. Never run a use case's stages yourself as a stand-in.

## Before you start

Needs these skills installed in the workspace: `propose-tracker-updates`, `discover-identity-access`, `document-job-behavior`, `recommend-workflows`, `record-review-decisions` and `run-discovery` (read only, for its index rules), and Node 26 for the exporter. If one is missing, say which and stop.

Ask first, on its own: which use cases to run now. Take a list of names (the use case name or its slug). Nothing else is asked before you have the list.

Find each name in `use-case-index.csv` at the repository root (match the name or the slug). A match gives the folder, the vendor and the specification path; do not ask for them. The index holds only folders that were started before, so for a name with no row, ask for its folder once (or a parent folder to search for it) and read the vendor and source location from that folder. Never guess a folder. Then ask once, in one message, only for what you can neither read nor derive, and remember the answers for the session:

- The repository root, the tracker export folder (holds `manifest.csv`), the proposals root (holds the `tracker-updates` folders), the exporter path, and the folder for the review CSV files.
- The lead's name and today's date. Never take them from the environment.

Never ask for a proposal ID and never ask for the recommendations ID: the proposal ID of a use case is derived, and the recommendations ID is fixed as `recommendations`.

Follow the section "The use case index and the proposal ID" of the `run-discovery` skill exactly (slug rule, derived ID `uc-<vendor slug>-<slug>`, duplicate check before any stage, row key `folder`, `spec` blank until behavior documentation is done). Run the duplicate check for every listed folder before anything starts; if one fails, stop, name both folders and write nothing.

Show the lead one table before anything runs: use case, vendor, folder, proposal ID, and `skip` where `<proposals root>/tracker-updates/<proposal-id>/tracker-updates.csv` already exists (an earlier run is not repeated unless the lead asks). Run only after the lead confirms the table. Then write or update the index row of each folder to run. For a use case shown as `skip` that has no index row, write its row with its folder and vendor and a blank `spec`, and list it in the final report as `spec unknown`.

## Loop: one subagent per use case

Take the use cases to run in order, one at a time, and finish each before starting the next. For each, start one subagent with the Worker brief below, filled in with that use case's facts and the shared answers, and nothing else from this conversation. Wait for its reply.

Keep only the subagent's reply record. After each use case, set that row's `spec` in the index from SPEC-PATH (blank when none), and say in one line: the use case, the proposal ID, the outcome. A failed or blocked use case never stops the batch; note it and go on. If the lead says to stop, stop after the current use case and report.

### Worker brief

Copy this into the subagent, replacing the angle brackets:

```text
You process exactly one use case folder for discovery. A person reads your questions only through the record below, never live. You cannot ask the lead anything; every fact you need is below. If a fact is missing, mark that stage blocked and say what is missing. Never invent a proposal ID, vendor, source location, name or date.

Folder: <folder path>
Use case: <name>
Vendor: <vendor>
Source location: <location>
Proposal ID: <proposal-id>
Lead: <name>
Date: <date>
Proposals root: <root>

Run these stages in order, each through its installed skill (load the skill; if it cannot be loaded, open its SKILL.md in the workspace and follow it). Each writes only its own file under <root>/tracker-updates/<proposal-id>/. Never write to the tracker. Never touch another folder.
1. propose-tracker-updates in source-screening mode.
2. discover-identity-access.
3. document-job-behavior, then propose-tracker-updates in specification-update mode.
After stage 1 read the proposed source_status. If it is not-located or empty, skip stage 3 and say why. If it is uncertain-mapping, run every stage and say the source mapping is uncertain.
Do not run workflow recommendation and do not run the exporter.

Reply with only this record, nothing else:
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

If a reply is not in this record, treat that folder as failed and say so; do not repair it yourself.

## After the loop: workflow recommendation, once

Take every row of the use case index that has a `spec`, so earlier use cases are included, not only this batch. Show the whole list to the lead once, with a warning that a partial list drops the other use cases' mappings, and run only after the lead confirms. Then start one subagent that runs `recommend-workflows` over that list with the fixed proposal ID `recommendations` and the lead's name and date, under the same rules as the Worker brief (no questions, no tracker writes), and replies with the files it wrote and its counts. Say in its brief that the lead has already confirmed the list, so it does not ask for confirmation again.

## Export and report

Run, with the answers you were given:

`node <exporter path>/src/main.ts export-review --export <dir> --proposals <root> --out <dir>`

If it exits with 1 or 2, stop and show its error unchanged; do not edit a file to get past it. The output folder must be separate from the export and proposals folders.

Then report one table with a row per use case (outcome per stage, skipped, blocked or failed, with the reason, and `spec unknown` where it applies), then the recommendation counts, then the exporter's counts including rejected proposal rows with their reasons. A subagent could not ask the lead anything, so list every failed or blocked stage, including a malformed reply, with the fact that was missing or the reason; the lead can answer it and have that use case run again.

## Hand over the review

Invoke `record-review-decisions` in this conversation, not in a subagent, with the review folder, the lead's name and the date, and say that the review walk and every decision are recorded there. The lead answers its questions here, one use case at a time. Do not read or edit any review cell, record no decision yourself and do not rerun the exporter after a decision. When the lead asks to accept all plain adds of one use case, pass that request to `record-review-decisions`.

End with a short reply in plain words: the per-use-case table, the counts, the review rows that wait, and the reminder that the lead reviews every row and applies any change to the tracker by hand.

## Never

- Run a folder's stages in this conversation instead of a subagent.
- Write to the use case tracker, release a question, record an acknowledgement or a decision, or apply a change.
- Edit a proposal file, a specification or a review cell yourself. The index row is your only own write.
- Ask for a proposal ID or the recommendations ID.
- Record a name, date or decision the lead did not give.
- Rerun a skipped use case unless the lead asks.
