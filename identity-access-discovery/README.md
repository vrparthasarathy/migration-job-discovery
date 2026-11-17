# Identity Access Discovery

## Purpose

A GitHub Copilot agent skill that reads a use case's source and configuration and proposes Identity & Access rows (services, environments, observed operations and identity references), so access requests can start from day one and leads can see possible shared requests.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Identity Access Discovery**

- [Design](#design)
  - [Diagram](#diagram)
- [Behavior](#behavior)
- [Relationships](#relationships)
- [Links](#links)

## Design

The component delivers one skill folder, [discover-identity-access](discover-identity-access/SKILL.md), and one internal checklist. The folder holds the instructions written once ([SKILL.md](discover-identity-access/SKILL.md)), byte-identical copies of the contract ([tracker-data-contract.md](discover-identity-access/tracker-data-contract.md)) and the schema ([tracker-schema.csv](discover-identity-access/tracker-schema.csv)) from the built Tracker Data Contract, and an example proposal for the website use case ([tracker-updates.csv](discover-identity-access/tracker-updates.csv)). The folder name and the skill `name` stay `discover-identity-access`.

The skill runs from the first day as a lightweight sweep across all known use cases, in parallel with source screening and before any specification exists, and it does not wait for an acknowledgement. Its inputs are the source and configuration, the two files `external_tools.md` and `logic.md` (a missing one is reported, never invented), tagged supporting documents and dependency observations that a developer supplies. It writes only Identity & Access rows to `tracker-updates/<proposal-id>/tracker-updates.csv`, one record per use case and endpoint and environment, with the local reference `<use-case-id>/<endpoint>/<environment>`. The use case ID `uc-<vendor-slug>-<use-case-slug>` is defined once in the [Tracker Data Contract](../tracker-data-contract/README.md#design) (the vendor and the use case name as slugs, derived and never stored), so two vendors' same-named use cases do not share a key; a key in the use case name form is not valid. The ID needs the vendor, which the skill takes from the inventory or the developer; when it is not known the skill asks the lead once, never invents one, writes no keyed row for that use case until it is known and names the use case in the report.

Each record gives the service, endpoint and environment, the observed operations, the exact identity or variable reference names with runtime values `unknown`, observed and proposed access in separate columns, the permissions to confirm, the unknowns with who resolves each, and evidence pointers that begin `source:`, `document:` or `dependency:`. A row that rests only on a document or an observation is marked as not confirmed in source. A literal credential is reported as its location and `value withheld`; no secret reaches any output. The proposed request follows the observed authentication: a website sign-in asks for an approved identity or account, application permissions and a supported automated authentication or SSO where it applies; an API source asks for approved API identity or credential provisioning and the permissions or scopes the source supports, with no blanket SSO question; an unknown authentication gets a conditional request and stays `proposed`. Existing CI identity reuse is always `unconfirmed`.

A record is suggested `ready-to-raise` only when its endpoint, environment, authentication type, identity reference and permission are all known, whatever the state of any specification and of the other unknowns; otherwise it is `proposed`. Identical endpoints are only flagged through `shared_request_flag` and `shared_with`, never merged; a lead sets `consolidated_request_ref`. The skill never writes the coordinator, the vendor action owner, a ticket, a raised date, an expected availability or a verification, and never marks anything approved, provisioned or verified. Rows are ordered by use case ID, then endpoint, then environment, and `shared_with` lists other rows by the same key. Repeat runs refresh the same records by their local reference, with `set` and `base_value` for a changed spec field and no overwrite of a human field. The skill ends with a report of unread files, use cases with no source to sweep, endpoints with no evidence and rows with no pointer, and says that approval or provisioning is separate from verified working access and from behavior acknowledgement.

Before it reports, the skill reads its proposal file back and checks it: exactly 12 fields per row, quoting of any value with a comma, a double quote or a line break, the exact header, dates as `YYYY-MM-DD`, the key form of each row and one final line feed; it fixes every problem and checks again. When it appends to a shared file it first makes sure the file ends with a line feed, so its first row starts on a new line. An empty `base_value` stays blank. When the toolkit is available it also runs the [Tracker Reconciler](../tracker-tools/tracker-reconciler/README.md#purpose)'s `validate <file>` (optional; the skill needs nothing installed). The reply states the self-check result.

The example file is written from the real source in `website-availability-check/src/`: one record for the one configured endpoint, `CHECK_URL`, whose runtime value is unknown. The source sends no credential, so the authentication type is `unknown`, there is no identity reference or permission to name, the proposed request is conditional on the website owner's answer, and the record is `proposed`, not `ready-to-raise`. The notifier of that source only prints an alert and sends nothing, so it has no endpoint and no row. The example is written under a fictional vendor, `Example Vendor`, so its key is `uc-example-vendor-website-availability-check/CHECK_URL/unknown`; its `vendor` row says the vendor is fictional and given for the example. It uses the revision `unrevised`, because the sample has no recorded revision. [review-checklist.md](review-checklist.md) is internal, with one item per behavior; the skill folder never mentions the internal records.

Testing policy: the behaviors are checked by the file review and by the user's manual client-environment testing on real use cases, and are marked `untested: benchmark pending`. No Copilot run has been made for this skill. The example's format was checked mechanically with a throwaway script (header, schema fields, field classes and operations, composed unique `update_id` values, a source on every row, and pointer line ranges inside the real files).

### Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  chk["review-checklist"]
  skill["discover-identity-access (skill)"]
  copy["tracker-data-contract and tracker-schema (copies)"]
  ex["tracker-updates (example)"]
  contract["tracker-data-contract (built component)"]
  site["website-availability-check (source of the example)"]
  click chk "review-checklist.md"
  click skill "discover-identity-access/SKILL.md"
  click copy "discover-identity-access/tracker-data-contract.md"
  click ex "discover-identity-access/tracker-updates.csv"
  click contract "../tracker-data-contract/README.md"
  click site "../website-availability-check/README.md"
  contract -->|"copied byte for byte into"| copy
  copy -->|"defines the rows of"| skill
  skill -->|"shows the format with"| ex
  site -->|"is the source of the example"| ex
  chk -->|"reviews B01 to B10 on"| skill
```

## Behavior

- **B01** When it reads source, configuration, `external_tools.md`, `logic.md` and tagged documents for one use case, then it lists each external service, endpoint and environment with the observed operations and an evidence pointer that shows whether it rests on source or only on a supporting document (a document never makes a row source-verified), and it runs as an early lightweight sweep across all known use cases in parallel with detailed behavior discovery, not after acknowledgements or document completion. (untested: benchmark pending)
- **B02** When it records identities, then it gives exact variable or reference names with runtime values `unknown`, and never guesses a name, a permission or a value. (untested: benchmark pending)
- **B03** When it finds a literal credential in source, then it records the location and `value withheld`, and no secret appears in any output, and approvals are by secure reference or provisioning only. (untested: benchmark pending)
- **B04** When it records access, then there is one record per use case and endpoint and environment, keyed `<use-case-id>/<endpoint>/<environment>`, with observed access and proposed access in separate columns, and the permissions to confirm, the unknowns and who resolves each unknown are listed; when the vendor is not known it asks the lead once, never invents one, and writes no keyed row until it is known. (untested: benchmark pending)
- **B05** When the observed authentication is a website sign-in, then the proposed request asks for an approved identity or account, the application permissions and a supported automated authentication or SSO where it applies; when it is an API, then it asks for approved API identity or credential provisioning and the permissions or scopes the source supports, and no blanket SSO question. (untested: benchmark pending)
- **B06** When endpoints of several use cases look identical, then it only sets `shared_request_flag` and lists the other rows in `shared_with` for lead review, and each use case keeps its own row so a lead who consolidates after confirming endpoint, environment, identity and permissions keeps traceability. (untested: benchmark pending)
- **B07** When a request has its endpoint, environment, authentication type, identity reference and permission known, then it suggests `ready-to-raise` independent of specification state and of other unknowns, which stay listed with their resolver. (untested: benchmark pending)
- **B08** When it writes rows, then it leaves coordinator, vendor action owner, ticket, `raised_on`, expected availability (shown as `unknown`) and verification blank, suggests only `proposed` or `ready-to-raise` for the request status, and never marks anything approved, provisioned or verified. Before reporting, the skill runs a self-check on the proposal file: every row has exactly 12 fields, any value with a comma, a double quote or a line break is quoted, the header is exact, `created_on` and any date value are `YYYY-MM-DD`, each `record_key` has the form of its tab, and the file ends with exactly one line feed; when appending to the shared file it first makes sure the file ends with a line feed so its first row starts on a new line; and when the toolkit is available it also runs `validate <file>` of the Tracker Reconciler and fixes every error before reporting. (untested: benchmark pending)
- **B09** When it finishes, then it reports unread files, use cases whose source was not available to sweep, endpoints with no evidence and rows with no pointer, and says approval or provisioning is separate from verified working access and from behavior acknowledgement, and the developer or platform team verifies access. (untested: benchmark pending)
- **B10** When its folder is read, then it contains no Craft term, needs nothing installed in VS Code agent mode, and holds byte-identical copies of the contract and schema. (untested: benchmark pending)

## Plan

### Planned Navigation

[Job Behavior Specifications](../README.md#plan) / **Identity Access Discovery**

- [Planned Design](#planned-design)
  - [Planned Diagram](#planned-diagram)
- [Steps](#steps)
- [Acceptance Mapping](#acceptance-mapping)
- [Assumptions And Open Questions](#assumptions-and-open-questions)
- [Planned Relationships](#planned-relationships)
- [Planned Links](#planned-links)

### Planned Design

One input rule changes. The skill looks for `external_tools.md` and `logic.md` in the folder the developer names; when none is named it reads `use-case-index.csv` at the repository root (asking once for the root), finds the row by use case name, slug or derived ID and uses its `folder`. With no row it asks the developer for the folder, as today. The skill needs no specification and writes only the proposal file, so nothing else changes.

Rule followed by every skill and agent that names a specification: the use case index `use-case-index.csv` at the repository root is the single lookup: its row's `folder` is the use case's own folder and its `spec` is the root-relative path of the specification; a new specification is written in the use case's own folder as `<folder>/<use case name>.md`, never in a proposal folder. A skill run by hand with no path uses it, and when there is no index row, `spec` is blank or the file is missing, the skill asks once for the path and, if none is given, reports "no specification" and uses no other location (no fallback to the inventory's source location, no scan for the file).

Behavior wording (amended at build; no behavior is added): **B01** (no new behavior; the cap of 10 holds). New wording: "When it reads source, configuration, `external_tools.md` (looked for in the folder a developer names, else in the use case index row's `folder`), `logic.md` and tagged documents for one use case, then it lists each external service, endpoint and environment with the observed operations and an evidence pointer that shows whether it rests on source or only on a supporting document (a document never makes a row source-verified), and it runs as an early lightweight sweep across all known use cases in parallel with detailed behavior discovery, not after acknowledgements or document completion. (untested: benchmark pending)" Tests and checklist items tagged B01 stay as they are.

#### Planned Diagram

```mermaid
---
config:
  layout: elk
---
%%{init: {"securityLevel": "loose"}}%%
flowchart TB
  skill["discover-identity-access (skill)"]
  idx["use-case-index.csv (repository root)"]
  rule["core files folder from the index row"]:::planned
  core["external_tools.md and logic.md"]
  skill -->|"with no path applies"| rule
  rule -->|"reads folder from"| idx
  rule -->|"finds"| core
  classDef planned stroke-dasharray: 5 5,stroke:#2563eb
```

### Steps

1. Edit `discover-identity-access/SKILL.md`: in Inputs, take the core files' folder from the index row's `folder` when no path is given, with the repository root question and the match rule; keep the developer-given folder first and the existing report line for a missing file.
2. Update `contract.md` (Skill input and output) and add one line under B01 in `review-checklist.md`.
3. Rewrite README `B01` as above, update Design, and dissolve this Plan into Design.

### Acceptance Mapping

| Acceptance | Behaviors | Step | Check |
| --- | --- | --- | --- |
| The core files' folder comes from the index row when no path is given, with a developer's folder first and the existing no-row behavior | B01 | 1, 2 | file review against the checklist line |
| The folder, example and copies stay free of Craft terms and byte-identical | B10 | 1, 3 | the checklist's scan and the byte comparison of the copies |

### Assumptions And Open Questions

Assumptions (override any in chat):

1. **Policy and scope.** Planned under `deciding-what-to-ask`, as one part of the request `shared-use-case-file-location`: the other affected components each carry their own Plan, and the root holds the convention. Nothing is built.
2. **Location.** A newly drafted specification is written in the use case's own folder; the proposal folder holds only proposal files. Confirmed by the user on 2026-11-17. Override by naming the proposal folder `<proposals root>/tracker-updates/<use-case-id>/` instead; the specification is then vendor-readable only if that folder is shared, so the root's vendor-separation rule would also need to change.
3. **File name.** `<use case name>.md`, as the reference specification is named after its use case. Override by naming another pattern.
4. **Existing specifications are not moved.** A batch-written specification keeps working because its index `spec` already points at it, wherever it is.
5. **Tracker Data Contract.** It defines no specification location, so it and its copies in the skill folders do not change and nothing is recopied.
6. **Behavior cap.** The component lists 10 behaviors, so none is added: **B01** is reworded in the Plan above and at build; tests and checklist items tagged for it stay.

Open questions: none. The location choice was confirmed by the user on 2026-11-17; where a hand-run skill finds no index row it asks once for a path, as recorded above.

### Planned Relationships

- [Discovery Orchestrator](../discovery-orchestrator/README.md#design) — writes the use case index whose `folder` this skill now uses to find the core files.

### Planned Links

- [requirements.md](requirements.md#planned-change-shared-use-case-file-location) — what the change must do, with the planned change section.
- [contract.md](contract.md#planned-change-shared-use-case-file-location) — the interface, with the planned change section.

## Relationships

- [Tracker Data Contract](../tracker-data-contract/README.md#purpose) — the Identity & Access columns and the proposal format this skill follows, copied into its folder.
- [Tracker Reconciler](../tracker-tools/tracker-reconciler/README.md#purpose) — the optional `validate` command the skill runs when the toolkit is available.
- [Website Availability Check](../website-availability-check/README.md#purpose) — the read-only source the example rows are derived from.

## Links

- [requirements.md](requirements.md#requirements) — what the component must do and what it need not.
- [contract.md](contract.md#contract) — the shapes, formats and wording rules.
- [review-checklist.md](review-checklist.md) — the internal review items tagged B01 to B10.
- [discover-identity-access/SKILL.md](discover-identity-access/SKILL.md) — the skill instructions.
- [discover-identity-access/tracker-data-contract.md](discover-identity-access/tracker-data-contract.md) — the copy of the contract the skill follows.
- [discover-identity-access/tracker-schema.csv](discover-identity-access/tracker-schema.csv) — the copy of the schema the skill reads.
- [discover-identity-access/tracker-updates.csv](discover-identity-access/tracker-updates.csv) — the example proposal for the website use case.
