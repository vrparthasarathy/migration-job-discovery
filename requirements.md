# Requirements

## Requirements

- The project delivers a client-facing job behavior specification pack: a blank template, a completed reference specification of the website-check job, and a Copilot prompt with usage and model guidance. The client has GitHub Copilot and no Craft.
- The client pack is plain Markdown only: `job-behavior-template.md`, `website-check-job-behavior.md`, `drafting-prompt.md` and `usage-and-model-guidance.md`. No Craft installation, file, command or term is needed or mentioned in them. The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` files are internal and are never sent.
- Purpose: the client reviews and explicitly acknowledges a versioned behavioral migration baseline before jobs are migrated onto our platform as workflows. The client confirms each job's behaviors and acceptance scenarios; grouping jobs into workflows is our own later decision, in a separate internal document that is not built here and not signed by the client.
- Acknowledgement is never described as preventing all future issues, and inferred behavior is never presented as approved.
- The four kinds of statement stay separate: source-evidenced current behavior, assumptions and unknowns, client-requested changes, and approved migration behavior, with traceability between them.
- Document components are not run by any tool. The root declares no `test` or `coverage` check; verification is each component's `review-checklist.md` and a manual dry-run review, and each behavior carries the "untested: benchmark pending" marker.
- The illustrative job [Website Availability Check](website-availability-check/README.md#purpose) stays unchanged and read-only as source evidence. It declares its own `test` and `coverage` checks, which no document component uses.

## Must match the source

- Not applicable for the documents beyond what each component states. The reference specification must match the behavior of the illustrative job's source.

## Need not match

- Any implementation of the job on the migration platform, or any grouping of similar jobs.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
