# Tracker Data Contract

This is the one shared data contract for the use case tracker. The specification skill, the access discovery skill, the workflow recommender and the lead tools all read and write the shapes defined here. The machine-readable column list is `tracker-schema.csv`; the workbooks are built by hand from `workbook-layout-guide.md`. This file and the schema are copied byte for byte into every skill folder that uses them, so a change to either is made here and copied out.

## Contents

- [Vocabulary](#vocabulary)
- [Ownership classes](#ownership-classes)
- [Visibility](#visibility)
- [Tabs and columns](#tabs-and-columns)
- [Column ownership and keys](#column-ownership-and-keys)
- [References](#references)
- [Status lists](#status-lists)
- [Captured versus released](#captured-versus-released)
- [Answers belong to their own row](#answers-belong-to-their-own-row)
- [Grouping impact](#grouping-impact)
- [Proposal file](#proposal-file)
- [Export format](#export-format)
- [Deployment prerequisites](#deployment-prerequisites)

## Vocabulary

- A **use case** is what the business needs done. It carries the vendor's own name, and that name is its identity.
- A **script** (or job script) is the vendor's current implementation of a use case.
- A **workflow** is one reusable implementation on our platform that supports several use cases through configuration. Workflows and grouping appear only in internal files, never in a vendor-readable file.

## Ownership classes

Every column in `tracker-schema.csv` has exactly one class in its `owner` column.

| Class | Meaning |
| --- | --- |
| spec | A proposal may set it, after the conflict checks. |
| human | A proposal may only `suggest` it on an existing record, and an `add` for a new record may carry an initial value as a suggestion that a lead copies by hand. A non-empty value is never overwritten. |
| forbidden | Never accepted from a proposal: `released_on`, `batch_ref`, `answer`, `answer_status`, `answered_on`, `answered_by`, acknowledgement fields, `ticket_ref`, `raised_on`, `expected_availability`, `verification` fields, and decision fields (`decision_ref`, `decided_by`, `decided_on`). |
| computed | Derived and never stored from a proposal (`due_on`, `last_updated`). |

## Visibility

The schema column `visibility` is `V` (vendor) or `I` (internal). `V` columns appear in a vendor workbook. `I` columns never do.

- A vendor sees only its own rows.
- A Questions row is visible to a vendor only after `released_on` is set. An unreleased row, and any reference to one, never appears in a vendor workbook.
- The Question Groups, Question Links and Mappings tabs never appear in a vendor workbook. No vendor column or row refers to a group, a link, a mapping, another vendor's row or any cross-vendor information.
- No secret value (password, token, key, secret or credential value) appears in any file. Identity columns hold names and variable references only.

## Tabs and columns

CSV file names are kebab-case, one file per tab. `V` is vendor-visible and `I` is internal.

| Tab (file) | Columns |
| --- | --- |
| Use Cases (`use-cases.csv`) | V: `use_case_ref`, `use_case_name` (natural key, never renamed), `vendor`, `source_ref` (may be empty when the source is not located), `spec_link`, `current_version`, `spec_revision`, `vendor_contact`, `acknowledgement_requested_on`, `acknowledged_version`, `acknowledged_on`, `acknowledgement_reference`. I: `stage`, `blocked_reason`, `source_status` (not-screened, located, not-located, empty, confirmed-unavailable, uncertain-mapping), `source_owner` (who must locate or confirm the source), `source_note`, `supporting_documents` (`;`-list of tagged documents that allow preliminary work), `last_change_class` (behavior-change, non-behavior-change; set by the proposer for the latest specification change), `grouping_impact` (could-affect, not-expected, unknown; the skill's suggestion, separate from the change class, with its short reason carried in the proposal row's `reason`), `grouping_impact_lead` (could-affect, no-impact; a lead's override, human-owned and blank until set), `our_owner`, `next_action`, `next_action_owner`, `workflow_candidate`, `mr_link`, `proposal_refs`, `notes_internal`, `last_updated`. |
| Questions (`questions.csv`) | One row per use case per question, and it is the only question sheet a vendor sees. V (released rows only): `question_ref`, `use_case_ref`, `use_case_name`, `vendor`, `spec_refs` (one specification question, for example `website-availability-check/Q3@v1`), `question_text` (the wording as released), `batch_ref`, `released_on`, `due_on` (computed), `answer`, `answer_status` (not-answered, answered, partially-answered, cannot-answer), `answered_on`, `answered_by`, `incorporated_version`. I: `status`, `resolver` (who a lead assigned to resolve it), `closed_reason`, `superseded_by`, `captured_on`, `our_owner`, `current_spec_text` (the specification's latest wording), `text_review` (none, wording-edit, possible-meaning-change), `blocks_mapping` (yes, no, unknown), `source_links`, `proposal_refs`, `notes_internal`, `last_updated`. |
| Question Groups (`question-groups.csv`), internal tab only | I: `group_ref`, `canonical_text`, `our_owner`, `notes_internal`, `last_updated`. A group is a lead's record that several question rows ask the same thing. |
| Question Links (`question-links.csv`), internal tab only; no skill proposes rows for it, and a lead copies the reconciler's link suggestions by hand | I: `link_ref`, `group_ref`, `question_ref`, `link_status` (suggested, confirmed, rejected), `similar_to` (the question row the tool compared with), `match_note`, `reviewed_by`, `reviewed_on`, `proposal_refs`, `last_updated`. |
| Mappings (`mappings.csv`), internal tab only | I: `mapping_ref`, `use_case_ref`, `workflow_candidate`, `candidate_source` (behavior-comparison, prior-analysis, both), `mapping_status`, `decision_ref`, `decided_by`, `decided_on`, `spec_versions_considered`, `blocking_question_refs`, `shared_behaviors_summary`, `parameter_differences`, `re_review_reason`, `proposal_refs`, `last_updated`. |
| Identity & Access (`identity-access.csv`) | One row per use case and endpoint (and environment). V: `access_ref`, `vendor`, `use_case_ref`, `service`, `endpoint`, `environment`, `auth_type` (website-sign-in, api-credential, other, unknown), `observed_operations`, `identity_reference` (names and variable references only, never values), `observed_access`, `proposed_access`, `permissions_to_confirm`, `unknowns`, `unknown_owner` (who resolves the unknowns), `evidence_refs`, `our_coordinator`, `vendor_action_owner`, `ticket_ref`, `raised_on`, `request_status`, `expected_availability` (a date or `unknown`), `additional_requirements`, `next_action`, `next_action_owner`, `verification` (not-verified, verified, failed), `verified_by`, `verified_on`. I: `affected_workflow`, `shared_request_flag`, `shared_with` (`;`-list of `access_ref`), `consolidated_request_ref` (the `access_ref` that carries the single ticket, set by a lead), `notes_internal`, `proposal_refs`, `last_updated`. |
| Batches (`batches.csv`) | V: `batch_ref`, `vendor`, `use_case_refs`, `released_on`, `due_on` (computed). I: `status` (planned, released, closed), `released_by`, `provisional_limits` (free text such as "3 to 5 use cases, about 5 questions, provisional"), `capacity_notes`, `last_updated`. |

`tracker-schema.csv` has one row per column with the header `tab,column,key,owner,visibility,type,allowed_values`. Types are `text`, `date`, `ref`, `enum`, `list` (`;`-separated) and `url`. Every enum column lists its allowed values separated by `;`. `expected_availability` is a `date` whose one other allowed value is `unknown`. Every tab has at least one key column.

## Column ownership and keys

Every column has exactly one owner class, and `tracker-schema.csv` repeats this table in its `owner` and `key` columns. Spec columns may be set by a proposal. Human columns may only be suggested (or carry an initial suggestion on an `add`). Forbidden columns are never accepted. Computed columns are derived.

| Tab | Keys | spec | human | forbidden | computed |
| --- | --- | --- | --- | --- | --- |
| Use Cases | `use_case_ref`, `use_case_name` | `use_case_name`, `vendor`, `spec_link`, `current_version`, `spec_revision`, `last_change_class`, `grouping_impact`, `mr_link` | `use_case_ref`, `source_ref`, `vendor_contact`, `stage`, `blocked_reason`, `source_status`, `source_owner`, `source_note`, `supporting_documents`, `grouping_impact_lead`, `our_owner`, `next_action`, `next_action_owner`, `workflow_candidate`, `proposal_refs`, `notes_internal` | `acknowledgement_requested_on`, `acknowledged_version`, `acknowledged_on`, `acknowledgement_reference` | `last_updated` |
| Questions | `question_ref` | `use_case_name`, `vendor`, `spec_refs`, `current_spec_text`, `source_links` | `question_ref`, `use_case_ref`, `question_text`, `incorporated_version`, `status`, `resolver`, `closed_reason`, `superseded_by`, `captured_on`, `our_owner`, `text_review`, `blocks_mapping`, `proposal_refs`, `notes_internal` | `batch_ref`, `released_on`, `answer`, `answer_status`, `answered_on`, `answered_by` | `due_on`, `last_updated` |
| Question Groups | `group_ref` | none | all columns except `last_updated` | none | `last_updated` |
| Question Links | `link_ref` | none | all columns except `last_updated` | none | `last_updated` |
| Mappings | `mapping_ref` | `workflow_candidate`, `candidate_source`, `spec_versions_considered`, `shared_behaviors_summary`, `parameter_differences`, `re_review_reason`, `blocking_question_refs` | `mapping_ref`, `use_case_ref`, `mapping_status`, `proposal_refs` | `decision_ref`, `decided_by`, `decided_on` | `last_updated` |
| Identity & Access | `access_ref` | `vendor`, `service`, `endpoint`, `environment`, `auth_type`, `observed_operations`, `identity_reference`, `observed_access`, `proposed_access`, `permissions_to_confirm`, `unknowns`, `evidence_refs`, `shared_request_flag`, `shared_with` | `access_ref`, `use_case_ref`, `unknown_owner`, `our_coordinator`, `vendor_action_owner`, `request_status`, `additional_requirements`, `next_action`, `next_action_owner`, `consolidated_request_ref`, `affected_workflow`, `proposal_refs`, `notes_internal` | `ticket_ref`, `raised_on`, `expected_availability`, `verification`, `verified_by`, `verified_on` | `last_updated` |
| Batches | `batch_ref` | none | `batch_ref`, `vendor`, `use_case_refs`, `status`, `released_by`, `provisional_limits`, `capacity_notes` | `released_on` | `due_on`, `last_updated` |

Notes:

- `request_status` is human, so a skill may only suggest `proposed` or `ready-to-raise` and a lead sets every later status.
- `expected_availability` is forbidden, so a skill leaves it blank and the workbook shows a blank as `unknown`.
- Central reference columns are human because leads assign them.
- No skill writes Question Links, Question Groups or Batches; leads create them.

## References

Central references are assigned by leads only. A tool may print a suggested next reference labelled `suggested` and never reuses or changes an existing one. A proposal never carries a central reference for a new row; it uses the local reference.

| Entity | Central reference | Local reference used in proposals |
| --- | --- | --- |
| Use case | `UC-###`, created up front from the inventory | the use case name |
| Question row (one use case, one question) | `QN-####` | `<use-case-name>/Q<n>`; specification question IDs are never renumbered and an answered row is kept |
| Question group | `QG-###` | none (created by leads) |
| Question link | `QL-####` | `<use-case-name>/Q<n>` plus the group reference or the `similar_to` row |
| Mapping | `MP-###` | `<use-case-name>->>candidate-slug` |
| Access request (one use case and endpoint) | `AX-###` | `<use-case-name>/<endpoint>/<environment>` |
| Batch | `BT-###` | none (never proposed) |
| Decision | `WD-###` | assigned by the lead in the decisions file |

A question row names one use case and one question; the shared grouping, when a lead records it, is the internal `QG-###` group with `QL-####` links.

## Status lists

- **Use case `stage`**: `draft`, `review`, `sent`, `awaiting-acknowledgement`, `acknowledged`. `blocked_reason` and `source_status` are separate fields and not stages. `sent` means the specification and its questions have been released. `awaiting-acknowledgement` means the questions are answered, the new version is lead-verified and acknowledgement of that version has been requested.
- **Use case `source_status`**: `not-screened`, `located`, `not-located` (searched and not found), `empty` (found with no usable script), `confirmed-unavailable` (the vendor or owner confirmed there is none), `uncertain-mapping` (a script exists but it is unclear that it belongs to this use case). Available documents may support preliminary work and never clear a source blocker.
- **Three separate signals.** Behavior acknowledgement (`acknowledged_version`), access approval or provisioning (`request_status`) and verified working access (`verification`) are different columns and are never combined into one status.
- **Question `status`** is the single lifecycle of the row and is set by leads: `captured`, `released`, `clarification-requested` (a lead asked the vendor to clarify), `accepted` (a lead accepted the answer as complete), `incorporated`, `closed` (a lead closed it with a `closed_reason`), `withdrawn`, `superseded`. `superseded_by` names the replacing row, and only a lead replaces a released row.
- **Open and resolved.** A question is **resolved** only at `accepted`, `incorporated`, `closed`, `withdrawn` or `superseded`. `released` and `clarification-requested` are **open**. A response received is shown by an `answer_status` other than `not-answered`, and receiving a response is not resolving the question. There is no `responded` status.
- **Question `answer_status`** (set by the vendor, and only the response): `not-answered`, `answered`, `partially-answered`, `cannot-answer`. A partial answer states in `answer` what is missing.
- **Mapping `mapping_status`**: `candidate`, `pending-clarification`, `accepted`, `rejected`, `re-review-suggested`.
- **Access `request_status`**: `proposed`, `ready-to-raise`, `raised`, `in-progress`, `approved`, `provisioned`, `blocked`, `declined`, `not-needed`. A skill may only suggest `proposed` or `ready-to-raise`; a lead sets the rest.
- **Access `auth_type`**: `website-sign-in`, `api-credential`, `other`, `unknown`. **`verification`**: `not-verified`, `verified`, `failed`.
- **Batch `status`**: `planned`, `released`, `closed`.

## Captured versus released

Captured and released are separate facts, and they are tracked per question row.

- `captured_on` is set when a question row enters the tracker. `released_on` is set only by a lead when its batch is released. A question never has a due date from capture or entry, so no due date exists before release.
- `due_on` is `released_on` plus two working days, per question row. No response, resolver assignment or follow-up ever resets, extends or removes it.
- A working day is Monday to Friday minus an optional holidays file (one `YYYY-MM-DD` date per line).
- **Overdue.** A question row is overdue from day three, meaning when the date is after `due_on`, the row is open (`status` is `released` or `clarification-requested`) and either its `status` is `clarification-requested` or its `answer_status` is `not-answered`, `partially-answered` or `cannot-answer`.
- **Follow-up.** A `partially-answered` or `cannot-answer` row stays open with its original due date visible, stays overdue, and is also a follow-up for a lead. Follow-up and overdue can both apply. A `cannot-answer` row stays open until a lead assigns a `resolver` or explicitly closes it with a `closed_reason`, and assigning a `resolver` alone does not mean it is answered or resolved.
- **Awaiting lead review.** A complete answer (`answered`) waiting for a lead's review (`status` is `released`) is not vendor-overdue. It is shown as awaiting lead review with its owner (`our_owner`) and its age (days since `answered_on`).
- **Clarification requested.** When a lead sets `clarification-requested`, the row stays open on its original `due_on` and can be overdue even though the vendor's `answer_status` is `answered`. The lead never edits the vendor-owned `answer_status`; the lead-owned `status` carries the lead's state.

## Answers belong to their own row

- A question that concerns several use cases is several question rows, one per use case, each with its own `answer`, `answer_status`, `answered_on` and `answered_by`. Differences between use cases stay visible, and an incomplete answer shows on the row it belongs to.
- Grouping is internal. A lead may record that rows ask the same thing in Question Groups and Question Links. The reconciler may suggest links and no skill proposes them. A link never copies, shares or inherits an answer, and a newly linked or newly added row starts with a blank answer.
- Whether a vendor may mark a row `same as` another row, or a lead may prefill a reviewed answer, is an open decision; the contract has no column for either.
- The wording the vendor was shown is `question_text`. A later specification edit is written to `current_spec_text` and flagged in `text_review` (`wording-edit` keeps the row's identity; `possible-meaning-change` goes to a lead). No tool changes `question_text` or withdraws and replaces a released row.

## Grouping impact

A change to a use case's specification has two separate assessments: `last_change_class` (did behavior change) and `grouping_impact` (could the change affect the use case's grouping). A behavior change does not necessarily affect grouping. The proposer suggests the impact with a short reason carried in the proposal row's `reason` (not a tracker column), and a lead may override it with `grouping_impact_lead`. A tool uses the lead's override when set and otherwise the suggestion. `unknown` is never treated as no impact: it stays visible and is listed for a lead. Existing lead decisions are never changed by the assessment.

## Proposal file

A proposal is a file named `tracker-updates.csv`.

- **Encoding.** UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting, LF line ends and one header row.
- **Columns.** Long format, one row per field, so a single file can address several tabs: `update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`. `tracker-updates-template.csv` holds this header only.
- **`update_id`** is `<proposal_id>:<tab>:<record_key>:<field>`. It is composed and not hashed, so regenerating the same content gives the same IDs.
- **`record_key`** is the local reference from the References table; a proposal never carries a central reference for a new row.
- **`operation`** is one of:
  - `add`: one row per field of a new record.
  - `set`: changes a field of an existing record and carries `base_value`, the value the proposer saw.
  - `link`: adds a reference to a list field of an existing record (for example `shared_with` or `source_links`) without replacing the list. It never targets Question Links.
  - `suggest`: offers a value for a human-owned field of an existing record.
- **Field classes.** Only spec fields are set. Human fields are only suggested (or given an initial suggestion on an `add`) and a non-empty value is never overwritten. Forbidden and computed fields are never accepted.
- **`source`** is a specification path with `@version#anchor`, a script path `@revision:place`, an inventory or source-screening reference (`inventory:<row>` or `source-screen:<path>`) for source-screening rows, or a dependency evidence reference for access rows. Every row is traceable to a specification, to inventory or source-screening evidence, or to dependency evidence. Source-screening and access rows need no specification.
- **Location.** `tracker-updates/<proposal-id>/tracker-updates.csv`, where `<proposal-id>` is the MR number or branch slug. Each skill rewrites only the rows of its own tabs in its own proposal directory: the proposer owns Use Cases and Questions; access discovery owns Identity & Access; the recommender owns Mappings.
- **Never applied.** Proposals live outside the authoritative tracker until a lead has reviewed them and applied the reconciler's output by hand. A proposal never releases a question or applies itself.

## Export format

An export is one CSV per tab, named as in the Tabs and columns table, with the schema's column names. Extra lead columns are allowed and preserved. It also holds `manifest.csv` with the columns `scope` (`internal` or a vendor slug), `workbook`, `exported_at` and `exported_by`. Dates are `YYYY-MM-DD`. Multi-value fields are `;`-separated.

## Deployment prerequisites

Separate vendor access is a deployment prerequisite and not an implementation blocker. Each vendor workbook is a separate file shared only with that vendor, and no internal analysis (mappings, recommendations, decisions, proposals, exports, groups and links) is stored where a vendor can read it. Hidden tabs or folders do not count as separation. The vendor storage and repository choice is deferred to the client's confirmation and is settled before the first release to a vendor. Nothing in this contract depends on that choice. Broader network connectivity and environment setup are outside this contract, which has no column for them.
