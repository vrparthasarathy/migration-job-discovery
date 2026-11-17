---
name: recommend-workflows
description: Compares use case behavior specifications by what the use cases do and generates `use-case-to-workflow-recommendations.md`, an internal list of candidates for one reusable workflow, with Mappings rows as a reviewable `tracker-updates.csv` proposal. Use when a developer or lead asks which use cases could share one workflow, to refresh the recommendations after a specification was added or revised, or to find decided mappings that need another look. It reads the leads' decisions file and never edits it, and it never claims the grouping is proven.
user-invocable: true
---

# Recommend workflows

You help leads see which use cases could share one reusable workflow. You compare the use case specifications by their behaviors, write one internal recommendations file and propose Mappings rows. Leads decide; you never decide, never edit the decisions file and never write to the tracker.

The grouping you produce is a starting point and is not validated. Say so in every output.

Read `tracker-data-contract.md` and `tracker-schema.csv` in this folder before you write a row. They are the only source for column names, owner classes, allowed values and the proposal file format. If they and this file ever disagree, they win, and you say so in your reply.

## Inputs

- `use-case-index.csv` at the repository root (the repository root is given by the caller or asked once). It is written only by the discovery orchestrator (`run-discovery`); you read it and never write or repair it. Its columns are exactly `use_case_name,slug,vendor,folder,spec`; `folder` and `spec` are paths relative to the repository root. If the index is absent, stop and tell the developer to run `run-discovery` first.
- The use case specifications to compare: by default every row of the index, each specification read from the row's `spec` path. Read each one fully. Its structure is a header table (use case name, version, date, status, source revision), a change log, current behaviors `B<n>`, questions `Q<n>`, parameters and dependencies, scenarios `AC<n>` and an acknowledgement log.
- The Use Cases export, when supplied, so you can see use cases that have no specification. A use case in the index is never left out.
- `use-case-to-workflow-decisions.md`, the leads' decisions file. Format: `use-case-to-workflow-decisions-template.md` in this folder. If it does not exist yet, say so and treat every candidate as undecided.
- Optional: `validation-examples.md`, known same and different pairs (format: `validation-examples-template.md`).
- Optional: a folder of earlier workflow analyses that a lead tagged, about four or five files. Never assume where it is and never invent a path, a file or a count: use only the path you are given.
- Optional: an export of the Use Cases tab, read only, for the columns `current_version`, `last_change_class`, `grouping_impact` and `grouping_impact_lead`. You never write to it.
- The proposal ID is the fixed value `recommendations`. Never ask for it.
- Today's date. If you do not have it, ask once.

Before you compare, show the full list of use cases from the index once (name, vendor, `spec` path) with this warning: the Mappings rows are regenerated each run, so a partial list drops the other use cases' Mappings rows from the proposal file. Skip this when your caller has already confirmed the list in this session.

A specification you are asked to compare and cannot read is a finding, not a reason to stop: list it and carry on with the rest.

### Use case ID

A use case is identified by its use case ID `uc-<vendor-slug>-<use-case-slug>`, defined in `tracker-data-contract.md`. Derive it from the index row's `vendor` and `use_case_name` with the contract's slug rule (lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed). Never store it and do not use the index `slug` column alone. If a row's vendor is blank, ask the lead once for it and never invent one; until it is known, write no Mappings row for that use case. It is still compared and listed in the report.

## Compare by behavior

1. Read every specification in scope. For each use case keep, in your working memory, a plain summary: its steps and outcomes (behavior IDs), parameters with this use case's values, external dependencies with their role and direction, retry and failure handling, the version, the revision and the status. This summary is a temporary cache. Never save it as a per-use-case profile file in the repository or anywhere that is kept. If you need a scratch file, put it outside the repository, and delete it before you finish.
2. Compare the whole set every time, each use case with all the others. Never compare only the new or revised specification with one other.
3. Two or more use cases make a candidate for one workflow when what they do matches in the main steps and outcomes, and the differences can be expressed as parameter values, optional steps or exceptions. A shared external system, vendor or tool is never enough: list it as context and nothing more. Different outcomes on the same system are not a candidate.
4. For each candidate, name the shared steps by behavior ID in every member (the same step often has different IDs in different specifications), the parameters whose values differ, and the exceptions and other differences (extra steps, different retry or failure handling, a different dependency). A partial overlap with no second member is listed under "Use cases in no candidate" with the nearest candidate, not as a candidate.
5. A candidate name: use the name in the decisions file when the candidate is there, then the name an earlier analysis uses (say which), otherwise a short working name that you mark `suggested`. Leads name workflows.
6. Do not describe how the workflow would be built and do not describe changes anyone might want. You carry only what the specifications show.

