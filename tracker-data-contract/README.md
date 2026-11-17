# Tracker Data Contract

## Purpose

The one shared data contract for the use case tracker: tabs, columns, references, status lists, vendor visibility, the proposal file format and the export format, with a guide for building the SharePoint workbooks, so every skill and tool reads and writes the same shapes.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Tracker Data Contract**

- [Design](#design)
  - [Diagram](#diagram)
- [Behavior](#behavior)
- [Plan](#plan)
  - [Planned Navigation](#planned-navigation)
  - [Planned Design](#planned-design)
    - [Planned Diagram](#planned-diagram)
  - [Steps](#steps)
  - [Acceptance Mapping](#acceptance-mapping)
  - [Assumptions And Open Questions](#assumptions-and-open-questions)
  - [Planned Relationships](#planned-relationships)
  - [Planned Links](#planned-links)
- [Relationships](#relationships)
- [Links](#links)

## Design

The component is five shared files and one internal checklist, all plain Markdown and CSV with no code: [tracker-data-contract](tracker-data-contract.md) (the contract prose), [tracker-schema](tracker-schema.csv) (one row per column: tab, column, key, owner, visibility, type, allowed values), [workbook-layout-guide](workbook-layout-guide.md), the header-only [tracker-updates-template](tracker-updates-template.csv) and [use-case-inventory-template](use-case-inventory-template.csv), and [review-checklist](review-checklist.md) (one item per behavior). [contract.md](contract.md#contract) is the specification they were written from. The contract and the schema are copied byte for byte into every skill folder that uses them, and the lead tools read the schema from this component's file, so the shapes live in one place. A use case's identity is the use case ID `uc-<vendor-slug>-<use-case-slug>`, defined once in the contract's References section and derived from the `vendor` and `use_case_name` columns, so two vendors' use cases with the same name do not collide; every local reference and `spec_refs` entry is built from it.

Questions are one row per use case per question with separate answers; grouping is internal in two extra tabs (Question Groups, Question Links). Use cases carry a source status so missing source is visible from the start, and access requests are one row per use case and endpoint.

Assumptions (override any of them in chat):

1. This is its own component, not part of the root, because every skill and tool consumes it.
2. A use case's identity is its use case ID `uc-<vendor-slug>-<use-case-slug>`, derived from `vendor` and `use_case_name` and never stored; every local reference is built from it, and the vendor is required. Central references `UC-###`, `QN-####`, `QG-###`, `QL-####`, `MP-###`, `AX-###`, `BT-###` and `WD-###` are the proposal; a lead names other prefixes if wanted. `QN-####` names a row for one use case and one question.
3. The contract is a design record, not a runtime. No workbook is built here; a lead builds the SharePoint workbooks by hand from the guide.
4. The vendor's `answer_status` values (`not-answered`, `answered`, `partially-answered`, `cannot-answer`) record only the response. The question `status` is one lifecycle set by leads (`clarification-requested` and `closed` exist; there is no `responded` status or `answer_review` column), and `resolver` and `closed_reason` record how a cannot-answer row is resolved. A complete answer awaiting review is not vendor-overdue.
5. The `source_status`, `source_owner`, `source_note`, `supporting_documents`, `last_change_class`, `grouping_impact`, `grouping_impact_lead`, `resolver`, `closed_reason`, `unknown_owner` and `consolidated_request_ref` columns carry the missing-source, access, resolution and grouping-impact rules. The grouping impact is separate from the change class and `unknown` stays visible.
6. Open and not in the contract: the optional `same as` shortcut, any lead prefill of a reviewed answer, the real inventory counts and repository layout, and broader network connectivity and environment setup (deferred until the user decides after the developer sample sheet).
7. `request_status` is human (a skill may only suggest `proposed` or `ready-to-raise`) and `expected_availability` is forbidden (a skill leaves it blank and the workbook shows `unknown`).
8. No skill writes Question Links, Question Groups or Batches; leads create them and copy the reconciler's link suggestions by hand.
9. Separate vendor access is a deployment prerequisite, not an implementation blocker; the vendor storage choice is deferred to the client and settled before the first release.
10. Build decisions: the `link` proposal operation means adding a reference to a list field of an existing record and never targets Question Links; the vendor-side access fields a vendor edits are `vendor_action_owner` and `additional_requirements` (the contract names them only as "vendor-side access fields"); the vendor workbook holds Use Cases, Questions and Identity & Access only, with no Batches tab (the Batches columns keep their `V` marks); a lead sets `acknowledgement_requested_on` and the vendor edits only the other three acknowledgement fields; the schema `visibility` values are `V` and `I`, as the contract's Tabs table writes them; the overdue, follow-up, awaiting-review and age rules are given as helper columns in the guide, outside the contract's columns. Override any of these in chat.

The schema is checked by a one-off script run at build time, not kept in the component: every tab has a key, every column of the contract's tables appears exactly once and in order, owner classes are only spec, human, forbidden or computed, keys and owner classes match the ownership table, enums carry values, and the files pass the hygiene scan. Re-run an equivalent check when the contract changes.

### Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  contract["tracker-data-contract"]:::file
  schema["tracker-schema"]:::file
  guide["workbook-layout-guide"]:::file
  upd["tracker-updates-template"]:::file
  inv["use-case-inventory-template"]:::file
  chk["review-checklist"]:::file
  chk -->|"validates"| contract
  chk -->|"validates"| schema
  chk -->|"validates"| guide
  contract -->|"defines the proposal columns of"| upd
  guide -->|"explains how to use"| inv
  click contract "tracker-data-contract.md"
  click schema "tracker-schema.csv"
  click guide "workbook-layout-guide.md"
  click upd "tracker-updates-template.csv"
  click inv "use-case-inventory-template.csv"
  click chk "review-checklist.md"
  classDef file stroke:#333
```

## Behavior

- **B01** When a column is looked up in `tracker-schema.csv`, then it has tab, name, key flag, owner class, visibility, type and allowed values, and every tab has at least one key. (untested: benchmark pending)
- **B02** When a reference is created, then central references follow the contract's scheme (a question row per use case and question, a question group, a link, an access request per use case and endpoint) and are assigned by leads only, and proposals use local references built from the use case ID (`uc-<vendor-slug>-<use-case-slug>`, derived from `vendor` and `use_case_name` and never stored) and carry no central reference for a new row; a reference in the name-only or slug-only form is not valid. (untested: benchmark pending)
- **B03** When statuses are read, then each list is defined with its meaning (including the source status of a use case, the grouping impact, the vendor's answer status and whether a question is resolved), and behavior acknowledgement, access approval or provisioning, and verified access are separate fields that are never combined. (untested: benchmark pending)
- **B04** When a question row is captured and later released, then `captured_on` and `released_on` are separate, `due_on` is release plus two working days per row and no response or resolver resets it, a row is overdue from day three while it is open and either not completely answered or in `clarification-requested`, a partial or cannot-answer row stays open and overdue with its original due date and is also a follow-up until a lead resolves or closes it, a complete answer awaiting lead review is not vendor-overdue and shows its owner and age, and no due date exists before release. (untested: benchmark pending)
- **B05** When a proposal file is written, then the contract defines its encoding, columns, operations, `update_id` composition and location, the spec, human, forbidden and computed field classes, and that every row traces to a specification or to dependency evidence and a proposal never releases or applies anything. It also defines that every row has exactly 12 fields, the file ends with one line feed and uses LF line ends with no byte order mark, a stage that appends to a shared file first makes sure the file ends with a line feed, a blank `base_value` stays blank (on a `set` it means the field was blank when seen), the record key form of each tab and the candidate slug rule (each run of characters outside `a-z` and `0-9` becomes one `-`). (untested: benchmark pending)
- **B06** When an export is made, then it is one CSV per tab with a manifest, and extra lead columns are allowed and preserved. (untested: benchmark pending)
- **B07** When a vendor view is built, then only that vendor's rows and vendor-visible columns appear, question rows appear only after release with no group, link or other-row reference, mappings and cross-vendor information never appear, and no secret value appears anywhere. (untested: benchmark pending)
- **B08** When a question concerns several use cases, then each use case has its own question row with its own answer and answer status, grouping is internal, and no answer is copied to or inherited by another row, so a new or newly linked row starts blank. (untested: benchmark pending)
- **B09** When a lead builds the workbooks, then `workbook-layout-guide.md` gives the tabs, the vendor's single Questions sheet, the validation lists, the vendor-view rule, the due-date formula, the manual vendor-to-master copy steps, the manual apply steps and the inventory template. (untested: benchmark pending)
- **B10** When the files are scanned, then they contain no Craft term, no real vendor data and no secret. (untested: benchmark pending)

## Plan

### Planned Navigation

[Job Behavior Specifications](../README.md#plan) / **Tracker Data Contract**

- [Planned Design](#planned-design)
  - [Planned Diagram](#planned-diagram)
- [Steps](#steps)
- [Acceptance Mapping](#acceptance-mapping)
- [Assumptions And Open Questions](#assumptions-and-open-questions)
- [Planned Relationships](#planned-relationships)
- [Planned Links](#planned-links)

### Planned Design

Only the Proposal file section of [tracker-data-contract.md](tracker-data-contract.md#design) gains rules; the schema CSV, the references and the statuses do not change. The copies of the contract and schema held by the three proposal-writing skills must be recopied after this build so the root `B05` test stays green; that is each skill's own task. Wording is aligned with the Tracker Reconciler's `slug()` so the contract and the tools agree on the candidate slug and on the four key forms.

#### Planned Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  contract["tracker-data-contract.md"]
  rules["proposal file shape rules"]:::planned
  copies["copies in the three skills"]
  contract -->|"holds"| rules
  contract -->|"is copied byte for byte to"| copies
  classDef planned stroke-dasharray: 5 5,stroke:#2563eb
```

### Steps

1. In the Proposal file section of `tracker-data-contract.md`, add the rules: exactly 12 fields per row; one final line feed, LF only, no byte order mark; a stage that appends first makes sure the file ends with a line feed; a blank `base_value` stays blank and on a `set` means the field was blank when seen; the key form of each tab; the candidate slug rule.
2. Align the wording of the candidate slug with the reconciler's rule and update `contract.md`, `requirements.md` and the README Design and `B05`.
3. Do not touch `tracker-schema.csv`. The skills' copies are recopied by their own tasks; run the root `B05` test last as the check.
4. Dissolve this Plan into Design.

### Acceptance Mapping

| Acceptance | Behaviors | Step | Check |
| --- | --- | --- | --- |
| The Proposal file section states the shape rules, the blank base value and the key forms | B05 | 1, 2 | file review and the root scan |
| No Craft term, no real data, schema unchanged | B10 | 3 | the scan in `review-checklist.md` |

### Assumptions And Open Questions

Assumptions (override any in chat):

1. **Policy and scope.** Planned under `deciding-what-to-ask`; the change is part of one request (validation of proposal files) that also touches the other components named in the root request, each planned in its own README. Nothing is built.
2. **Choices.** An empty `base_value` stays blank (no dot); on a `set` a blank `base_value` means the field was blank when seen. The exact 12-field check and the final-line-feed check catch a lost trailing field and a fused row. Validation lives in the existing Tracker Reconciler `validate` command; the exporter shares its loader and gains no new mode. Recorded from the user's answers of 2026-11-17.
3. **Copy order.** This component is built first; the three skills then recopy the contract. Until they do, the root `B05` test fails by design.

Open questions: none. The behavior changes and the choices on the base value (kept blank, with checks) and on the pack skills (a self-check checklist, the validator optional) were confirmed by the user on 2026-11-17.

### Planned Relationships

- [Tracker Update Proposer](../tracker-update-proposer/README.md#purpose), [Identity Access Discovery](../identity-access-discovery/README.md#purpose) and [Workflow Recommender](../workflow-recommender/README.md#purpose) — hold byte-identical copies, recopied after this build.
- [Tracker Reconciler](../tracker-tools/tracker-reconciler/README.md#purpose) — enforces these rules.

### Planned Links

- [requirements.md](requirements.md#requirements) — what the change must do, with the planned change section.
- [contract.md](contract.md#contract) — the interface, with the planned change section.

## Relationships

- It depends on nothing outside its lineage. It is used by its siblings [Tracker Update Proposer](../tracker-update-proposer/README.md#purpose), [Identity Access Discovery](../identity-access-discovery/README.md#purpose), [Workflow Recommender](../workflow-recommender/README.md#purpose) and [Tracker Tools](../tracker-tools/README.md#purpose), which read and write the shapes defined here.

## Links

- [requirements.md](requirements.md#requirements) — what the component must do and what it need not.
- [contract.md](contract.md#contract) — the shapes, formats and wording rules.
- [tracker-data-contract.md](tracker-data-contract.md) — the contract prose, copied into the skill folders.
- [tracker-schema.csv](tracker-schema.csv) — the machine-readable column schema.
- [workbook-layout-guide.md](workbook-layout-guide.md) — how a lead builds and maintains the workbooks by hand.
- [tracker-updates-template.csv](tracker-updates-template.csv) — the proposal file header.
- [use-case-inventory-template.csv](use-case-inventory-template.csv) — the inventory header.
- [review-checklist.md](review-checklist.md) — the internal file review, one item per behavior.
