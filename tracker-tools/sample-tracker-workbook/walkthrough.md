# Walkthrough

A tour of `sample-tracker-workbook.xlsx` for the team session. The workbook is generated from fictional data (five use cases, two vendors) at the as-of date 2026-11-16, so "today" in every example is Monday 16 November 2026. It is an internal sample: it mixes vendor-visible and internal columns, is not vendor-safe, and hides nothing. Vendor workbooks stay separate files.

How to read the colours: a blue column header is vendor-visible, a grey one is internal, and a red sheet tab is an internal sheet. Row 1 of each main sheet groups columns; row 2 is the filtered table header. Columns are named `Sheet > Heading` below.

## Presenting the sample

1. Before the session, one person opens the file in Excel and checks that it opens cleanly, the dropdowns work and the frozen headers hold (the generator is tested by reading the file back, but nobody has looked at it in Excel yet).
2. Send the file to the team a day ahead with the Read Me sheet as the starting point, and ask each person to look at the sheet they would use most.
3. In the session (about 45 minutes), spend 5 minutes on the Read Me and the colours, then follow one use case through the sheets: Daily Invoice Status Report (UC-001) from `Use Cases > Acknowledged version` to `Questions > Review state` and `Identity & Access > Request status`. Then take Workflow Mappings, Proposed Changes and Trace together, because they show how reviewed proposals stay apart from accepted values.
4. Leave 15 minutes for the questions under each sheet below, asking the lead who would own that sheet first.
5. Ask people to try changing a dropdown and filtering a column, so the feedback comes from using it, not only from looking at it.

## Sheet tour

### Read Me

What it is: the guide to the workbook. It lists the sheets and whether each is vendor-visible or internal, the colour key, how the review columns are worked out, and a dictionary of every column with its schema name, owner class and type.

**Feedback questions**

- Is the sheet list and colour key enough to understand the workbook without a briefing?
- Does the column dictionary answer what each column means, or should it say more?
- Should the Read Me stay in the real tracker, or only in this sample?

### Use Cases

What it is: one row per use case. `Use Cases > Current version` and `Use Cases > Acknowledged version` are separate, so UC-001 shows specification v2 acknowledged only at v1. `Use Cases > Source status` shows located (UC-001, UC-005), empty (UC-002), not located (UC-003) and an uncertain mapping (UC-004). UC-003 lists a supporting document in `Use Cases > Supporting documents`, and `Use Cases > Blocked reason` says it does not clear the blocker. `Use Cases > Pending change` points to Proposed Changes for UC-002 and UC-003.

**Feedback questions**

- Are the column groups (use case, acknowledgement, source, progress, change tracking) the right way to split about 27 columns?
- Is anything missing from, or unneeded on, this sheet for a lead's daily work?
- Is it clear that the current version and the acknowledged version are different things?
- Should a located source show its location here, or is the source status enough?

### Questions

What it is: one row per use case and question. `Questions > Due on` is the release date plus two working days. `Questions > Review state`, `Questions > Days past original due` and `Questions > Age awaiting review` are computed at the as-of date. QN-0001 is a complete answer awaiting lead review (6 days old, not overdue). QN-0002 is unanswered and 3 working days overdue. QN-0003 is a partial answer: overdue and a follow-up. QN-0004 is a complete answer with a clarification requested, overdue against its original due date. QN-0005 and QN-0006 are the same question for two use cases with separate answers. QN-0007 is not released and has no due date.

**Feedback questions**

- Does the review state wording tell a lead what to do next?
- Is counting days past due in working days and age in calendar days clear, or confusing?
- Do the three review columns belong on this sheet, or in a separate summary?
- Is one row per use case and question easy to read when the same question is asked of several use cases?
- Are the answer columns in the right place relative to the lead-only status columns?

### Identity & Access