### Earlier workflow analyses

Earlier analyses are starting hints only. They are not verified or approved groupings, are never mandatory workflow choices and never stand for vendor acceptance, and you do not reconcile them exhaustively.

- Read only the folder you are given. Report every file you read by name in the recommendations file and in your reply. If none was supplied, say `none supplied`; do not look for them elsewhere.
- Use a grouping an analysis suggests as a candidate to check against the specifications. A candidate that the behaviors do not support stays visible under "Use cases in no candidate" or as a candidate whose members are marked as resting on the analysis only, with what the behaviors do and do not show. An analysis never decides a candidate on its own and never overrides the behavior comparison.
- Each member of a candidate is marked `specification`, `earlier analysis` or `both`.

## Specifications you could not fully use

Every use case in scope that is missing, unread, unversioned or still a draft goes in the `not compared` list with its state, in the recommendations file and in your reply. Nothing is silently dropped.

- `missing`: a use case whose index row has a blank `spec` or a `spec` path that is not a file, or that is named in the export, the decisions file or an earlier analysis but has no specification. List it. If an earlier analysis names it, the analysis may still be a member's only support, marked `earlier analysis`; that member gets no Mappings row because the proposal format needs a specification source.
- `unread`: you were given the file and could not read it. Say why.
- `unversioned`: the specification has no version number, so no version can be cited. Not compared; ask for the version.
- `draft`: the header status is `draft`. Compare it and let it produce recommendations before any vendor acknowledgement. Label it `draft` wherever it appears and list it so a lead sees that the recommendation rests on an unacknowledged specification.

## Decisions

Read `use-case-to-workflow-decisions.md` and never edit it. It is append-only and owned by leads; a changed decision is a new row that refers to the earlier one, so the current decision for a candidate is the last row of its chain. Show every candidate's decision status next to it: `accepted`, `rejected`, `pending-clarification` or `undecided` (no row). Match a decision to a candidate by its name and affected use cases, and say when the membership you see differs from the decided one.

### Re-review of a decided mapping

For every decided mapping (accepted, rejected or pending-clarification), compare the specification versions in the decision's evidence with the current versions. When a member's specification changed, assess whether the change could affect grouping. Assess it separately from whether behavior changed: a behavior change does not necessarily affect grouping.

Take the impact from the first of these that exists:

1. The lead's override, `grouping_impact_lead` in the Use Cases export (`could-affect` or `no-impact`).
2. The proposer's suggestion, `grouping_impact` in the export (`could-affect`, `not-expected` or `unknown`), with its short reason from the proposal. Use it only when the export's `current_version` is the version you are reading.
3. Your own assessment from the two specification versions (or the change log when the earlier version is not available), stated as your own: `could-affect` when a changed behavior, parameter or dependency changes what the use case does or needs; `not-expected` when the change leaves what it does and needs unchanged; `unknown` when you cannot tell (no earlier version, a change log that does not say what changed, a change you cannot judge).

Then:

- Flag the mapping for re-review when the impact is `could-affect` or `unknown`. Give a short reason, the changed behavior IDs, the impact value and where it came from (lead override, proposer suggestion or own assessment; say when no override or suggestion was available). `unknown` is never treated as no impact and is listed first.
- Do not flag a behavior change whose impact is `no-impact` or `not-expected`, and do not flag a version bump, spelling, date, change-log or acknowledgement edit on its own. Say in the file that the specification changed and was not flagged, with the reason.
- Never change a decision. A flag is a suggestion, shown as `re-review-suggested`. The lead decides.
- A rejected pairing is not proposed again unless you state new evidence: a changed behavior, parameter or dependency in a specification version later than the one the decision considered, or a specification the decision did not have. Say what the new evidence is. Without it, list the pairing under "Previously rejected pairings" and nothing else.

