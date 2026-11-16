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
  - [Planned Behavior](#planned-behavior)
  - [Steps](#steps)
  - [Acceptance Mapping](#acceptance-mapping)
  - [Assumptions And Open Questions](#assumptions-and-open-questions)
  - [Planned Relationships](#planned-relationships)
  - [Planned Links](#planned-links)
- [Relationships](#relationships)
- [Links](#links)

## Design

The component is five shared files and one internal checklist, all plain Markdown and CSV with no code: [tracker-data-contract](tracker-data-contract.md) (the contract prose), [tracker-schema](tracker-schema.csv) (one row per column: tab, column, key, owner, visibility, type, allowed values), [workbook-layout-guide](workbook-layout-guide.md), the header-only [tracker-updates-template](tracker-updates-template.csv) and [use-case-inventory-template](use-case-inventory-template.csv), and [review-checklist](review-checklist.md) (one item per behavior). [contract.md](contract.md#contract) is the specification they were written from. The contract and the schema are copied byte for byte into every skill folder that uses them, and the lead tools read the schema from this component's file, so the shapes live in one place.

Questions are one row per use case per question with separate answers; grouping is internal in two extra tabs (Question Groups, Question Links). Use cases carry a source status so missing source is visible from the start, and access requests are one row per use case and endpoint.

Assumptions (override any of them in chat):

1. This is its own component, not part of the root, because every skill and tool consumes it.
2. Central references `UC-###`, `QN-####`, `QG-###`, `QL-####`, `MP-###`, `AX-###`, `BT-###` and `WD-###` are the proposal; a lead names other prefixes if wanted. `QN-####` names a row for one use case and one question.
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
- **B02** When a reference is created, then central references follow the contract's scheme (a question row per use case and question, a question group, a link, an access request per use case and endpoint) and are assigned by leads only, and proposals use local references and carry no central reference for a new row. (untested: benchmark pending)
- **B03** When statuses are read, then each list is defined with its meaning (including the source status of a use case, the grouping impact, the vendor's answer status and whether a question is resolved), and behavior acknowledgement, access approval or provisioning, and verified access are separate fields that are never combined. (untested: benchmark pending)
- **B04** When a question row is captured and later released, then `captured_on` and `released_on` are separate, `due_on` is release plus two working days per row and no response or resolver resets it, a row is overdue from day three while it is open and either not completely answered or in `clarification-requested`, a partial or cannot-answer row stays open and overdue with its original due date and is also a follow-up until a lead resolves or closes it, a complete answer awaiting lead review is not vendor-overdue and shows its owner and age, and no due date exists before release. (untested: benchmark pending)
- **B05** When a proposal file is written, then the contract defines its encoding, columns, operations, `update_id` composition and location, the spec, human, forbidden and computed field classes, and that every row traces to a specification or to dependency evidence and a proposal never releases or applies anything. (untested: benchmark pending)
- **B06** When an export is made, then it is one CSV per tab with a manifest, and extra lead columns are allowed and preserved. (untested: benchmark pending)
- **B07** When a vendor view is built, then only that vendor's rows and vendor-visible columns appear, question rows appear only after release with no group, link or other-row reference, mappings and cross-vendor information never appear, and no secret value appears anywhere. (untested: benchmark pending)
- **B08** When a question concerns several use cases, then each use case has its own question row with its own answer and answer status, grouping is internal, and no answer is copied to or inherited by another row, so a new or newly linked row starts blank. (untested: benchmark pending)
- **B09** When a lead builds the workbooks, then `workbook-layout-guide.md` gives the tabs, the vendor's single Questions sheet, the validation lists, the vendor-view rule, the due-date formula, the manual vendor-to-master copy steps, the manual apply steps and the inventory template. (untested: benchmark pending)
- **B10** When the files are scanned, then they contain no Craft term, no real vendor data and no secret. (untested: benchmark pending)

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

## Plan

### Planned Navigation

[Job Behavior Specifications](../README.md#plan) / **Tracker Data Contract**

- [Planned Design](#planned-design)
- [Planned Behavior](#planned-behavior)
- [Steps](#steps)
- [Acceptance Mapping](#acceptance-mapping)
- [Assumptions And Open Questions](#assumptions-and-open-questions)
- [Planned Relationships](#planned-relationships)
- [Planned Links](#planned-links)

### Planned Design

One shared identity for a use case, so two vendors' use cases with the same name no longer collide. The contract defines the use case ID `uc-<vendor-slug>-<use-case-slug>` once, derived from the `vendor` and `use_case_name` columns and never stored, and every local reference is built from it: the use case itself, a question row, a question link, a mapping and an access request, and the `spec_refs` entries. The schema, the central references and the owner and visibility classes do not change. The exact new text is in [contract.md](contract.md#planned-use-case-id-and-local-references). The three skill folders hold byte-identical copies of `tracker-data-contract.md`, so each skill component's own plan carries the copy, and the root test for the copies is red from this build until the last copy lands; build the three skill components straight after this one.

### Planned Behavior

This replaces the current wording of `B02` when built; the other behaviors are unchanged.

- **B02** When a reference is created, then central references follow the contract's scheme (a question row per use case and question, a question group, a link, an access request per use case and endpoint) and are assigned by leads only, and proposals use local references built from the use case ID (`uc-<vendor-slug>-<use-case-slug>`, derived from `vendor` and `use_case_name` and never stored) and carry no central reference for a new row; a reference in the name-only or slug-only form is not valid. (untested: benchmark pending)

### Steps

1. [contract.md](contract.md): move the planned section into the contract proper: the `Vocabulary` line, the `References` table, the `spec_refs` example in the Questions row and the `record_key` bullet; keep the definition once.
2. [tracker-data-contract.md](tracker-data-contract.md): the same changes in the contract prose (the References table, the Questions row example, the `record_key` bullet and the vocabulary line). Leave [tracker-schema.csv](tracker-schema.csv) and every other file untouched.
3. [workbook-layout-guide.md](workbook-layout-guide.md): where it describes the inventory template, say the `vendor` value is required because the use case ID derives from it; change nothing else unless a search finds a key form.
4. [README.md](README.md) and [review-checklist.md](review-checklist.md): `B02` wording, an assumption that identity is the use case ID, and the matching `[B02]` item; [requirements.md](requirements.md): one bullet that local references use the use case ID.
5. Validate: `tracker-schema.csv` is byte-identical to before; a search finds no `<use-case-name>/`, `<use-case-slug>/` or name-only reference form in the five files; the contract and its prose agree on the table and the definition; the file hygiene scan still passes. Root `B05` is red until the three skill copies match, so run it after the last skill component is built.

### Acceptance Mapping

| Acceptance | Behaviors | Step | Check |
| --- | --- | --- | --- |
| 1. The contract defines the use case ID once and builds every local reference and `spec_refs` from it, and says a name-only or slug-only reference is not valid and that a missing vendor gives no ID. | B02 | 1, 2 | checklist `[B02]` and the search in step 5 |
| 2. The schema and every other file are unchanged, and the inventory guide says `vendor` is required. | B02 | 2, 3 | `tracker-schema.csv` unchanged; checklist |
| 3. The contract, its prose, README, requirements and checklist agree. | B02 | 1 to 4 | checklist |

Validation: the commands in step 5.

### Assumptions And Open Questions

Assumptions (override by telling the builder, or by editing the file named):

- **Behavior confirmed** by the user on 2026-11-16: the key forms above, the use case ID for both local references, and that a reference in the old name or slug form is not valid. Local references and the proposal ID are one string by the user's choice; the backlog items `local-reference-form-decision` and `cross-vendor-use-case-name-collision` are planned together here and removed.
- **No schema change.** The ID is derived from two existing columns and never stored, so `tracker-schema.csv` and its copies stay byte-identical. Override by adding a stored ID column, which changes every consumer.
- **The vendor is required.** A skill that does not know the vendor asks once and writes no keyed row, never inventing one; the orchestrator supplies the vendor from the index.
- **A vendor correction changes the ID** of an existing use case; rows already proposed still trace through their `update_id`, so a lead handles a vendor correction deliberately.
- **No live data is migrated** (the user confirmed on 2026-11-16 that none exists); old-form references simply fail.
- **Central references** (`UC-###` and the rest) are unchanged.

Open questions: none.

### Planned Relationships

It depends on nothing outside its lineage. It is used by its siblings [Tracker Update Proposer](../tracker-update-proposer/README.md#planned-design), [Identity Access Discovery](../identity-access-discovery/README.md#planned-design), [Workflow Recommender](../workflow-recommender/README.md#planned-design) and [Tracker Tools](../tracker-tools/README.md#purpose), which read and write the shapes defined here, and by the [Discovery Orchestrator](../discovery-orchestrator/README.md#design), whose proposal ID is the same string.

### Planned Links

- [contract.md](contract.md#planned-use-case-id-and-local-references) — the exact planned wording.