What it is: one row per use case, endpoint and environment, with names and variable references only. `Identity & Access > Auth type` shows website sign-in (AX-001) and API access (AX-002, AX-004). AX-002 and AX-003 share the endpoint /v2/rates in production as separate rows, one per use case, with `Identity & Access > Permissions to confirm` and no permissions assumed. `Identity & Access > Request status` and `Identity & Access > Verification` stay separate.

**Feedback questions**

- Is one row per use case, endpoint and environment right, or should shared endpoints be one row?
- Is `Identity & Access > Shared with` enough to see that a ticket can be shared?
- Are the request status, ticket and verification columns in a sensible order?
- Is anything here too sensitive to sit next to vendor-visible columns?

### Workflow Mappings

What it is: an internal sheet of workflow candidates. MP-001 is a candidate awaiting a lead decision, and MP-002 is pending clarification, blocked by QN-0006. The decision columns (`Workflow Mappings > Decision ref`, `Workflow Mappings > Decided by`, `Workflow Mappings > Decided on`) are blank because a lead decides.

**Feedback questions**

- Is it clear what a lead decides here, and where the decision is recorded?
- Is the evidence group (versions considered, blocking questions, shared behaviors, differences) the right detail?
- Should a blocked mapping show its blocking question's state on this sheet?

### Proposed Changes

What it is: an internal sheet that keeps proposals apart from accepted values. PC-001 proposes moving UC-002 from v2 to v3, and PC-002 suggests a new source note for UC-003. `Proposed Changes > Current value` is what the main sheet holds, `Proposed Changes > Proposed value` is the proposal, and the technical columns (`Proposed Changes > Proposal`, `Proposed Changes > Update`, `Proposed Changes > Base value`, `Proposed Changes > Source`) sit to the right.

**Feedback questions**

- Is one readable row per change easier to review than one row per field?
- Does a lead know what to do with a pending change: accept, reject or edit?
- Is the pending-change pointer on the main sheets enough to find the proposal?
- Should the technical metadata be on this sheet at all?

### Trace

What it is: an internal sheet that holds where each record came from: its specification, proposals, evidence, sources and merge requests. These references are kept off the main sheets, so the main sheets stay narrow. See `Trace > Kind` and `Trace > Reference`.

**Feedback questions**

- Is it easy enough to get from a record to its evidence from this sheet?
- Are the five kinds (proposal, specification, evidence, source, merge request) the right set?
- Would you rather have these links beside each record, even at the cost of wider sheets?

### Lists

What it is: the allowed values behind every dropdown, one list per column, read from the tracker schema. Each dropdown stops values outside its list.

**Feedback questions**

- Are the allowed values the ones you would pick from, with the names you would use?
- Is a stop alert too strict for the first weeks, or the right guard?

## Capturing feedback

- Keep one shared feedback log with the columns sheet, column or heading, comment, who raised it and a decision (change, defer, follow-on).
- Take the answers to the questions above as the starting entries, one row per answer, and add comments as people try the file.
- After the session, the owner of this sample sorts the log into changes to the layout guide and the schema, changes to the generator, and follow-on work, and replies to each person with what was decided.
- A change to a column name, list or visibility is a change to the tracker contract. It is decided by the contract's owner, not edited in the sample.

## Differences from the tracker contract

The full list is in [contract.md](contract.md#differences-from-the-tracker-contract). In short: the sample adds Read Me, Proposed Changes and Trace and renames Mappings to Workflow Mappings; it leaves out Question Groups, Question Links, Batches and Holidays; headings are friendly and the group band is in row 1; the due date and review columns are values at the as-of date, not formulas; a Pending change column is added; proposal references, source links, evidence references and merge request links move to Trace; colours are added; and one workbook holds vendor-visible and internal columns, so it is not vendor-safe.

## Follow-on work

Not built here, and listed in [requirements.md](requirements.md#follow-on-work-recorded-not-built): the coordinating skill and exporter that turn a use case folder into the consolidated review CSVs (backlog item `discovery-to-review-csv-pipeline`), a vendor-view workbook from the same data, formulas and a Holidays sheet, Question Groups, Question Links and Batches sheets, and revising the layout guide from the team's feedback.