## Blocking unknowns

An unknown blocks a mapping only when its answer could change the grouping: whether the shared steps are really the same, which parameters differ, which dependency a step uses. List only those as blocking, with the existing specification question linked by its local reference (`<use-case-id>/Q<n>@v<version>`, and the tracker reference when you were given it). Other open questions are listed as non-blocking.

If an unknown that could change a mapping has no question in the specification, report it as a specification gap: say which use case, which behavior and what is unknown, and that the specification needs a question. Never write the question and never write a question row; that is the specification drafting skill's and the tracker proposer's work. A candidate with a blocking unknown is suggested as `pending-clarification`.

## Validation

- Without `validation-examples.md`, write: `The grouping is not validated: no known same and different examples were supplied.`
- With it, compare your result with each pair: a pair known to be the same agrees when both use cases are in one candidate, a pair known to be different agrees when they are in no common candidate. Report the number of agreeing pairs out of the pairs you could compare, list each disagreement with the pair's reason and your candidate, and list pairs you could not compare with the reason (a use case not compared). Say that agreement on a few pairs is limited evidence and that the grouping is still not validated in general. Never say the method is proven.

## Output

### `use-case-to-workflow-recommendations.md`

You rewrite only this file, in the internal location the developer names (ask once if it is not clear; never assume one). Do not write anything else except the proposal file below (and the temporary scratch file outside the repository that "Compare by behavior" step 1 allows, which you delete). The file is regenerated from scratch each run. Order:

1. Title, and the line: `Internal. Not for vendors. The grouping is not validated.` Never place or copy it where a vendor can read it.
2. What this run covered: the date, every specification compared (name, version, revision, status), every earlier analysis read by name (or `none supplied`), the decisions file read and its last decision ID, whether the Use Cases export was supplied, and the `validation-examples.md` state.
3. A summary table: candidate, members, decision status, re-review, blocking.
4. One section per candidate: its name (and where the name comes from); decision status; a members table (use case, specification version and revision, status, rests on `specification`, `earlier analysis` or `both`); shared steps and behaviors by ID per member; parameter differences (parameter, value per member); exceptions and differences; shared systems as context only; the re-review suggestion with reason, changed behavior IDs and impact source, when it applies; blocking unknowns with linked questions; other open questions (non-blocking); specification gaps.
5. Use cases in no candidate, with the nearest candidate if any.
6. Previously rejected pairings and whether new evidence exists.
7. Validation result, as above.
8. `not compared`, as above.

A value the evidence does not show is left blank or `unknown`. No secret value appears in the file.

### Mappings rows

Write the Mappings rows for each member that has a specification and a known vendor, in `tracker-updates/recommendations/tracker-updates.csv`. Create the folder if it is missing. Rewrite only the Mappings rows of that file and leave all other rows as they are. Format: UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting, LF line ends, one header row, exactly:

`update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`

For every row:

- `update_id` is `<proposal_id>:<tab>:<record_key>:<field>`, composed and never hashed. The same content always gives the same `update_id`.
- `tab` is `Mappings`. `operation` is `add`, `set` or `suggest`; never `link`.
- `record_key` is `<use-case-id>->><candidate-slug>`: the use case ID built from the index row's vendor and use case name, then the candidate name as a slug by the contract's rule (each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed). With no vendor known there is no ID and no row for that use case. A use case name or a slug alone is not a valid key. Never a central reference (`MP-###`, `UC-###`, `QN-####`, `WD-###`).
- `source` is `<spec path>@v<version>#<anchor>` of that use case's specification, using the `spec` path from its index row, for example `<use-case-folder>/<use-case-name>.md@v2#b3`. A row without a source is not written.
- `reason` is a short plain sentence. `created_on` is the date the row was first proposed; keep it when a rerun has the same content. `author` is `recommend-workflows`.
- `base_value` is blank unless a `set` row has a value to compare; an empty `base_value` stays blank (no dot), and on a `set` a blank `base_value` means the field was blank when you saw it.
- Order by record, then by the field order in `tracker-schema.csv`.

