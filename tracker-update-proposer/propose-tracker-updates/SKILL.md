---
name: propose-tracker-updates
description: Proposes rows for the Use Cases and Questions tabs of the use case tracker, as a reviewable `tracker-updates.csv`, from the use case inventory and its source locations (source screening, before any specification exists) or from a use case behavior specification and its previous version (specification update). Use when a developer or lead asks to screen the sources of all use cases, to turn a new or revised specification into tracker rows, to propose the open questions of a specification as tracker rows, or to refresh a proposal after the specification changed. It only proposes; it never writes to the tracker.
user-invocable: true
---

# Propose tracker updates

You turn evidence into proposed tracker rows, so a lead can review and apply them and no one retypes questions. You write one file, `tracker-updates.csv`, in the long proposal format of `tracker-data-contract.md` in this folder. You never write to the tracker itself, never release a question and never apply anything. A lead reviews every row and the report.

You own two tabs only: Use Cases and Questions. You write nothing for the other tabs. In particular you write no Question Links or Question Groups rows: finding questions that ask the same thing is not your job.

Read `tracker-data-contract.md` and `tracker-schema.csv` in this folder before you write a row. They are the only source for column names, owner classes, allowed values and the file format. If they and this file ever disagree, they win, and you say so in your reply.

## Choose the mode

- **Source screening.** The developer gives you the use case inventory (and where the source locations are) and no specification exists yet, or asks you to screen sources. Go to "Source screening".
- **Specification update.** The developer gives you a use case specification (and the previous version when there is one). Go to "Specification update".

If the request is not clear about which, ask once. The two modes can be run in any order and write to the same file; each rewrites only its own rows.

## Inputs

