# Requirements: Job Behavior Template

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The template is a plain Markdown form that our team's developers fill in to document one vendor use case from its source code (the vendor's script). The heading of the finished document reads `Use Case Behavior`; `use case` names what the business needs done, and `job` or `script` names only the vendor's script. The finished document is read by a business reviewer at the vendor: short sentences, no framework or tool vocabulary, technical terms explained when first used.
- The document carries no fill-in instructions, no Craft reference and no internal job ID. A separate `filling-guide.md` explains in plain language how to fill the template without Copilot.
- It keeps two kinds of statement apart: current behaviors (`B1`, `B2`, ...) and questions (`Q1`, `Q2`, ...). It has no place for requested changes or approved items, because this is an as-is migration. The B IDs in a job document are distinct from this project's `B01` component-record behavior IDs.
- A current behavior has an ID, a business-language when/then statement and an evidence pointer to the source (file and place) or to a vendor-provided document (document and place), so that source-observed and document-described behavior stay distinguishable. It states no reason, schedule or other fact the evidence does not show and records only the outcome the evidence proves, keeping a request that succeeded, a status the use case reports and an actual delivery separate. An explicit retry or failure-handling action in the source is a current behavior.
- Question rule: a question is asked only when the source cannot show the answer and the answer would change what the migrated use case must do (the preserved behavior). An inferred statement or a recommendation is never a current behavior. When a question is answered, the answer updates the section it belongs to (a parameter, a dependency, operational context or a current behavior) and creates a new current behavior only when it establishes behavior. A question never asks what the source states (a value, an address or a setting is a current behavior or a parameter) and never asks the reason behind a behavior the source shows.
- The header holds the use case name (the vendor's own name, the identity and file name, never renamed), version number, date, status (draft or acknowledged) and source revision with script link, and no job ID. An "About this document" part (purpose; records current behavior and lists questions; says nothing about how the use case will be migrated; approves no inferred behavior) and a contents list with links follow the header and come before the change log.
- One file per use case with a change log of one entry per version. After acknowledgement a change adds an entry and bumps the version, and our team tags the repository at each acknowledgement.
- The acknowledgement is a log with one row per version: company name, date acknowledged, version reviewed, script link and revision, a production-script tick box, one overall confirmation of the current behaviors, and a tracker entry or reply reference. It has no person name and no role, and earlier rows are never edited. A plain statement says the acknowledgement confirms that the named script and revision are the current production script and that the documented behavior is current for that version, and does not approve any future implementation or claim the behavior is error-free. It is typed in the Markdown source and recorded by our team.
- Acceptance scenarios (`AC1`, ...) are a distinct part, each given/when/then with a "covers" line that links the behavior rows; every current behavior (including an explicit retry or failure-handling action) is covered by at least one scenario; an answered question carries a "resolved" note that names the behavior or section the answer updated.
- The diagram is one black box with external systems and the requests, responses and data transfers the evidence supports, in either direction, only, vertical (`flowchart TB`) with the project's component-record diagram settings, behavior IDs as plain text in the edge labels and a plain-text description beside it that links them.
- Operational context (schedule and trigger, logging, monitoring and alerts, owner, failure handling) is its own part and never a current behavior; each row cites a vendor document or configuration in the source, otherwise `unknown`; a row may point to the current behavior that records an explicit retry or failure-handling action. Dependencies state their role and the direction of every request, response and data transfer.
- It records the parameters table and has no similarity, grouping, workflow or implementation field, and no vendor-readable text mentions workflows or grouping.
- The section list is derived from these behaviors by the builder, recorded in `contract.md`, and reviewed by the user after the build.

## Must match the source

- Not applicable: this is new. It must match the reference specification [Website Check Job Behavior](../website-check-job-behavior/requirements.md#requirements) (same parts and ID scheme).

## Need not match

- Any job's implementation, a similarity or grouping scheme, or a particular tool.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README (`B01` style) describe this component. The behaviors a job document records (`B1` style) belong to the job. They sit in different files and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule. A first dry run of the earlier skill was exploratory and ticked nothing.
- **Document files versus records.** The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` beside the deliverables are internal and are never sent to the vendor. Copying the finished files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The one-box diagram inside a job document is deliverable content and follows its own rule.