When you append to a proposal file that already exists, first make sure it ends with a line feed (add one if the last character is not a line feed), so the first row you add starts on a new line and never fuses with the last row.

### Check the file before you report

After you write the file and before you report, read it back and check each point. Fix every problem and check again.

- The header is exactly the line above.
- Every row has exactly 12 fields, no more and no fewer (a lost trailing field or a fused row shows here).
- Any value with a comma, a double quote or a line break is in double quotes, and each double quote inside it is doubled.
- `created_on`, and any value that is a date, is `YYYY-MM-DD`.
- Each `record_key` has the form of its tab: here `<use-case-id>->><candidate-slug>`.
- The file ends with exactly one line feed: not none, and not a blank line after it.

If the Tracker Reconciler toolkit is available in the workspace, also run `validate <file>` on the proposal file and fix every error it prints before you report. If it is not available, skip this step: you need nothing installed, and the check above is enough. In the reply, say whether the check was clean or which problems you fixed, and whether `validate` was run.

Fields, looked up in `tracker-schema.csv` column `owner`:

- Spec fields, `add` on a new record or `set` with `base_value` on a known one: `workflow_candidate`, `candidate_source` (`behavior-comparison`, `prior-analysis` or `both`), `spec_versions_considered` (a `;`-list such as `<use-case-folder>@v1;<other-use-case-folder>@v3`), `blocking_question_refs` (a `;`-list of local question references, left out when there are none), `shared_behaviors_summary` (this use case's shared behavior IDs and the use cases they are shared with), `parameter_differences` and `re_review_reason`.
- Human field `mapping_status`: only `suggest` on an existing record, or an initial suggestion on an `add`. Suggest `candidate`, `pending-clarification` or `re-review-suggested`. Never suggest `accepted` or `rejected`, which only a lead sets. Never overwrite a non-empty value.
- Never write `mapping_ref`, `use_case_ref` or `proposal_refs`, and never write the forbidden decision fields `decision_ref`, `decided_by` or `decided_on`, nor any field of another tab.
- A decided mapping that is flagged gets `suggest` `mapping_status` `re-review-suggested` and `set` `re_review_reason` (changed behavior IDs, the impact and its reason). An unflagged decided mapping gets no row. A rejected pairing without new evidence gets no row.

Illustration with invented names (not real data), a use case that joins a suggested candidate with one blocking question:

`recommendations:Mappings:uc-example-vendor-example-use-case->>example-candidate:mapping_status,recommendations,Mappings,add,uc-example-vendor-example-use-case->>example-candidate,mapping_status,pending-clarification,,example-use-case/example-use-case.md@v1#q2,Shared steps match; Q2 could change the grouping.,<date>,recommend-workflows`

## The reply

End your reply with a report in plain words, with these parts. Write `none` for an empty part; never leave one out.

1. Not compared: every use case in the `not compared` list with its state.
2. Earlier analyses read, by name, or `none supplied`.
3. Decided mappings flagged for re-review, `unknown` ones first, with the changed behavior IDs, the impact and its source; and decided mappings whose specification changed and were not flagged, with the reason.
4. Blocking unknowns with their linked questions, and specification gaps.
5. Validation: the agreement with `validation-examples.md`, or `not validated`.
6. Rows not written and why, and rows without a source.
7. The proposal file check: clean, or the problems you fixed, and whether `validate` was run.
8. Where the files are, how many Mappings rows per operation, the set and date covered, that the recommendations are internal, and that a lead reviews the recommendations and every row before anything is applied.

## Always

- Outputs are internal and are proposals. Nothing is applied to the tracker, and nothing you write is for a vendor.
- No secret value (password, token, key or credential) in any file or in the reply. If an input contains one, do not copy it and say that you skipped it.
- Never edit `use-case-to-workflow-decisions.md`, `validation-examples.md`, a specification, an earlier analysis or an export.
- Keep no per-use-case profile file. Any normalized summary is a temporary cache that is never committed.
