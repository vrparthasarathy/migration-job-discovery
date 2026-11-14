# Requirements: Job Behavior Template

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The template is a plain Markdown form a developer fills in to document one client job from its source code. It is written for a business reviewer: short sentences, no framework or tool vocabulary, technical terms explained when first used.
- It separates four kinds of statement with ID prefixes and keeps them apart: source-evidenced current behavior (`CUR-`), assumptions and unknowns (`ASM-`), client-requested changes (`CHG-`), and approved migration behavior (`MIG-`). Approved items exist only after the client acknowledges a baseline.
- It carries a header (use case name, baseline number, date, status, source revision, plus a stable job ID), a short change log with one entry per baseline, and an acknowledgement block with per-item disposition, a named business owner and technical reviewer, and a plain statement of what acknowledgement does and does not claim.
- It never claims that acknowledgement prevents future issues, that behavior is error-free, or that inferred behavior is approved, and it says the specification does not describe how the job will be built or grouped on the migration platform.
- It records the job ID and a parameters table so similar jobs can be compared later, and has no similarity or grouping field.
- It asks for an operational context part (schedule and frequency, logging, monitoring and alerts, owner, failure handling) that defaults to unknown.
- The section list is derived from these behaviors by the builder, recorded in `contract.md`, and reviewed by the user after the build.

## Must match the source

- Not applicable: this is new. It must match the reference specification [Website Check Job Behavior](../website-check-job-behavior/requirements.md#requirements) (same sections and ID scheme).

## Need not match

- Any job's implementation, a similarity or grouping scheme, or a particular tool.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README describe the document. The job behaviors a document records carry the prefixes `CUR-`, `ASM-`, `CHG-` and `MIG-` and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule.
- **Client files versus records.** The `README.md`, `craft.json` and `tasks.md` beside the deliverables are framework records and are never sent to the client. Copying the client-facing files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The black-box diagram inside a job document is deliverable content and follows its own rule.
