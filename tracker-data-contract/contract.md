# Contract

## Contract

This is the specification the builder turns into `tracker-data-contract.md`, `tracker-schema.csv`, `workbook-layout-guide.md`, `tracker-updates-template.csv` and `use-case-inventory-template.csv`. The contract and schema are copied byte for byte into each skill folder that uses them, and the lead tools read the schema from this component's file.

### Vocabulary

- A **use case** is what the business needs done. It carries the vendor's own name, and the vendor with that name is its identity, written as its use case ID.
- A **script** (or job script) is the vendor's current implementation of a use case.
- A **workflow** is one reusable implementation on our platform that supports several use cases through configuration. Workflows and grouping appear only in internal files, never in a vendor-readable file.

### Ownership classes (schema column `owner`)

| Class | Meaning |
| --- | --- |
| spec | A proposal may set it, after the conflict checks. |
| human | A proposal may only `suggest` it on an existing record, and an `add` for a new record may carry an initial value as a suggestion that a lead copies by hand. A non-empty value is never overwritten. |
| forbidden | Never accepted from a proposal: `released_on`, `batch_ref`, `answer`, `answer_status`, `answered_on`, `answered_by`, acknowledgement fields, `ticket_ref`, `raised_on`, `expected_availability`, `verification` fields, and decision fields (`decision_ref`, `decided_by`, `decided_on`). |
| computed | Derived and never stored from a proposal (`due_on`). |

### Visibility classes (schema column `visibility`)

`vendor` columns appear in a vendor workbook. `internal` columns never do. Row rule: a vendor sees only its own rows, and a Questions row only after `released_on` is set. The Question Groups, Question Links and Mappings tabs never appear in a vendor workbook, and no vendor column or row refers to an unreleased question, a group or another vendor's row. No secret value appears in any file.

### Tabs and columns

CSV file names are kebab-case, one file per tab. V is vendor-visible, I is internal.

