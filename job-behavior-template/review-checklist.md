# Review Checklist

Internal dry-run review of `job-behavior-template.md`. Use it as a reviewer who has not seen the template before. Mark each item pass or fail. This is the stand-in for automated checks; no tool runs it. Last dry-run: 2026-11-14, all items pass (reviewer agent, after one fix round of part numbers).

- [x] [B01] Part 1 explains in plain language how to fill in the form, names no Craft file, command or term anywhere in the template, and needs only a text editor or GitHub Copilot.
- [x] [B02] The form separates statements into two labelled kinds, current behavior (`CUR-`) and assumptions and unknowns (`ASM-`), and says an inferred statement is never recorded as current behavior.
- [x] [B03] Each current behavior row has an ID, a "when ... then ..." statement in business language and a source pointer, and the form says a statement without a pointer moves to assumptions and unknowns.
- [x] [B04] The form has a stable job ID and separate tables for inputs, outputs, parameters (name and this job's value) and external dependencies, and the dependency table asks for the role and the direction of every call.
- [x] [B05] The diagram part shows the job as one black box with only external systems, outgoing calls and incoming responses, has a plain-text description beside it, and forbids internal modules, classes and architecture.
- [x] [B06] Acceptance scenarios are their own part, each is given/when/then with a "covers" line naming current behavior IDs, the form requires every current behavior to be covered, and answered unknowns carry "resolved: now CUR-n".
- [x] [B07] The header holds use case name, version number, date, status (draft or acknowledged), source revision and script link; a change log has one entry per version; the form says an acknowledged version is never edited and a change makes the next version.
- [x] [B08] The acknowledgement block is blank and has company name, date, version reviewed, script link and revision, a production-script tick box, one overall confirmation of current behaviors, a tracker entry or reply reference, a plain statement of what it does and does not claim, and no field for a person name or role.
- [x] [B09] Operational context asks for schedule and frequency, logging, monitoring and alerts, owner and failure handling, each defaulting to `unknown`.
- [x] [B10] Each unknown is its own item with its own question for the vendor, the form states it says nothing about how the job will be built or grouped on the migration platform, and it has no similarity, grouping or implementation field.
