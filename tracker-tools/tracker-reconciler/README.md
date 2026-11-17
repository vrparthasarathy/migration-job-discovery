# Tracker Reconciler

## Purpose

A Node command line tool that compares reviewed tracker proposals with the latest tracker export and writes additions, field updates, conflicts and suggestions for a lead to review and apply by hand, never overwriting human edits.

## Navigation

[Job Behavior Specifications](../../README.md#navigation) / [Tracker Tools](../README.md#navigation) / **Tracker Reconciler**

- [Design](#design)
  - [Diagram](#diagram)
- [Technology](#technology)
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

Two commands, `reconcile --export <dir> --proposals <dir> [--scope <slug>] --out <dir>` and `validate <file-or-dir>`, behind a thin adapter. [main](src/main.ts) only connects the process to [cli](src/cli.ts), which parses the arguments, calls the modules, prints and returns the exit status. [inputs](src/inputs.ts) reads and checks the files, [reconcile](src/reconcile.ts) classifies every proposed row against the export, [matching](src/matching.ts) scores question texts, and [report](src/report.ts) renders every output and writes them. [secrets](src/secrets.ts) recognises credential-looking values. Reading, validation, schema and the vendor projection come from the [Tracker Tables](../tracker-tables/README.md#design) library by relative import; the column list, owner classes, keys and visibility are read from `tracker-schema.csv` and never repeated in code.

How a run goes: every input is read and validated first (header, tab, field, operation, composed `update_id`, dates, use case IDs, CSV shape, secret-looking values, and the export's statuses, references and dates); any problem stops the run with exit status 1 and one `file: line N: message` per problem, before the output folder is touched. Then each proposed row is classified, all files are built in memory, and they are written into a temporary sibling folder that replaces the output folder, so an input error leaves no partial output and an earlier run's output as it was.

Decisions (record of the build; override in chat):

- **Rows in order.** Proposal files are found recursively under `--proposals` and sorted by path; rows keep their file order, so the same inputs give byte-identical files. The report holds no absolute path and no run date.
- **Rejected rows** (listed with a reason in the report, never fatal): a table that proposals do not address (Question Groups, Question Links, Batches), a forbidden or computed field, `proposal_refs`, a central reference column, a `request_status` other than `proposed` or `ready-to-raise`, `question_text` on a released row (the new wording goes to `current_spec_text`), `suggest` on a spec field, `link` on a non-list field, a row that is not an `add` for a record absent from the export, and a value outside its schema list or format.
- **Finding the record.** A proposal's `record_key` is matched to an export row by its `update_id` prefix in `proposal_refs`, else by natural key: the use case ID for a use case, a `spec_refs` entry (version dropped) for a question, the use case ID plus `workflow_candidate` slug for a mapping, the use case ID plus endpoint and environment for access. A use case is identified by its ID `uc-<vendor-slug>-<use-case-slug>` (from the Tracker Tables `useCaseId`, derived from `vendor` and `use_case_name`, never stored), as the key's leading part; the use case name and its slug form are not valid keys, and use cases of two vendors with one name have two IDs and are never merged.
- **Already reflected.** A row yields nothing when its `update_id` is in the record's `proposal_refs`, or its value equals the export (a `link` item already in the list). An `add` on an existing record is treated field by field the same way. This is what makes applying the additions and re-running give nothing.
- **Human-field `set` rows** are always suggestions, even when their `base_value` differs from the export, so a `base-mismatch` conflict is only raised for spec fields; nothing human-owned is ever overwritten either way.
- **Version-only changes.** Re-review follows the stated impact; a proposer states `not-expected` for a version-only or wording change, which suggests nothing. A version change with no stated impact (and none in the export) is unknown and is listed, never treated as no impact.
- **Spec fields** become a field update (current and proposed, a `link` appends missing items in order) unless a conflict applies. **Human fields** (a `set`, `suggest` or `link` on an existing record, or any value on an `add`) are suggestions only; a blank suggestion is ignored.
- **Conflicts.** `base-mismatch` (a `set` whose `base_value` differs from the export), `later-edit` (the row's `last_updated` is later than the proposal's `created_on`), `stale-export` (the manifest's `exported_at` date is before the proposal's `created_on`, applied to each change that would update an existing record, so additions of records absent from the export are still reported) and `proposal-disagreement` (two proposals give a spec field different values). A conflict is listed with both values and never resolved. It holds its record and every change that refers to it (the same record, the rows of a use case in conflict, a mapping that names a conflicted question as blocking); those are listed in `conflicts.csv` with kind `held` and the detail `held by <conflict id>`, and unrelated changes are reported as usual. Held changes produce no addition, update or suggestion.
- **Additions** get the next central reference after the highest `AA-nnn` found anywhere in the export, marked `suggested`, so an export reference is never reused; spec fields are plain columns, human fields appear as `suggested_<column>`, and `trace_source`, `trace_spec_version` (the `@version` of the source) and `trace_mr_link` carry the traceability. `suggested_proposal_refs` lists the update ids a lead pastes into `proposal_refs` when applying. No answer column is ever written.
- **Link suggestions** compare each new question's suggested text with the export's question rows and the earlier new rows, by normalised text and token overlap (lower case, accents and punctuation dropped, a short stop-word list removed): score 1 for equal normalised text, else the Jaccard overlap. A score of 0.5 or more is suggested, 0.8 or more is `likely`, between is `uncertain-review`. Nothing is linked, grouped, merged or answered.
- **Re-review** is suggested when a version change is not held and a decided mapping (a `decision_ref` or an accepted or rejected status) of that use case considered only older versions (none recorded counts as older). The impact is the lead's `grouping_impact_lead` (`could-affect` suggests, `no-impact` does not), else the proposal's `grouping_impact`, else the export's, else unknown. `could-affect` and unknown suggest, `not-expected` does not, and unknown is listed as `impact: unknown`. It suggests `mapping_status` `re-review-suggested` and never touches decision fields.
- **Vendor folders** hold, for each vendor name found in the export (folder name: the name in kebab case; two names with the same folder name stop the run), the vendor view of the export from the library (that vendor's rows, released question rows only, vendor-visible columns, no group, link, mapping or unreleased row, no reference to a hidden row) and a `field-updates.csv` of the non-held spec updates for those visible rows and columns (never the `vendor` field itself) with hidden references dropped from list values. Additions, conflicts and suggestions are internal only. `--scope <slug>` names the manifest row used for the stale check (default `internal`); a vendor scope limits `vendor/` to that vendor, and the master export stays authoritative.
- **Output folder** may be new, empty or hold only a previous run's own files (`reconciliation-report.md`, `field-updates.csv`, `conflicts.csv`, `suggestions.csv`, `additions/<tab>.csv`, `vendor/<slug>/<tab>.csv`, checked file by file); anything else, or a folder that contains or sits inside an input, is refused.
- **Unknown use case IDs** are checked in `reconcile` only (it knows the export): a key's leading ID must be the ID of an export Use Cases row or of a Use Cases `add` (`<file>: line <n>: unknown use case ID in record_key "<key>"; expected uc-<vendor-slug>-<use-case-slug> ...`), a Questions `use_case_name` value must be the name of the key's use case (`use_case_name "<value>" does not belong to use case ID <id>`), and two export Use Cases rows deriving one ID stop the run first (`<export>/use-cases.csv: line <n>: use case ID <id> is also derived by line <m>`). An `add` key is trusted as the ID, and a name is checked only when the use case's name is known; `validate` checks shape, header, tab, field, dates, composed `update_id`, secrets and, for an export, the schema lists. A reported line is the CSV record number with the header as line 1, and a proposals folder with no `tracker-updates.csv` is an input error.

### Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  main["<a href='src/main.ts'>main</a>"] -->|runs| cli["<a href='src/cli.ts'>cli</a>"]
  cli -->|reads-with| inputs["<a href='src/inputs.ts'>inputs</a>"]
  cli -->|classifies-with| rec["<a href='src/reconcile.ts'>reconcile</a>"]
  cli -->|writes-with| rep["<a href='src/report.ts'>report</a>"]
  inputs -->|scans-with| sec["<a href='src/secrets.ts'>secrets</a>"]
  rec -->|scores-with| match["<a href='src/matching.ts'>matching</a>"]
  rep -->|projects-with| lib(["Tracker Tables"])
  inputs -->|parses-with| lib
  rec -->|validates-with| lib
  lib -->|loads| contract(["tracker-schema.csv (Tracker Data Contract)"])
  tests["<a href='test/reconcile.test.ts'>test</a>"] -->|validates| cli
```

## Technology

Inherited from [Tracker Tools](../README.md#technology): Node 26 with native TypeScript (erasable syntax, `.ts` import extensions), no dependencies, `node:test`, ES modules. The declared checks are `test` and `coverage`; no typecheck, lint or boundaries check exists because each would need a dev dependency. Tests use real temporary directories for the export, the proposals and the output, drive the commands through `cli`, read the real `tracker-data-contract/tracker-schema.csv` and the proposer's example `tracker-updates.csv` by relative path, and spawn `main` once as the adapter smoke test. [main](src/main.ts) is the adapter excluded from unit coverage by `adapterGlob`; argument parsing is in [cli](src/cli.ts) so it is unit tested.

## Behavior

- **B01** When a proposed record is absent from the export, then it is an addition in the per-tab file with its local key (built from the use case ID), source, specification version and MR link (the MR link of the same use case ID, from a proposal row or the export), human-owned fields shown as suggestions, and a suggested reference that never reuses an export reference; when two vendors have use cases of the same name (two IDs, `uc-<vendor-a>-<name>` and `uc-<vendor-b>-<name>`), their additions and updates are separate records under their own IDs, a key reaches only its own ID's row, and nothing is merged or matched to the other vendor's row (a similar question text is at most a link suggestion).
- **B02** When a spec-owned field differs on an existing row, then a field update lists the current and the proposed value, a human-owned field is never overwritten and is suggested only, and forbidden fields are rejected; a changed question wording appears as a `current_spec_text` update with a text-review suggestion and never touches the released question text or an answer.
- **B03** When the same inputs are run twice, then the outputs are identical, and a proposal already reflected in the export (an equal value, or its `update_id` in `proposal_refs`) yields nothing.
- **B04** When a proposal's `base_value` differs from the export, or a row's `last_updated` is later than the proposal's `created_on`, then it is a conflict listing both values and is never resolved silently; the affected record and the changes of rows that refer to it are held with it, and unrelated safe changes are still reported.
- **B05** When a new question row's text is similar to an existing row, then a link suggestion to that row is listed, uncertain matches are marked for review, nothing is linked, merged or grouped automatically, and no answer is copied or inherited by the new row.
- **B06** When a proposal sets `released_on`, `batch_ref`, an answer or answer status, an acknowledgement, a ticket, verification or a decision, then it is rejected, and release status comes only from the tracker.
- **B07** When a decided mapping's `spec_versions_considered` is older than the proposed version, then it suggests re-review with the reason only when the use case's grouping impact is could-affect or unknown (a lead's override replaces the suggestion), lists an unknown impact as unknown and never as no impact, suggests nothing for a not-expected impact or a version-only or wording change, and never edits decision fields.
- **B08** When it writes vendor outputs, then each `vendor/<slug>/` holds only that vendor's released question rows and vendor-visible columns, and internal tabs, internal columns, groups, links and cross-vendor suggestions appear only in the internal outputs.
- **B09** When an input has a bad header, an unknown tab or field, a key whose leading use case ID is unknown (or is written as the use case name or its slug), a `use_case_name` value that does not belong to the key's use case ID, two export Use Cases rows that derive the same use case ID, malformed CSV or a secret-looking value, then it exits 1 naming the file and line and writes no partial output. It also stops, naming the file and line, on a proposal file that does not end with exactly one line feed, on a CRLF or lone CR line end or a byte order mark, on a row with fewer or more than 12 fields, on a record key whose form does not fit its tab (`<use-case-id>`, `<use-case-id>/Q<n>`, `<use-case-id>/<endpoint>/<environment>` or `<use-case-id>->><candidate-slug>`), and on a `proposal_id` that differs from its folder name, and `validate <file-or-dir>` runs exactly these checks without an export.
- **B10** When it is run, then it never changes or reassigns an existing central reference, answer, answer status, owner, status, ticket, date, acknowledgement or released question text, never releases or applies anything, and a repeated run does not overwrite a newer human edit.

## Plan

### Planned Navigation

[Job Behavior Specifications](../../README.md#plan) / [Tracker Tools](../README.md#navigation) / **Tracker Reconciler**

- [Planned Design](#planned-design)
  - [Planned Diagram](#planned-diagram)
- [Steps](#steps)
- [Acceptance Mapping](#acceptance-mapping)
- [Assumptions And Open Questions](#assumptions-and-open-questions)
- [Planned Relationships](#planned-relationships)
- [Planned Links](#planned-links)

### Planned Design

The checks are added to the proposal loader (`loadProposalFile` in `src/inputs.ts`), which `validate`, `reconcile` and the Review CSV Exporter already share, so one change serves all three. A short row is currently padded silently, so a pre-scan of the raw text counts the fields of each row before the table is built; the final line feed, LF-only, no byte order mark and the key shape per tab are checked on the raw text and rows. A date-typed `value` or `base_value` is checked as `YYYY-MM-DD`. The `validate` command and its exit codes do not change; it prints one `file: line N: message` per problem. Blank lines no longer shift reported line numbers. The exporter needs no code change and no new mode, but its tests and every fixture that is a proposal file must pass the stricter loader.

#### Planned Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  cli["src/cli.ts (reconcile, validate)"]
  inputs["src/inputs.ts (proposal loader)"]
  checks["strict proposal shape checks"]:::planned
  exporter["review-csv-exporter (shares the loader)"]
  cli -->|"calls"| inputs
  inputs -->|"runs"| checks
  exporter -->|"loads proposals through"| inputs
  classDef planned stroke-dasharray: 5 5,stroke:#2563eb
```

### Steps

1. Add the raw-text checks and the per-tab key-shape check to the proposal loader in `src/inputs.ts`, with one `file: line N: message` per problem and the proposal-id-equals-folder check for `validate <dir>` and `reconcile`.
2. Add tests in `test/input.test.ts` for each new stop (missing final line feed, CRLF, BOM, a short row, a fused row, a bad key per tab, a wrong folder name) and for the unchanged good case.
3. Run the tests of the Review CSV Exporter, the Tracker Summary and the root integration tests against the stricter loader; a fixture that fails is a bounded request to its owner, not an edit here.
4. Update this README's Design and `B09`, `contract.md` and `requirements.md`, then dissolve this Plan into Design.

### Acceptance Mapping

| Acceptance | Behaviors | Step | Check |
| --- | --- | --- | --- |
| `validate` and `reconcile` stop on each new malformed-file case naming file and line | B09 | 1, 2 | `[B09]` cases in `test/input.test.ts` |
| Every existing behavior still holds on well-formed input | B01 to B08, B10 | 3 | the component's `test` check and the root tests |

### Assumptions And Open Questions

Assumptions (override any in chat):

1. **Policy and scope.** Planned under `deciding-what-to-ask`; the change is part of one request (validation of proposal files) that also touches the other components named in the root request, each planned in its own README. Nothing is built.
2. **Choices.** An empty `base_value` stays blank (no dot); on a `set` a blank `base_value` means the field was blank when seen. The exact 12-field check and the final-line-feed check catch a lost trailing field and a fused row. Validation lives in the existing Tracker Reconciler `validate` command; the exporter shares its loader and gains no new mode. Recorded from the user's answers of 2026-11-17.
3. **Key shapes.** Per tab: Use Cases `<use-case-id>`; Questions `<use-case-id>/Q<n>`; Identity & Access `<use-case-id>/<endpoint>/<environment>`; Mappings `<use-case-id>->><candidate-slug>` with the slug rule of the reconciler's `slug()`. Override by naming another form.
4. **Behavior cap.** The component was at 11 behaviors, over the cap of 10 that the record checker enforces once the component has a task, so the same-name-vendors behavior `B11` is folded into `B01`; at build, tests tagged `[B11]` are retagged `[B01]`. Override by merging another pair.
5. **Fixtures.** If an existing proposal fixture elsewhere fails the stricter loader, it is reported as a bounded request to its owner at build time.

Open questions: none. The behavior changes and the choices on the base value (kept blank, with checks) and on the pack skills (a self-check checklist, the validator optional) were confirmed by the user on 2026-11-17.

### Planned Relationships

- [Review CSV Exporter](../review-csv-exporter/README.md#purpose) — shares the loader, so it also stops on these cases.
- [Tracker Tables](../tracker-tables/README.md#purpose) — the CSV parser, unchanged.
- [Tracker Data Contract](../../tracker-data-contract/README.md#purpose) — the format and key forms the checks follow.

### Planned Links

- [requirements.md](requirements.md#requirements) — what the change must do, with the planned change section.
- [contract.md](contract.md#contract) — the interface, with the planned change section.

## Relationships

- [Tracker Data Contract](../../tracker-data-contract/README.md#purpose) — the schema, reference scheme, field classes, proposal and export formats the tool implements.
- [Tracker Tables](../tracker-tables/README.md#purpose) — the library the tool uses to read, validate and write tables and to build vendor views.

## Links

- [requirements.md](requirements.md#requirements) — what the component must do and what it need not.
- [contract.md](contract.md#contract) — the shapes, formats and wording rules.
- [src/main.ts](src/main.ts) — the adapter: connects the process arguments, output and exit status to `cli`.
- [src/cli.ts](src/cli.ts) — argument parsing and the `reconcile` and `validate` commands.
- [src/inputs.ts](src/inputs.ts) — reading and checking the export and the proposal files.
- [src/reconcile.ts](src/reconcile.ts) — classification of each proposed row, conflicts, holds and suggestions.
- [src/matching.ts](src/matching.ts) — text normalisation, similarity and the recorded thresholds.
- [src/report.ts](src/report.ts) — the report, the files, the vendor copies and the safe write.
- [src/secrets.ts](src/secrets.ts) — recognition of credential-looking values.
- [test/reconcile.test.ts](test/reconcile.test.ts) — tests for B01, B02, B04 to B07, B10 and B11; `repeat.test.ts` covers B03, `vendor.test.ts` B08 and `input.test.ts` B09.
