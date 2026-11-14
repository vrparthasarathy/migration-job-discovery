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

Derived from B01 to B10 for the user to review. Parts appear in this order in `job-behavior-template.md`:

1. Header (B07): use case name, version, date, status, source revision and script link; no job ID
2. About this document (B01, B10), with a contents list of links (B07)
3. Change log (B07)
4. Current behaviors, `B1`.. (B02, B03)
5. Questions, `Q1`.. (B02, B10)
6. Inputs, outputs, parameters and external dependencies (B04)
7. Diagram with plain-text description (B05)
8. Acceptance scenarios, `AC1`.. (B06)
9. Operational context (B09)
10. Acknowledgement log (B08)

ID scheme: current behaviors `B1`, `B2`, ...; questions `Q1`, `Q2`, ...; acceptance scenarios `AC1`, `AC2`, .... Anchors are lowercase (`b1`, `q1`, `ac1`) placed with `<a id="b1"></a>`. There is no job ID. The filling guide (`filling-guide.md`) is separate and not part of the document.

### Wording rules

- Plain business language. A file name appears only in an evidence pointer.
- Never state an inferred behavior as a current behavior; never state a reason the evidence does not show.
- Never fill in the acknowledgement log from the template; our team records it from the tracker entry or the vendor's reply.
- Say "version", not "baseline".
- IDs: `B`, `Q`, `AC`.

### Companion file

`filling-guide.md` explains in plain language how to fill in the template without Copilot. It is not part of the finished document.