- Source screening: the inventory list (one row per use case, with at least the use case name and vendor, and a source location if known) and the folders or paths where source locations are kept. A named owner is used only if the inventory has one. Optionally, tagged supporting documents per use case.
- Specification update: one specification (the use case's behavior document), the previous version of it when updating, the use case's vendor, and the proposal ID. Optionally, the existing proposal file and a tracker export.
- Proposal ID: the merge request number or the branch name made safe as a slug. If it is not given, ask once. Never invent one.
- Supplied findings, questions, corrections or answers that are not yet in a specification: accept them and read them, but they reach the tracker only through a specification that records them. You list them in the report and write no row for them.

## The proposal file

The file is `tracker-updates/<proposal-id>/tracker-updates.csv`. Create the folder if it is missing. Rewrite only your own rows (tabs Use Cases and Questions) in that file, and leave any other rows in it as they are. Never write anywhere else.

Format: UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting (quote any value with a comma, a double quote or a line break, and double the quotes inside), LF line ends, one header row, exactly this header:

`update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`

One row per field. For every row:

- `update_id` is `<proposal_id>:<tab>:<record_key>:<field>`, composed from the other cells, never a hash and never a counter. The same content always gives the same `update_id`.
- `proposal_id` is the proposal ID.
- `tab` is `Use Cases` or `Questions`, exactly as in `tracker-schema.csv`.
- `operation` is `add`, `set` or `suggest`. Never `link`: you write no link rows.
- `record_key` is the local reference, never a central reference such as `UC-###` or `QN-####`. For a use case it is the use case ID, `uc-<vendor-slug>-<use-case-slug>`. For a question row it is `<use-case-id>/Q<n>`, where `Q<n>` is the question's ID in the specification. Question IDs are never renumbered and never reused. The use case ID is built from the use case's vendor and its use case name, each reduced to a slug: lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed, with the prefix `uc-`. It is derived and never written in a column of its own; the readable name stays in the `use_case_name` column. The name alone or a slug alone is never a key. Where a specification is stored comes from the use case index, never from the slug.
- `field` is a column name from `tracker-schema.csv` for that tab.
- `value` is the proposed value. `base_value` is the value you saw before the change, filled for every `set` and blank for an `add`.
- `source` is where the value comes from (see "Sources").
- `reason` is a short plain sentence saying why. It is where a grouping impact reason goes.
- `created_on` is the date (`YYYY-MM-DD`) on which the row was first proposed. When you rerun on a proposal file that already has the row with the same content, keep its `created_on` so the rerun gives identical rows.
- `author` is `propose-tracker-updates`.

Order the rows by tab (Use Cases first), then by record, then by the field order in `tracker-schema.csv`, so the same input always gives the same file.

### Field classes

Look every field up in `tracker-schema.csv`, column `owner`.

- `spec` fields: you may `add` them on a new record and `set` them on an existing record (with `base_value`).
- `human` fields: you may only `suggest` them on an existing record, or give an initial suggestion on an `add` of a new record, which a lead copies by hand. Never propose a value that would overwrite a non-empty value you were shown.
- `forbidden` fields: never write them. This includes released dates, batch references, answers, answer status, who answered and when, acknowledgement fields, ticket references, raised dates, expected availability, verification fields and decision fields. If the specification or an input contains such a fact, do not copy it: list it in the report.
- `computed` fields (`due_on`, `last_updated`): never write them.
- Never write a central reference, never write `question_ref` or `use_case_ref`, and never write `grouping_impact_lead`, which is the lead's own override.

### Sources

Every row has a `source`, and a row you cannot give a source is not written.

- Specification rows: `<specification path>@<version>#<anchor>`, for example `website-availability-check/website-availability-check.md@v1#q1`. The version is the specification's own version, written `v<number>`, and the anchor is the heading or the question or behavior anchor the value comes from.
- Source-screening rows: `inventory:<row>` (the inventory row number or the use case name) or `source-screen:<path>` (the path you looked at). No specification anchor is needed and none is invented.

A value that its evidence does not show is left blank. Never guess a vendor, a link, a revision, an owner or a status.

### A use case with no known vendor

The use case ID needs the vendor. When the inventory row, the input and the specification do not show it, ask the lead once for the vendor. Never invent one. Write no keyed row for that use case until the vendor is known, and name the use case in the report.

## Source screening

Run this over the entire inventory, not one use case, and before any specification exists. Look in the source locations the developer gives and in the inventory, and decide for each use case what the evidence shows about its source (the vendor's current script).

For each use case whose source is missing, empty or of uncertain mapping, write `suggest` rows on the use case's record (record key is the use case ID built from the inventory's vendor and the use case name, tab `Use Cases`):

- `source_status`: `not-located` when the source was searched for and not found; `empty` when something was found that has no usable script; `uncertain-mapping` when a script exists but it is unclear that it belongs to this use case. Never write `confirmed-unavailable`: only the vendor or the owner can confirm that, and a lead records it. Never write `located` for a source you only suspect.
- `blocked_reason`: a short reason in plain words, taken from what you found.
- `source_note`: what was searched and found, in one or two sentences.
- `source_owner`: the owner the inventory names for this use case, otherwise the word `unassigned`. Never take an owner from a file name, a commit author, a document or a guess.
- `supporting_documents`: a `;`-list of the documents the developer tagged for this use case, when there are any. In `source_note`, say these documents allow preliminary work only; they do not verify the source and never clear a source blocker.

A use case whose inventory row has no vendor follows "A use case with no known vendor". Source is `inventory:<row>` or `source-screen:<path>`. A use case whose source is found and clearly belongs to it gets no row; count these for the report. Do not read specifications in this mode and do not write question rows.

Illustration with invented names (not real data), one use case whose script was not found and whose inventory row names no owner:

`<proposal-id>:Use Cases:uc-example-vendor-example-use-case:source_status,<proposal-id>,Use Cases,suggest,uc-example-vendor-example-use-case,source_status,not-located,,inventory:12,No script found in the source locations searched.,<date>,propose-tracker-updates`

with sibling rows for `blocked_reason`, `source_note` and `source_owner` (value `unassigned`).

## Specification update

Read the specification fully. Its structure is: a header table (use case name, version, date, status, source revision, script link), a change log, current behaviors `B<n>`, questions `Q<n>` with a status, parameters and dependencies, scenarios `AC<n>` and an acknowledgement log. Everything you propose comes from it.

### First run

When the use case has no record yet (no earlier proposal file for it and no tracker export showing it), write:

1. `add` rows for the use case: `use_case_name`, `vendor`, `spec_link`, `current_version`, `spec_revision`. Take the version and revision from the header table, the name from the heading. Take the vendor from the inventory row, the input the developer gave, or the specification if it states it; if none shows it, follow "A use case with no known vendor". The record key is the use case ID. If no link to the specification was given, leave the `spec_link` `value` blank and say so in `reason`. Never a central reference.
2. For every open question in the specification, one Questions `add` per use case per question, with the record key `<use-case-id>/Q<n>` and these fields:
   - `use_case_name` and `vendor` (same as the use case).
   - `spec_refs`: `<use-case-id>/Q<n>@v<version>`.
   - `current_spec_text`: the question's text exactly as the specification words it now, character for character.
   - Initial suggestions for human fields: `question_text` (the same exact text, which a lead copies by hand when the question is captured), `status` `captured` and `text_review` `none`. Leave every other human field out.
   - Source: the specification path with `@v<version>#q<n>`.

   A question that concerns several use cases is several question rows, one per use case, each with its own record key. Never write a shared answer or a shared row. Do not write a row for a question already answered in the specification (see "Updates").

If the specification has no open questions, write only the use case rows and say so in the report.

### Updates and repeat runs

Rerunning on the same specification must give the same rows and no duplicate record. Before writing, read the existing proposal file (if any) and the previous version of the specification (if given). Compare, then:

- Use case record already known: do not `add` it again. Use `set` with `base_value` set to the value you saw.
- Version changed: `set` `current_version` with the previous version as `base_value`, and `set` `spec_revision` if the revision changed. Source: the change log (`#change-log`) of the new version.
- Class of the change: `set` `last_change_class` to `behavior-change` when behaviors, parameters, dependencies or scenarios changed, and to `non-behavior-change` when only the version, date, spelling, change log, acknowledgement or other non-behavioral text changed. The reason names the changed behavior IDs (`B3, B7`) or the changed section.
- Grouping impact, separately from the class: `set` `grouping_impact` to `could-affect`, `not-expected` or `unknown`, with a short reason in this row's `reason` (for example `could-affect: B4 now names a second outside system`). Use `could-affect` when a changed behavior, parameter or dependency changes what the use case does or needs. Use `not-expected` when the change is non-behavioral or leaves what the use case does and needs unchanged. Use `unknown` when you cannot tell (no previous version, a change log that does not say what changed, or a change you cannot judge). A behavior change does not necessarily affect grouping, and a non-behavior change is not automatically `not-expected` if you cannot tell. Never treat `unknown` as no impact. A lead may override it; you never write the lead's override and never change an earlier lead decision.
- Question with the same ID and the same wording as the row you have: write nothing.
- Question with a new ID: `add` it as in the first run.
- Question whose wording changed (the row already exists, possibly released and possibly answered): keep the row and its identity. `set` `current_spec_text` to the new wording with the old wording as `base_value`, `set` `spec_refs` to the new version, and `suggest` `text_review`: `wording-edit` when the same thing is asked and only the phrasing, spelling or order changed; `possible-meaning-change` when the subject, scope, condition, number or the thing asked changed or you are unsure. Put the difference in one sentence in `reason`. Never write `question_text`, the answer or the answer status, never suggest withdrawing, superseding or replacing the row, and never rewrite the released text. A lead decides any replacement. A `possible-meaning-change` is flagged in the report as needing a lead.
- Question the new version marks as answered (its status says resolved, now a behavior or see a section): keep the row and `suggest` `status` `incorporated` and `incorporated_version` with the new version, source the question's anchor in the new version. Do not copy the answer.
- Question that is no longer in the specification: write no row, and list it in the report. Never withdraw or supersede it.

Use the specification's question IDs as they are. If they were renumbered and a question cannot be matched to an existing row by its ID and wording, write no row for it and list it in the report.

### Supplied items not yet in a specification

Findings, questions, corrections and answers the developer gives you that the specification does not yet record get no row, because the specification is what the tracker traces to. List them in the report and tell the developer to have the specification updated first (the specification drafting skill does that), then run you again.

## The report

End your reply with a report, in plain words, with these parts. Write `none` for an empty part; never leave one out.

1. Content with no row: anything you saw that belongs in the tracker but got no row, and why (for example a question removed from the specification, an answer in the specification that is not copied, an unmatched question ID, a use case with no known vendor, or a blank link).
2. Supplied items not yet in a specification, one per line.
3. Rows without a source: rows you could not write because no anchor or evidence reference was available.
4. Unread files: files you were given or looked for and could not read.
5. Use cases with an unassigned source owner, and use cases that have only supporting documents and no located source.
6. Use cases whose behavior changed, each with the change class, the changed behavior IDs and the suggested grouping impact with its reason, `unknown` ones listed first, so the affected workflow recommendations can be re-reviewed.
7. Where the file is, how many rows it has per tab and per operation, and that a lead reviews every row and this report before anything is applied.

## Always

- No secret value (password, token, key or credential) in any row or in the report. If an input contains one, do not copy it and say that you skipped it.
- Nothing is released or applied. Say that the file is a proposal.
- Do not describe changes anyone might want or any design for the new platform: you only carry what the specification and the inventory show.
- `tracker-updates.csv` in this folder is an example of a first specification run for the website availability check use case, under the fictional vendor Example Vendor. Use it as a model of the format only; never copy its values into another use case's proposal.
