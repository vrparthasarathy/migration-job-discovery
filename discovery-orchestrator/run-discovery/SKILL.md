---
name: run-discovery
description: Takes one use case folder through the discovery stages in order (source screening, identity and access, behavior documentation, workflow recommendation), refreshes the consolidated review CSV files, and walks a lead through the pending rows to record accept, reject or clarify decisions. Use when a developer or lead asks to run discovery for a use case folder, to process the next folder, to refresh the review files, to review the pending proposed rows, or to accept all plain additions of one use case. It only proposes and records the lead's own words; it never writes to the use case tracker.
user-invocable: true
---

# Run discovery

You coordinate the existing discovery skills for one use case folder at a time, refresh the review CSV files, and walk the lead through the rows that wait for a decision. You write no proposal file yourself and you never edit another skill's output. You never write to the use case tracker, never release a question, never record an acknowledgement or a decision on your own, and never apply a change. A lead decides every row.

Use plain language. `use case` is the business unit. Say `job` or `script` only for the vendor's script.

## Before you start

Needs these skills installed beside this one: `propose-tracker-updates`, `discover-identity-access`, `document-job-behavior` and `recommend-workflows`. Node 26 is needed for the exporter. If a skill is missing, say which and stop.

From the use case folder read the use case name, the vendor and the source location. The folder holds the source, an optional `external_tools.md`, an optional `logic.md` and tagged documents.

Ask once, in one message, for everything you need and do not have. Never invent any of it, and never take the lead's name or today's date from the environment:

- The proposal ID for this folder (one per folder, shared by stages 1 to 3).
- The vendor and the source location, when the folder does not show them.
- A recommendations proposal ID (one per session; reuse it for every folder in the session, so repeat runs do not duplicate mappings).
- The tracker export folder (it holds `manifest.csv`; an empty tracker is a folder with only `manifest.csv`).
- The proposals root (the folder that holds the `tracker-updates` folders).
- The exporter path (the review CSV exporter folder), and the folder to write the review CSV files to.
- The lead's name and today's date, before you record any decision.

The same answers serve every folder of the session. Ask again only for what is new.

## Run one folder

Start by saying, in plain words: the use case, its vendor and source location as read from the folder, and the four stages you will run in order:

1. Source screening.
2. Identity and access.
3. Behavior documentation.
4. Workflow recommendation.

Then run the stages one after another, each through its own skill, each writing only its own rows in its own file:

1. `propose-tracker-updates` in source-screening mode.
2. `discover-identity-access`.
3. `document-job-behavior`, then `propose-tracker-updates` in specification-update mode.
4. `recommend-workflows`, over every specification processed so far (see below).

If a stage needs a fact only the developer has (a proposal ID, the vendor, a source location), you have asked for it once above; do not ask again and do not guess. If it is still missing, mark that stage blocked and say what is missing.

### Source status

After stage 1, read the proposed `source_status` of the use case.

- `not-located` or `empty`: stage 1 has recorded the blocker. Skip stages 3 and 4 for this use case and say why in plain words: there is no usable script to document or compare. Stage 2 still runs on what the folder holds.
- `uncertain-mapping`: do not skip. Run every stage and say the source mapping is uncertain.
- Anything else: run every stage.

### Workflow recommendation

Run stage 4 only for a use case whose behavior documentation is done. It compares every specification processed so far, not only this folder's. Take the list from the Use Cases rows of the proposals under the proposals root and from the specifications of the use cases already processed in this session. Show the list to the lead and run only after the lead confirms it. Use the one recommendations proposal ID of the session.

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
- Edit a proposal file yourself, or another skill's output.
- Invent a proposal ID, a vendor or a source location.
- Put a secret value in any file or in a reply. If a row shows one, do not copy it and say so.

## Walk the review rows

When the review files are ready (or the lead asks to review), walk the lead through the pending rows one use case at a time.

A row is pending when `review_status` is blank, or `changed_since_review` is `yes`. Find the review columns through the headings file, `data/review-headings.csv` in the exporter folder, which maps each key (`order`, `use_case`, `record`, `kind`, `conflict`, `suggestions`, `reason`, `evidence`, `review_status`, `reviewer`, `review_note`, `reviewed_on`, `applied_on`) to its heading; do not assume a heading. Take rows in the `order` column. That order puts conflicts and held changes first, then suggestions for the lead's own fields, then plain evidence-backed additions, and within each, by use case and record.

For each row show:

- The use case, the record (blank for a new record), and the kind (`add`, `update`, `suggestion` or `conflict`).
- For each field, the current value, the proposed value and its state (`add`, `update`, `suggest`, `conflict` or `held`); for a conflict show both values.
- The conflict, the suggestions, the evidence and the reason. A row marked changed since review also says that it changed after the last decision.

Then ask for accept, reject or clarify, with an optional comment.

Record a decision only from the lead's own words. If the answer is unclear, ask again and record nothing. In that row only, edit the review cells `review_status` (`accepted`, `rejected` or `clarify`, as the exporter's headings and the lead's answer allow), `reviewer` (the lead's name), `review_note` (the comment) and `reviewed_on` (the date the lead gave). Set `applied_on` only when the lead gives a date after applying the change by hand in the tracker; you never apply it. Edit no other cell and no other row.

After you record, rerun the exporter with the same arguments to check that the files are still valid. If it stops, show the error and fix only the review cell you edited; if you cannot, tell the lead.

## Accept all plain adds of one use case

When the lead asks to accept all plain additions of one use case, confirm which use case, then record `accepted` in one step, in the lead's name and with the date the lead gave, for every pending row of that use case only whose kind is `add`, with no conflict and no held change. Leave every other row of that use case and every row of other use cases untouched. Then rerun the exporter and list the rows you recorded and the rows you left, with the reason for each left row.

## The reply

End every run with a short report in plain words: what each stage proposed, skipped or blocked; the exporter counts; the review rows that wait; and the reminder that the lead reviews every row and applies any change to the tracker by hand.
