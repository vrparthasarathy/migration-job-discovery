# Contract

## Contract

### The pack and the toolkit

| File or folder | Component | Audience | Purpose |
| --- | --- | --- | --- |
| `job-behavior-template.md` | Job Behavior Template | team | The blank form for documenting one use case. |
| `filling-guide.md` | Job Behavior Template | team | Plain-language guidance for filling in the template without Copilot. |
| `website-availability-check.md` | Website Check Job Behavior | vendor | The completed reference specification, one file with a change log. The kind of file a vendor receives for each of its use cases. |
| `document-job-behavior/` (`SKILL.md`, a copy of the template, `self-check.md`) | Copilot Drafting Guide | team | The Copilot drafting skill. |
| `usage-and-model-guidance.md`, `drafting-prompt.md` | Copilot Drafting Guide | team | Usage and model advice with a valid-as-of date, and the fallback prompt. |
| `tracker-data-contract.md`, `tracker-schema.csv`, `workbook-layout-guide.md`, `tracker-updates-template.csv`, `use-case-inventory-template.csv` | Tracker Data Contract | lead | The one shared tracker data contract and the workbook guide. |
| `propose-tracker-updates/` | Tracker Update Proposer | team | Skill: source screening of the inventory (upfront), then proposed use case and per-use-case question rows from the specification. |
| `discover-identity-access/` | Identity Access Discovery | team | Skill: proposed Identity & Access rows per use case and endpoint, as an early sweep. |
| `recommend-workflows/` | Workflow Recommender | lead | Skill: use-case-to-workflow recommendations and the decisions file format. |
| `tracker-tools/` | Tracker Tools | lead | Table library, reconciler and daily summary, run by hand. |

Audience: **vendor** files are read by the vendor (its own specifications and its own vendor workbook). **team** files are used by our developers. **lead** files are internal to leads. Recommendations, decisions, mappings, workflow candidates and cross-vendor comparisons are never vendor-visible.

The template, the specification and the drafting skill's template copy share the same part headings and the same ID scheme (`B`, `Q`, `AC`), and the template copy inside the skill folder is identical to the template. The part list is set by the template build and recorded in the [template contract](job-behavior-template/contract.md#contract). The contract and schema files are copied byte for byte into each skill folder that uses them, and the tools read the schema from the data contract component. The root tests compare these copies and the template copy as plain files, and the root `review-checklist.md` lists the wording scans.

### Inputs to the skills

The core inputs are the use case's source code and the exact files `external_tools.md` and `logic.md`. Additional documents (original SOPs, vendor documents) and a folder of earlier workflow analyses are tagged manually. Developers may also supply existing findings, questions, corrections and dependency observations as they are. The skills keep source-observed behavior, document-described behavior, team analysis or inference, and recommendation apart. The exact client paths of these inputs are not known and are not assumed.

### Vocabulary

A **use case** is what the business needs done; the vendor's own name is its identity. A **script** is the vendor's current implementation. A **workflow** is one reusable implementation on our platform that supports several use cases through configuration, and appears only in internal files.

### Shared wording rules

- Plain business language; a file name appears only in an evidence pointer.
- No Craft term in any pack or skill file.
- Say `use case` for the business unit and `job` or `script` only for the vendor's script. Vendor-readable text never mentions workflows or grouping.
- Say "version", not "baseline".
- Acknowledgement records the vendor's review of the stated behavior at one version; it does not claim the behavior is error-free, that inferred behavior is approved, or that future issues are prevented.

### Shared tracker data contract

