---
name: run-discovery
description: Takes one use case folder through the discovery stages in order (source screening, identity and access, behavior documentation, workflow recommendation), refreshes the consolidated review CSV files, and hands the pending rows to the review decisions skill. Use when a developer or lead asks to run discovery for a use case folder, to process the next folder, to refresh the review files, to review the pending proposed rows, or to accept all plain additions of one use case. It keeps one use case index row per folder, records no decision itself and never writes to the use case tracker.
user-invocable: true
---

# Run discovery

You coordinate the existing discovery skills for one use case folder at a time, refresh the review CSV files, and hand the rows that wait for a decision to `record-review-decisions`. Your only own write is the use case index row of the folder. You write no proposal file and no review cell, and you never edit another skill's output. You never write to the use case tracker, never release a question, never record an acknowledgement or a decision on your own, and never apply a change. A lead decides every row.

Use plain language. `use case` is the business unit. Say `job` or `script` only for the vendor's script.

## Before you start

Needs these skills installed beside this one: `propose-tracker-updates`, `discover-identity-access`, `document-job-behavior`, `recommend-workflows` and `record-review-decisions`. Node 26 is needed for the exporter. If a skill is missing, say which and stop.

From the use case folder read the use case name, the vendor and the source location. The folder holds the source, an optional `external_tools.md`, an optional `logic.md` and tagged documents. The folder may sit at any depth under the repository root.

Ask once, in one message, only for what you can neither read nor derive. Never invent any of it, and never take the lead's name or today's date from the environment. You never ask for a proposal ID:

- The repository root (once per session; each folder must sit under it, otherwise stop).
- The vendor and the source location, when the folder does not show them.
- The tracker export folder (it holds `manifest.csv`; an empty tracker is a folder with only `manifest.csv`).
- The proposals root (the folder that holds the `tracker-updates` folders).
- The exporter path (the review CSV exporter folder), and the folder to write the review CSV files to.
- The lead's name and today's date, before the review is handed over.

The same answers serve every folder of the session. Ask again only for what is new.

## The use case index and the proposal ID

`use-case-index.csv` sits at the repository root. You are its only writer and it is never edited by hand. It is UTF-8 without a byte order mark, comma-separated with RFC 4180 quoting, LF line ends, one header row, exactly `use_case_name,slug,vendor,folder,spec`, rows sorted by `folder`.

- `use_case_name`: the name as the folder or specification writes it. `slug`: the use case slug. `vendor`: the vendor as read from the folder. `folder`: the path relative to the repository root, `/` separators, no leading `./`, no trailing `/`. `spec`: the root-relative path of the specification file, blank until behavior documentation has written it.
- Slug rule: lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed. An empty slug stops the run.
- The proposal ID of the folder is `uc-<slug of the vendor>-<slug>`, shared by stages 1 to 3. The proposal ID is the use case ID defined in the Tracker Data Contract; the stages derive their keys from the index row's name and vendor.
- Duplicate check, before any stage: if another row has the same derived ID in a different `folder`, stop, write nothing, name both folders and say the lead must rename one. If the matching row's old `folder` no longer exists on disk, the folder has moved: update that row's `folder` and `spec` and say so in the report. If the old folder still exists it is a duplicate.
- After the check, write or update this folder's row (key `folder`; a rerun updates in place). After behavior documentation set `spec`. A folder skipped for `not-located` or `empty` keeps a blank `spec`.

## Run one folder

Start by saying, in plain words: the use case, its vendor and source location as read from the folder, and the four stages you will run in order:

1. Source screening.
2. Identity and access.
3. Behavior documentation.
4. Workflow recommendation.

Then derive the proposal ID, run the duplicate check and write the index row, then run the stages one after another, each through its own skill, each writing only its own rows in its own file:

1. `propose-tracker-updates` in source-screening mode.
2. `discover-identity-access`.
3. `document-job-behavior`, then `propose-tracker-updates` in specification-update mode.
4. `recommend-workflows`, over every row of the use case index (see below).

If a stage needs a fact only the developer has (the vendor, a source location), you have asked for it once above; do not ask again and do not guess. If it is still missing, mark that stage blocked and say what is missing.

### Source status

After stage 1, read the proposed `source_status` of the use case.

- `not-located` or `empty`: stage 1 has recorded the blocker. Skip stages 3 and 4 for this use case and say why in plain words: there is no usable script to document or compare. Stage 2 still runs on what the folder holds.
- `uncertain-mapping`: do not skip. Run every stage and say the source mapping is uncertain.
- Anything else: run every stage.

### Workflow recommendation

Run stage 4 only after a use case's behavior documentation is done and you have set that row's `spec`. It compares every row of the index, not only this folder's. Show the full list once, with the warning that a partial list drops the other use cases' mappings, and run only after the lead confirms. Use the fixed proposal ID `recommendations`; never ask for it.

## Export and report

When the stages finish, run:

`node <exporter path>/src/main.ts export-review --export <dir> --proposals <root> --out <dir>`

with the export folder, proposals root and output folder you were given. If it exits with 1 or 2, stop and show its error unchanged; do not edit a file to get past it. The output folder must be separate from the export and proposals folders.

Then report, per stage, what was proposed, skipped or blocked, with the reason for each skip or block, and then the exporter's counts, including any rejected proposal rows with their reasons. Say that the review files are `review-use-cases.csv`, `review-questions.csv`, `review-identity-access.csv` and `review-mappings.csv` in the output folder.

## Next folder

When the lead chooses the next folder, run only that folder. Do not rerun earlier folders unless the lead asks. Their rows stay in the review files, because the exporter merges all proposals and keeps earlier decisions.

## Never

- Write to the use case tracker, release a question, record an acknowledgement or a decision on your own, or apply a change.
- Record a decision, a name or a date the lead did not say.
- Edit a proposal file yourself, a review cell, or another skill's output. The index row is your only own write.
- Invent a vendor or a source location, or ask for a proposal ID.
- Put a secret value in any file or in a reply. If a row shows one, do not copy it and say so.

## Hand over the review

When the export has run, invoke `record-review-decisions` with the review folder, the lead's name and the date, and say that the review walk and every decision are recorded there. Do not read or edit any review cell, record no decision yourself, and do not rerun the exporter after a decision. When the lead asks to accept all plain adds of one use case, pass that request to `record-review-decisions`.

## The reply

End every run with a short report in plain words: what each stage proposed, skipped or blocked; the exporter counts; the review rows that wait (handed to `record-review-decisions`); and the reminder that the lead reviews every row and applies any change to the tracker by hand.
