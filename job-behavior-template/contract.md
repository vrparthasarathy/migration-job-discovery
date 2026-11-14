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
| Acknowledgement | Company name, date acknowledged, version reviewed, script link and revision, production-script tick box, one overall confirmation of the current behaviors, reference to the client's tracker entry or reply, and the plain statement of what acknowledgement does and does not claim. No person name or role. Blank until our team records it. |
| Operational context | Schedule and frequency, logging, monitoring and alerts, owner, failure handling; each `unknown` by default. |
| Scope statement | The document says nothing about how the job will be built or grouped on the migration platform. |

### Wording rules

- Plain business language. A file name appears only in a source pointer.
- Never state an inferred behavior as current behavior.
- Never fill in the acknowledgement block.
- Say "version", not "baseline".
