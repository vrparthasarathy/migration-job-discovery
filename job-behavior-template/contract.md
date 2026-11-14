# Contract

## Contract

### Content the form must carry

The builder arranges these into sections and records the section list here after the build, for the user to review.

| Element | Content |
| --- | --- |
| Fill-in guidance | Plain-language instructions at the start; no framework names, only a text editor or GitHub Copilot. |
| Header | Use case name, version number (1, 2, 3), date, status (`draft` or `acknowledged`), source revision and script link; a stable job ID beside the name. |
| Change log | One entry per version: number, date, what changed in plain words, and why (source change or answered unknown). |
| Statement kinds | `CUR-<n>` current behavior (ID, when/then statement, source pointer); `ASM-<n>` assumption or unknown, answered one by one, with a "resolved: now CUR-n" note once answered. |
| Contracts | Tables for inputs, outputs, parameters (name and this job's value) and external dependencies (role, direction of each call). |
| Diagram | One black box for the job, external systems, outgoing calls and incoming responses only, with a plain-text description beside it. |
| Acceptance scenarios | Their own part: given/when/then, each with a "covers: CUR-n" line; every current behavior covered. |
| Acknowledgement | Company name, date acknowledged, version reviewed, script link and revision, production-script tick box, one overall confirmation of the current behaviors, reference to the vendor's tracker entry or reply, and the plain statement of what acknowledgement does and does not claim. No person name or role. Blank until our team records it. |
| Operational context | Schedule and frequency, logging, monitoring and alerts, owner, failure handling; each `unknown` by default. |
| Scope statement | The document says nothing about how the job will be built or grouped on the migration platform. |

### Section list (for the user to review)

Derived from B01 to B10 by the build. The same headings and numbers are used by the sibling documents.

| Part | Heading | Behavior |
| --- | --- | --- |
| 1 | How to fill in this form | B01, B02, B03 |
| 2 | Header (use case name, job ID, version, date, status, source revision, script link) | B04, B07 |
| 3 | Change log | B07 |
| 4 | What this document says and does not say | B10 |
| 5 | Current behavior (`CUR-n`: when/then, source pointer) | B02, B03 |
| 6 | Assumptions and unknowns (`ASM-n`: one question each, status) | B02, B06, B10 |
| 7 | Inputs, outputs, parameters and external dependencies | B04 |
| 8 | Diagram (one black box, plain-text description) | B05 |
| 9 | Acceptance scenarios (`SC-n`, covers line) | B06 |
| 10 | Operational context | B09 |
| 11 | Acknowledgement (blank) | B08 |

ID scheme: `CUR-<n>`, `ASM-<n>`, `SC-<n>` (scenario), job ID such as `JOB-001`, whole-number versions.

### Wording rules

- Plain business language. A file name appears only in a source pointer.
- Never state an inferred behavior as current behavior.
- Never fill in the acknowledgement block.
- Say "version", not "baseline".
