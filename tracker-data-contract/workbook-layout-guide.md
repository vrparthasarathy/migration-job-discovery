# Workbook Layout Guide

For a lead who builds the tracker workbooks by hand in Excel on SharePoint. The shapes come from `tracker-data-contract.md` and `tracker-schema.csv`; nothing here adds or changes a column. No integration is built: every copy between workbooks, and every change from a proposal, is done by hand.

## Contents

- [Before the first release](#before-the-first-release)
- [The workbooks](#the-workbooks)
- [Tabs and columns](#tabs-and-columns)
- [Drop-down lists](#drop-down-lists)
- [Due date and overdue formulas](#due-date-and-overdue-formulas)
- [Building a vendor workbook](#building-a-vendor-workbook)
- [Updating an existing vendor workbook](#updating-an-existing-vendor-workbook)
- [Copying a vendor's edits into the master](#copying-a-vendors-edits-into-the-master)
- [Applying the reconciler's output](#applying-the-reconcilers-output)
- [Use case inventory template](#use-case-inventory-template)

## Before the first release

Separate vendor access is a deployment prerequisite. Before the first release to a vendor:

1. Each vendor workbook is its own file, shared only with that vendor.
2. Nothing internal (mappings, recommendations, decisions, proposals, exports, question groups and question links) is stored in a place a vendor can read.
3. A hidden tab, hidden column or hidden folder does not count as separation.

Where the vendor workbooks and the proposal and export files are stored is deferred to the client's confirmation. Settle it, and record the choice, before the first release. The rest of this guide does not depend on the choice.

## The workbooks

- **Master workbook** (internal, authoritative for everything): the tabs Use Cases, Questions, Question Groups, Question Links, Mappings, Identity & Access and Batches, plus a Lists sheet and a Holidays sheet.
- **Vendor workbook** (one per vendor, a separate file): the tabs Use Cases, Questions and Identity & Access with only that vendor's rows and only the `V` columns, plus a Lists sheet and a Holidays sheet. The Questions tab is the vendor's single question sheet: one simple sheet of its own released question rows, one row per use case per question. It has no group, no link and no reference to another use case's row. The vendor workbook has no Batches, Question Groups, Question Links or Mappings tab.

Each tab is an Excel table, and its column headings are exactly the `column` names in `tracker-schema.csv` for that tab, in the order the schema lists them.

## Tabs and columns

Use `tracker-schema.csv` for the full column list of each tab, with its key, owner class, visibility, type and allowed values. In short:

| Tab | Row means | Key | In the vendor workbook |
| --- | --- | --- | --- |
| Use Cases | one use case | `use_case_ref`, `use_case_name` | `V` columns, own rows |
| Questions | one use case and one question | `question_ref` | `V` columns, own rows, only after `released_on` is set |
| Question Groups | a lead's record that several question rows ask the same thing | `group_ref` | never |
| Question Links | one question row linked to a group | `link_ref` | never |
| Mappings | one use case and one workflow candidate | `mapping_ref` | never |
| Identity & Access | one use case and one endpoint (and environment) | `access_ref` | `V` columns, own rows |
| Batches | one release of questions to a vendor | `batch_ref` | not included |

Extra lead columns (for example the helper columns below) may be added at the right of a master tab. Exports preserve them. A helper column is never copied into a vendor workbook.

## Drop-down lists

On the Lists sheet, put each list in its own column and name the range after the column (for example `answer_status`). Apply it as data validation, with an error alert that stops other values, on the column of the same name in each tab. The values are the `allowed_values` in `tracker-schema.csv`; the status lists and their meanings are in `tracker-data-contract.md`.

- Master Lists sheet: `stage`, `source_status`, `last_change_class`, `grouping_impact`, `grouping_impact_lead`, `status` (Questions), `answer_status`, `text_review`, `blocks_mapping`, `link_status`, `candidate_source`, `mapping_status`, `auth_type`, `request_status`, `verification` and `status` (Batches).
- Vendor Lists sheet: `answer_status`, and the `auth_type`, `request_status` and `verification` lists only to show the values, because those columns are read-only for the vendor.

In the master, enter `not-answered` as `answer_status` when a question row is released.

## Due date and overdue formulas

Name the Holidays sheet range `Holidays` (one `YYYY-MM-DD` date per cell; it may be empty). In the Questions table, `due_on` is release plus two working days, blank until release:

```
=IF([@released_on]="","",WORKDAY([@released_on],2,Holidays))
```

Use the same formula for `due_on` in the Batches table. `due_on` is computed: nobody types it, and a response, a resolver or a follow-up never changes it. `released_on` is set by a lead only, when the batch is released.

In the master Questions table, add these helper columns (they are not contract columns):

```
overdue         =IF([@due_on]="",FALSE,AND(TODAY()>[@due_on],OR([@status]="released",[@status]="clarification-requested"),OR([@status]="clarification-requested",[@answer_status]<>"answered")))
follow_up       =OR([@answer_status]="partially-answered",[@answer_status]="cannot-answer")
awaiting_review =AND([@status]="released",[@answer_status]="answered")
age_days        =IF(AND([@awaiting_review],[@answered_on]<>""),TODAY()-[@answered_on],"")
```

Reading them:

- A row is overdue from day three, when today is after `due_on`, the row is open and either a lead asked for clarification or the response is not a complete answer.
- A partial or cannot-answer row stays overdue with its original due date and is also a follow-up. Both can be true.
- A complete answer awaiting lead review is not overdue. Show `our_owner` and `age_days` next to it so the review does not wait unseen.
- A lead-set `clarification-requested` row stays open on its original `due_on` and can be overdue even though `answer_status` is `answered`. Never edit `answer_status` to express this; set `status`.

## Building a vendor workbook

1. Create a new, separate workbook file for the vendor. Do not copy the master file and delete tabs, because the history and hidden content travel with it.
2. Use Cases tab: paste only that vendor's rows and only the `V` columns.
3. Questions tab: paste only that vendor's rows where `released_on` is set, and only the `V` columns. Paste as values, so `due_on` is not a link to the master. Re-create the `due_on` formula from the previous section if the vendor should see it recalculate.
4. Identity & Access tab: paste only that vendor's rows and only the `V` columns. Identity columns hold names and variable references only.
5. Add the Lists sheet (vendor lists only) and the Holidays sheet. Protect every column the vendor does not edit.
6. Check before sharing, row by row against the rule below. Open the file's document properties and remove any internal name or path.
7. Share the file with that vendor only.

**Vendor-view rule.** A vendor workbook shows only that vendor's rows and `V` columns. A question row appears only after release. No row or column refers to a group, a link, another use case's row, a mapping, a workflow, another vendor or an unreleased question. No secret value appears anywhere in the file. Hidden tabs, hidden columns, comments and links to the master are not allowed.

The vendor edits only these fields:

- On a question row: `answer`, `answer_status`, `answered_on` and `answered_by`.
- On its use case: the acknowledgement fields `acknowledged_version`, `acknowledged_on` and `acknowledgement_reference`. A lead sets `acknowledgement_requested_on`, so the vendor does not edit it.
- On an access row: the vendor-side access fields `vendor_action_owner` and `additional_requirements`.

For a question that concerns several use cases, the vendor sees one row per use case and answers each row on its own. A partial answer says in `answer` what is missing.

## Updating an existing vendor workbook

After a later release, a changed use case or a new acknowledgement request, update the vendor's existing file by hand: append the newly released question rows and the new or changed use case and access rows, and refresh changed values (for example `acknowledgement_requested_on`). Paste as values, only that vendor's rows and only `V` columns, never overwrite a cell the vendor has filled in, and repeat the vendor-view check above before the vendor is told.

## Copying a vendor's edits into the master

Do this after each vendor edit, by hand, one row at a time.

1. Open the vendor's workbook and the master side by side.
2. For each question row the vendor changed, find the master row by `question_ref` and copy `answer`, `answer_status`, `answered_on` and `answered_by` into it. Copy nothing else, and never copy an answer to another row.
3. For each use case the vendor changed, find the master row by `use_case_ref` and copy `acknowledged_version`, `acknowledged_on` and `acknowledgement_reference`.
4. For each access row the vendor changed, find the master row by `access_ref` and copy `vendor_action_owner` and `additional_requirements`.
5. Review each copied question row for completeness and set the lead-owned `status`: `accepted` if the answer is complete, or `clarification-requested` if you need more. Do not change `answer_status`.
6. A `partially-answered` or `cannot-answer` row stays open: leave `status` as `released` (or `clarification-requested`) and keep the original `due_on`. For a `cannot-answer` row, assign a `resolver` or close it with a `closed_reason` (`status` `closed`). A `resolver` alone does not resolve it.
7. A new or newly linked question row starts with a blank answer; never copy an answer from another row, even a row asking the same thing.
8. Check the helper columns. Every `partially-answered`, `cannot-answer` and `clarification-requested` row should still show as open and, after the due date, overdue.
9. When all questions of a use case are answered and verified, set `stage` as the contract's `stage` list describes, and request acknowledgement of that version by setting `acknowledgement_requested_on` in the master, then update the vendor workbook as in the next section.

Acknowledgement of behavior (`acknowledged_version`), access approval or provisioning (`request_status`) and verified working access (`verification`) are separate columns. Never record one as another.

## Applying the reconciler's output

The reconciler compares proposal files with the master and prints what it found. Apply it by hand, row by row, in this order.

1. Read the proposal's rows (`tracker-updates.csv`, columns in the contract). Every row has a `source`; do not apply a row you cannot trace to it.
2. For an `add` of a new record: create the row in the master, assign its central reference yourself (the next free `UC-###`, `QN-####`, `AX-###` and so on; a printed `suggested` reference is only a suggestion), and fill the fields from the rows of that record. Human-owned values are suggestions: copy the ones you accept.
3. For a `set`: open the master row, check that the current value equals `base_value`, then replace it. If the value differs, stop and resolve the conflict with the person who changed it.
4. For a `suggest` on a human-owned field: copy the value only if the field is blank, or when you decide to replace it. Never overwrite a non-empty value without a decision.
5. For a `link`: add the reference to the list field of that record.
6. For a link suggestion between question rows: review it, then record it as a row in Question Links (and a group in Question Groups if one does not exist), with `link_status` `suggested`, `confirmed` or `rejected`. No answer is copied by a link.
7. Never apply a value to a forbidden field (release, batch, answer, acknowledgement, ticket, availability, verification or decision fields) or to a computed field. Never release a question from a proposal; release is set by a lead when a batch is released.
8. Add the proposal id to `proposal_refs` on each record you changed.
9. Note the proposal as applied where you keep proposals, and export the master if an export is due (one CSV per tab plus `manifest.csv`, as the contract's export format says).

## Use case inventory template

`use-case-inventory-template.csv` is a header-only CSV with the columns `use_case_name,vendor,source_ref`. Fill one row per use case: the vendor's own name for the use case, the vendor slug, and the source location. An empty `source_ref` means the source is not located, so set the use case's `source_status` to `not-located` or `not-screened` as it applies. Paste the rows into the Use Cases tab, then assign each use case its `UC-###` reference. The inventory is a list; it is not a prerequisite analysis, and nothing in it is a decision.
