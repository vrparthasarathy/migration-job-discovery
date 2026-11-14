# Requirements

## Requirements

- The project delivers a job behavior pack for vendor review: a blank template, a short filling guide, a completed reference specification of the website-check job, and a GitHub Copilot agent skill with usage and model guidance. Our team's developers use GitHub Copilot (VS Code agent mode) and no Craft; the vendor receives only the finished specification of each job, read through a GitHub link.
- The pack is plain Markdown files and one skill folder: `job-behavior-template.md`, `filling-guide.md`, `website-availability-check.md`, the `document-job-behavior/` skill folder, `usage-and-model-guidance.md` and the fallback `drafting-prompt.md`. No Craft installation, file, command or term is needed or mentioned in them. The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md`, `backlog.md` and `review-checklist.md` files are internal and are never sent.
- Purpose: the vendor, who runs and maintains the jobs today, reviews and acknowledges a versioned record of each job's current behavior before our team migrates the jobs onto our client's platform as workflows. The record protects against scope creep and outdated scripts: it shows what the vendor acknowledged, for which script. This is an as-is migration, so there are no requested changes and no approved items.
- Two kinds of statement stay separate: current behaviors (`B1`, ...) and questions (`Q1`, ...). A question is asked only when the source cannot show the answer and the answer would change what the migrated workflow must do; it is never about what the source states or the reason behind a behavior the source shows. The vendor answers each question one by one and confirms the current behaviors as a whole.
- One file per use case with a change log and no job ID; the use case name is the identity and file name. Our team tags the repository at each acknowledgement.
- The vendor acts in a tracker (a later backlog item), not in the documents. The documents stay in our repository and only our team edits them and records the acknowledgement, from the vendor's tracker entry or reply.
- Acknowledgement is never described as preventing all future issues, and inferred behavior is never presented as current behavior or as approved.
- Grouping jobs into workflows is our own later decision, in a separate internal document that is not built here and not signed by the vendor.
- Document components are not run by any tool. The root declares no `test` or `coverage` check; verification is each component's `review-checklist.md` and a manual dry-run review, and each behavior carries the "untested: benchmark pending" marker.
- The illustrative job [Website Availability Check](website-availability-check/README.md#purpose) stays unchanged and read-only as source evidence. It declares its own `test` and `coverage` checks, which no document component uses.

## Must match the source

- Not applicable for the documents beyond what each component states. The reference specification must match the behavior of the illustrative job's source.

## Need not match

- Any implementation of the job on the migration platform, or any grouping of similar jobs.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
