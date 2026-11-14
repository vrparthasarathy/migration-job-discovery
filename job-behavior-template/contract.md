# Contract

## Contract

### Content the form must carry

The builder arranges these into parts and records the part list here after the build, for the user to review.

| Element | Content |
| --- | --- |
| Header | Use case name, version number (1, 2, 3), date, status (`draft` or `acknowledged`), source revision and script link. No job ID. |
| About this document | Purpose; says it records current behavior and lists questions; says nothing about how the job will be built or grouped on the migration platform; approves no inferred behavior. |
| Contents | A short list of links to each part. |
| Change log | One entry per version, in the same file: number, date, what changed in plain words, and why (source change or answered question). |
| Current behaviors | `B<n>`: a when/then statement in business language and an evidence pointer (source file and place, or vendor document and place). Each row has an anchor so other parts can link to it. |
| Questions | `Q<n>`: one question per item for the vendor, asked only when the source cannot show the answer and the answer would change what the migrated workflow must do; status; "resolved: now B<n>" once answered. |
| Contracts | Tables for inputs, outputs, parameters (name and this job's value) and external dependencies (role, direction of each call). |
| Diagram | One black box, external systems, outgoing calls and incoming responses only; `flowchart TB` with the project's component-record front matter and settings; behavior IDs as plain text in edge labels; a plain-text description beside it that links the IDs. |
| Acceptance scenarios | `AC<n>`: given/when/then, each with a "covers" line linking the behavior rows; every current behavior covered. |
| Operational context | Schedule and trigger, logging, monitoring and alerts, owner, failure handling; each cites a vendor document or configuration in the source, otherwise `unknown`. Never a current behavior. |
| Acknowledgement log | One row per version: company name, date acknowledged, version reviewed, script link and revision, production-script tick box, one overall confirmation of the current behaviors, tracker entry or reply reference. No person name or role. Earlier rows never edited. Plus the plain statement of what acknowledgement does and does not claim. |

### Part list

To be recorded by the build.

### Wording rules

- Plain business language. A file name appears only in an evidence pointer.
- Never state an inferred behavior as a current behavior; never state a reason the evidence does not show.
- Never fill in the acknowledgement log from the template; our team records it from the vendor's tracker entry or reply.
- Say "version", not "baseline".
- IDs: `B`, `Q`, `AC`.

### Companion file

`filling-guide.md` explains in plain language how to fill in the template without Copilot. It is not part of the finished document.