| Tab (file) | Columns |
| --- | --- |
| Use Cases (`use-cases.csv`) | V: `use_case_ref`, `use_case_name` (natural key, never renamed), `vendor`, `source_ref` (may be empty when the source is not located), `spec_link`, `current_version`, `spec_revision`, `vendor_contact`, `acknowledgement_requested_on`, `acknowledged_version`, `acknowledged_on`, `acknowledgement_reference`. I: `stage`, `blocked_reason`, `source_status` (not-screened, located, not-located, empty, confirmed-unavailable, uncertain-mapping), `source_owner` (who must locate or confirm the source), `source_note`, `supporting_documents` (`;`-list of tagged documents that allow preliminary work), `last_change_class` (behavior-change, non-behavior-change; set by the proposer for the latest specification change), `grouping_impact` (could-affect, not-expected, unknown; the skill's suggestion, separate from the change class, with its short reason carried in the proposal row's `reason`), `grouping_impact_lead` (could-affect, no-impact; a lead's override, human-owned and blank until set), `our_owner`, `next_action`, `next_action_owner`, `workflow_candidate`, `mr_link`, `proposal_refs`, `notes_internal`, `last_updated`. |
| Questions (`questions.csv`) | One row per use case per question, and it is the only question sheet a vendor sees. V (released rows only): `question_ref`, `use_case_ref`, `use_case_name`, `vendor`, `spec_refs` (one specification question, for example `uc-example-vendor-website-availability-check/Q3@v1`), `question_text` (the wording as released), `batch_ref`, `released_on`, `due_on` (computed), `answer`, `answer_status` (not-answered, answered, partially-answered, cannot-answer), `answered_on`, `answered_by`, `incorporated_version`. I: `status`, `resolver` (who a lead assigned to resolve it), `closed_reason`, `superseded_by`, `captured_on`, `our_owner`, `current_spec_text` (the specification's latest wording), `text_review` (none, wording-edit, possible-meaning-change), `blocks_mapping` (yes, no, unknown), `source_links`, `proposal_refs`, `notes_internal`, `last_updated`. |
| Question Groups (`question-groups.csv`), internal tab only | I: `group_ref`, `canonical_text`, `our_owner`, `notes_internal`, `last_updated`. A group is a lead's record that several question rows ask the same thing. |
| Question Links (`question-links.csv`), internal tab only; no skill proposes rows for it, and a lead copies the reconciler's link suggestions by hand | I: `link_ref`, `group_ref`, `question_ref`, `link_status` (suggested, confirmed, rejected), `similar_to` (the question row the tool compared with), `match_note`, `reviewed_by`, `reviewed_on`, `proposal_refs`, `last_updated`. |
| Mappings (`mappings.csv`), internal tab only | I: `mapping_ref`, `use_case_ref`, `workflow_candidate`, `candidate_source` (behavior-comparison, prior-analysis, both), `mapping_status`, `decision_ref`, `decided_by`, `decided_on`, `spec_versions_considered`, `blocking_question_refs`, `shared_behaviors_summary`, `parameter_differences`, `re_review_reason`, `proposal_refs`, `last_updated`. |
| Identity & Access (`identity-access.csv`) | One row per use case and endpoint (and environment). V: `access_ref`, `vendor`, `use_case_ref`, `service`, `endpoint`, `environment`, `auth_type` (website-sign-in, api-credential, other, unknown), `observed_operations`, `identity_reference` (names and variable references only, never values), `observed_access`, `proposed_access`, `permissions_to_confirm`, `unknowns`, `unknown_owner` (who resolves the unknowns), `evidence_refs`, `our_coordinator`, `vendor_action_owner`, `ticket_ref`, `raised_on`, `request_status`, `expected_availability` (a date or `unknown`), `additional_requirements`, `next_action`, `next_action_owner`, `verification` (not-verified, verified, failed), `verified_by`, `verified_on`. I: `affected_workflow`, `shared_request_flag`, `shared_with` (`;`-list of `access_ref`), `consolidated_request_ref` (the `access_ref` that carries the single ticket, set by a lead), `notes_internal`, `proposal_refs`, `last_updated`. |
| Batches (`batches.csv`) | V: `batch_ref`, `vendor`, `use_case_refs`, `released_on`, `due_on` (computed). I: `status` (planned, released, closed), `released_by`, `provisional_limits` (free text such as "3 to 5 use cases, about 5 questions, provisional"), `capacity_notes`, `last_updated`. |

`tracker-schema.csv` has one row per column with the header `tab,column,key,owner,visibility,type,allowed_values`. Types are `text`, `date`, `ref`, `enum`, `list` (`;`-separated) and `url`. Every tab has at least one key column.

### Column ownership and keys

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

Notes: `request_status` is human, so a skill may only suggest `proposed` or `ready-to-raise` and a lead sets every later status. `expected_availability` is forbidden, so a skill leaves it blank and the workbook shows a blank as `unknown`. Central reference columns are human because leads assign them. The Question Links, Question Groups and Batches tabs are never written by a skill.

### References

Central references are assigned by leads only. A tool may print a suggested next reference labelled `suggested` and never reuses or changes an existing one.

The **use case ID** is `uc-<vendor-slug>-<use-case-slug>`: the vendor and the use case name, each reduced to a slug (lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed). It is derived from the `vendor` and `use_case_name` columns and never stored in a column. It needs a non-empty vendor and a non-empty slug for both parts; with either missing there is no ID, so a skill asks for the vendor once and writes no keyed row until it is known. The use case ID is also the proposal ID the discovery orchestrator derives for a folder, which points here for the definition. The use case name stays the readable name in the `use_case_name` column of Use Cases and Questions and is still the vendor's own name for the use case.

| Entity | Central reference | Local reference used in proposals |
| --- | --- | --- |
| Use case | `UC-###`, created up front from the inventory | the use case ID |
| Question row (one use case, one question) | `QN-####` | `<use-case-id>/Q<n>`; specification question IDs are never renumbered and an answered row is kept |
| Question group | `QG-###` | none (created by leads) |
| Question link | `QL-####` | `<use-case-id>/Q<n>` plus the group reference or the `similar_to` row |
| Mapping | `MP-###` | `<use-case-id>->>candidate-slug` |
| Access request (one use case and endpoint) | `AX-###` | `<use-case-id>/<endpoint>/<environment>` |
| Batch | `BT-###` | none (never proposed) |
| Decision | `WD-###` | assigned by the lead in the decisions file |

- `spec_refs` entries are `<use-case-id>/Q<n>@v<version>`, for example `uc-example-vendor-website-availability-check/Q3@v1`; a tool matches a Questions row by the entry without its `@v` suffix, which equals the question's local reference.

### Status lists

- Use case `stage`: `draft`, `review`, `sent`, `awaiting-acknowledgement`, `acknowledged`. `blocked_reason` and `source_status` are separate fields and not stages. `sent` means the specification and its questions have been released. `awaiting-acknowledgement` means the questions are answered, the new version is lead-verified and acknowledgement of that version has been requested. Behavior acknowledgement (`acknowledged_version`), access approval or provisioning (`request_status`) and verified working access (`verification`) are different columns and are never combined.
- Use case `source_status`: `not-screened`, `located`, `not-located` (searched and not found), `empty` (found with no usable script), `confirmed-unavailable` (the vendor or owner confirmed there is none), `uncertain-mapping` (a script exists but it is unclear that it belongs to this use case). Available documents may support preliminary work and never clear a source blocker.
- Question `status` is the single lifecycle of the row and is set by leads: `captured`, `released`, `clarification-requested` (a lead asked the vendor to clarify), `accepted` (a lead accepted the answer as complete), `incorporated`, `closed` (a lead closed it with a `closed_reason`), `withdrawn`, `superseded`. `superseded_by` names the replacing row, and only a lead replaces a released row. A question is **resolved** only at `accepted`, `incorporated`, `closed`, `withdrawn` or `superseded`; `released` and `clarification-requested` are **open**. A response received is shown by `answer_status` other than `not-answered`, and receiving a response is not resolving the question.
- Question `answer_status` (set by the vendor, and only the response): `not-answered`, `answered`, `partially-answered`, `cannot-answer`. A partial answer states in `answer` what is missing.
- Mapping `mapping_status`: `candidate`, `pending-clarification`, `accepted`, `rejected`, `re-review-suggested`.
- Access `request_status`: `proposed`, `ready-to-raise`, `raised`, `in-progress`, `approved`, `provisioned`, `blocked`, `declined`, `not-needed`. A skill may only suggest `proposed` or `ready-to-raise`; a lead sets the rest.

### Captured versus released

- `captured_on` is set when a question row enters the tracker. `released_on` is set only by a lead when its batch is released.
- `due_on` is `released_on` plus two working days, per question row, and no response, resolver assignment or follow-up ever resets, extends or removes it. A question is overdue from day three, meaning when the date is after `due_on`, the row is open (`status` `released` or `clarification-requested`) and either its `status` is `clarification-requested` or its `answer_status` is `not-answered`, `partially-answered` or `cannot-answer`.
- A `partially-answered` or `cannot-answer` row stays open with its original due date visible, stays overdue, and is also a follow-up for a lead; follow-up and overdue can both apply. A `cannot-answer` row stays open until a lead assigns a `resolver` or explicitly closes it, and assigning a `resolver` alone does not mean it is answered or resolved.
- A complete answer (`answered`) waiting for a lead's review (`status` `released`) is not vendor-overdue and is shown as awaiting lead review with its owner (`our_owner`) and its age (days since `answered_on`). When a lead sets `clarification-requested`, the row stays open on its original `due_on` and can be overdue even though the vendor's `answer_status` is `answered`. The lead never edits the vendor-owned `answer_status`; the lead-owned `status` carries the lead's state. (Confirmed by the user, replacing an earlier planner detail.)
- A working day is Monday to Friday minus an optional holidays file (one `YYYY-MM-DD` date per line). A question never gets a due date from capture or entry.

### Answers belong to their own row

- A question that concerns several use cases is several question rows, one per use case, each with its own `answer`, `answer_status`, `answered_on` and `answered_by`. Differences between use cases stay visible, and an incomplete answer shows on the row it belongs to.
- Grouping is internal. Leads may record that rows ask the same thing in Question Groups and Question Links, and the reconciler may suggest links and no skill proposes them. A link never copies, shares or inherits an answer, and a newly linked or newly added row starts with a blank answer.
### Grouping impact

A change to a use case's specification has two separate assessments: `last_change_class` (did behavior change) and `grouping_impact` (could the change affect the use case's grouping). A behavior change does not necessarily affect grouping. The proposer suggests the impact with a short reason carried in the proposal row's `reason` (not a tracker column), and a lead may override it with `grouping_impact_lead`. A tool uses the lead's override when set and otherwise the suggestion. `unknown` is never treated as no impact: it stays visible and is listed for a lead. Existing lead decisions are never changed by the assessment.

### Answers belong to their own row (continued)

- Whether a vendor may mark a row `same as` another row, or a lead may prefill a reviewed answer, is an open decision; the contract has no column for either.
- The wording the vendor was shown is `question_text`. A later specification edit is written to `current_spec_text` and flagged in `text_review` (`wording-edit` keeps the row's identity; `possible-meaning-change` goes to a lead). No tool changes `question_text` or withdraws and replaces a released row.

### Proposal file (`tracker-updates.csv`)

- Encoding: UTF-8 without a byte order mark, comma-separated, RFC 4180 quoting, LF line ends and one header row.
- Long format, one row per field, so a single file can address several tabs. Columns: `update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`.
- `update_id` is `<proposal_id>:<tab>:<record_key>:<field>`. It is composed and not hashed, so regenerating the same content gives the same IDs.
- `record_key` is the local reference from the table; a proposal never carries a central reference for a new row, and a reference in the use case name form or in the slug-alone form is not valid.
- `operation` is `add` (one row per field of a new record), `set` (carries `base_value`), `link`, or `suggest` (for human-owned fields).
- `source` is a specification path with `@version#anchor`, a script path `@revision:place`, an inventory or source-screening reference (`inventory:<row>` or `source-screen:<path>`) for source-screening rows, or a dependency evidence reference for access rows. Every row is traceable to a specification, to inventory or source-screening evidence, or to dependency evidence. Source-screening and access rows need no specification.
- Location: `tracker-updates/<proposal-id>/tracker-updates.csv`, where `<proposal-id>` is the MR number or branch slug. Each skill rewrites only the rows of its own tabs in its own proposal directory: the proposer owns Use Cases and Questions; access discovery owns Identity & Access; the recommender owns Mappings.
- Proposals live outside the authoritative tracker until a lead has reviewed them and applied the reconciler's output by hand. A proposal never releases a question or applies itself.

### Export format

One CSV per tab named as above, with the schema's column names (extra lead columns are allowed and preserved), plus `manifest.csv` with `scope` (`internal` or a vendor slug), `workbook`, `exported_at` and `exported_by`. Dates are `YYYY-MM-DD`. Multi-value fields are `;`-separated.

### Workbook layout (for `workbook-layout-guide.md`)

Separate vendor access is a deployment prerequisite, not an implementation blocker: each vendor workbook is a separate file shared only with that vendor, and no internal analysis (mappings, recommendations, decisions, proposals, exports, groups and links) is stored where a vendor can read it. Hidden tabs or folders do not count as separation. The vendor storage and repository choice is deferred to the client's confirmation and is settled before the first release to a vendor. One internal master workbook on SharePoint is authoritative for everything. Each vendor gets a workbook with only its own rows and its vendor-visible columns, including one simple Questions sheet of its own released rows. The vendor edits only `answer`, `answer_status`, `answered_on` and `answered_by` on a question row, the acknowledgement fields on its use case and the vendor-side access fields. After each vendor edit a lead copies those fields row for row into the master, matching on `question_ref`, `use_case_ref` or `access_ref`, then reviews each row for completeness and sets `status` (`accepted` or `clarification-requested`) and, for a cannot-answer row, a `resolver` or a `closed_reason`. A response that is partial or cannot-answer stays open. The guide gives each tab's columns, drop-down lists for the status fields, the due-date formula (release plus two working days), the vendor-view rule, the manual apply steps for the reconciler's output, and the use case inventory template (`use_case_name,vendor,source_ref`, where the `vendor` value is required because the use case ID derives from it, and an empty `source_ref` means the source is not located), which the lead pastes into the Use Cases tab. The inventory is a list and not a prerequisite analysis.

## Planned change: proposal file shape rules

The rules above are added to the Proposal file section of `tracker-data-contract.md`; nothing else in the contract changes. After the build the three skill copies are recopied byte for byte.