The tabs, columns, owner and visibility classes, references, status lists, the captured versus released rule, the proposal file format and the export format are defined once in the [Tracker Data Contract](tracker-data-contract/contract.md#contract). Every skill and tool follows it; none repeats it in code.

### Deployment prerequisites

- Separate vendor access and internal-only analysis: each vendor reads only its own specifications and workbook, and recommendations, decisions, mappings, proposals, exports, groups and links are stored where no vendor can read them. Hidden tabs or folders are not separation.
- The vendor storage and repository choice is deferred pending the client's confirmation. It is settled before the first release to a vendor, and it is not an implementation blocker.

### The three skills and the upfront sequence

- **Behavior drafting** (`document-job-behavior`) accepts the source, `external_tools.md`, `logic.md` and supplied findings, questions, corrections and tagged documents, structures and verifies them, and produces or updates the specification.
- **Access discovery** (`discover-identity-access`) independently proposes access rows per use case and endpoint from source and supporting evidence, with no prior specification.
- **Tracker update proposer** (`propose-tracker-updates`) has a source-screening mode that runs upfront over the whole inventory and its source locations before any specification exists, and a specification-update mode later that extracts question and use case updates from the resulting specification. Supplied findings reach the tracker only through the specification.

Source screening and inventory-wide access discovery may run in parallel before specifications are drafted. Leads review and consolidate their proposals and raise ready access requests while drafting proceeds. Missing sources stay explicit, and supporting documents allow preliminary findings without pretending the source is verified.

### End-to-end handoffs

Steps 9 to 12 were confirmed in substance on 2026-11-15; the exact wording is subject to the final plan review. Access requests proceed independently of these steps and never wait for an acknowledgement.

| # | Step | Who | Output |
| --- | --- | --- | --- |
| 1 | Paste the real inventory (use case name, vendor, source link; the link stays empty where the source is not located) into the master workbook's Use Cases tab; assign `UC-` references; stage `draft`. No distribution is invented. | Lead | Inventory list |
| 2 | In parallel and before any specification exists: run `propose-tracker-updates` in source-screening mode over the entire inventory and its source locations (inventory or source-screening evidence; owners from the inventory or `unassigned`), and run `discover-identity-access` across all known use cases. | Developer or lead | Source and blocker proposals; access proposals |
| 3 | Validate and reconcile those proposals and apply them by hand; name an owner for each source blocker; review and consolidate identical endpoints (keeping per-use-case rows) and raise ready access requests promptly while drafting proceeds; record ticket, vendor action owner, raised date, status and expected availability; our developer or platform team verifies access. | Lead or Vasanth, platform team | Updated master, access rows |
| 4 | Invoke `document-job-behavior` with the source, `external_tools.md`, `logic.md`, tagged documents and any supplied findings, questions, corrections and dependency observations as they are; review the output with the job context and add missing items with evidence or mark them for confirmation; run `propose-tracker-updates` in specification-update mode; open a merge request; a lead verifies the specification; `validate` checks the proposal file. | Developer, lead | Verified specification and `tracker-updates/<proposal-id>/tracker-updates.csv` |
| 5 | Export the master as CSV per tab; run `reconcile`; review additions, field updates, conflicts (a conflict holds the affected record and the rows that refer to it, is resolved by the lead and never by the tool, and unrelated safe changes are still reported) and link suggestions between similar question rows; apply by hand to SharePoint; assign central references and record internal groups and links. Nothing is released or applied by the tool. | Lead | Updated master workbook |
| 6 | Run `recommend-workflows` over the full set, using draft specifications and without waiting for acknowledgement; tagged earlier analyses supply candidates only; record accepted, rejected or pending-clarification decisions with rationale, evidence, versions, date and name. Only grouping-relevant unknowns block a decision. | Lead | Recommendations and decisions files |
| 7 | Choose a vendor batch from the summary's advisory suggestions and the agreed capacity (provisional); set `batch_ref` and `released_on`; apply vendor-safe lists, including each use case's released question rows, to each vendor workbook. | Lead | Released batch |
| 8 | Run `summary` for the daily call: overdue question rows (from day three after release, including partial, cannot-answer and clarification-requested rows on their original due date; complete answers awaiting lead review are listed apart with owner and age and are not vendor-overdue), pending acknowledgements, missing-source and other blockers, identity and access blockers, next batches and capacity. Each pending action has a named owner; unassigned items are flagged. | Lead | Internal summary |
| 9 | Vendors answer each question row in their own workbook within two working days of release, setting the row's answer status. A lead reviews each response for completeness and copies the answer fields row for row into the master, marking it accepted or clarification-requested. A partial answer stays open with its original due date; a cannot-answer row stays open until the lead assigns a resolver or explicitly closes it; a lead-requested clarification stays open on the original due date and can be overdue even when the vendor's answer status is complete. The vendor owns `answer_status` and the lead owns `status`. No answer is applied to another row. | Vendor, lead | Reviewed answers |
| 10 | Give the developer the reviewed answers; run `document-job-behavior` to update the appropriate specification sections, version and history (an answer updates its own section and creates a behavior only when it establishes one), then `propose-tracker-updates`; open a merge request. | Developer | New version and proposals |
| 11 | A lead verifies that the update reflects the answer; the reconciler and the recommender suggest re-review only for decided mappings whose use case has a grouping impact of could-affect or unknown (a lead override first); the lead decides and existing decisions are preserved. | Lead | Verified version, re-review decisions |
| 12 | Request the vendor's acknowledgement of that specific document version (stage `awaiting-acknowledgement`); the vendor acknowledges in its workbook that the named script and revision are the current production script and the documented behavior is current for that version, which approves no future implementation; the lead records it in the master; the developer records the acknowledgement row in the specification from those facts and tags the repository. Access verification stays a separate signal. | Lead, vendor, developer | Acknowledged version |
