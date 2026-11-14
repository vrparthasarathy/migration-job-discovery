# Requirements: Job Behavior Template

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The template is a plain Markdown form a developer fills in to document one vendor job from its source code. It is written for a business reviewer: short sentences, no framework or tool vocabulary, technical terms explained when first used.
- It keeps two kinds of statement apart with ID prefixes: current behavior from the source (`CUR-`) and assumptions and unknowns (`ASM-`). It has no place for requested changes or approved items, because this is an as-is migration.
- It carries a header (use case name, version number, date, status, source revision and script link, plus a stable job ID), a short change log with one entry per version, and an acknowledgement block.
- The acknowledgement block holds the company name, the date acknowledged, the version reviewed, the script link and revision, a tick box that the supplied script is the one running in production today, one overall confirmation of the current behaviors, a reference to the vendor's own tracker entry or reply, and a plain statement of what it does and does not claim. It has no person name and no role. It is recorded by our team and left blank by the template and by any tool.
- It never claims that acknowledgement prevents future issues, that behavior is error-free, or that inferred behavior is approved, and it says the document does not describe how the job will be built or grouped on the migration platform.
- Acceptance scenarios are a distinct part. Each is given/when/then with a "covers" line naming the current behavior IDs; every current behavior is covered by at least one scenario; an answered unknown carries a "resolved: now CUR-n" note. There is no separate traceability table.
- Each unknown is a separate item that the vendor answers one by one (in the tracker, a later backlog item). The vendor never edits the document.
- It records the job ID and a parameters table so similar jobs can be compared later, and has no similarity or grouping field.
- It asks for operational context (schedule and frequency, logging, monitoring and alerts, owner, failure handling), unknown by default.
- The section list is derived from these behaviors by the builder, recorded in `contract.md`, and reviewed by the user after the build.

## Must match the source

- Not applicable: this is new. It must match the reference specification [Website Check Job Behavior](../website-check-job-behavior/requirements.md#requirements) (same sections and ID scheme).

## Need not match

- Any job's implementation, a similarity or grouping scheme, or a particular tool.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README describe the document. The job behaviors a document records carry the prefixes `CUR-` and `ASM-` and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule.
- **Document files versus records.** The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` beside the deliverables are internal and are never sent to the vendor. Copying the vendor-facing files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The one-box diagram inside a job document is deliverable content and follows its own rule.
