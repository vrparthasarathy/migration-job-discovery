# Task

## Requirement

Create a GitHub Copilot agent skill that creates, drafts, updates and versions a job behavior document from job source (and optional vendor documents) using the template, plus usage and model-selection guidance and a fallback prompt, with no Craft dependency. Revised after the user's review on 2026-11-15; behaviors B01 to B10 confirmed by the user in chat.

## Plan

Implemented as planned (README plan steps 1 to 5); the plan is merged into README `## Design`.

## Progress

- Built `document-job-behavior/` (SKILL.md, self-check.md, template copy verified identical with cmp), `usage-and-model-guidance.md`, `drafting-prompt.md`, `review-checklist.md`.
- Merged the plan into README Design with a diagram; removed README Plan.
- Fresh file review, three rounds; the third passed B07 to B10 and the wording rules. Minor findings of round three were applied afterwards (first acknowledgement fills the blank template row, three clauses added to the fallback, repository paths in the guidance).
- No automated checks are declared; none run.

## Validation

No automated checks declared (documents). Evidence is the fresh file review by the reviewer agent: B07 to B10 and the wording rules pass; B01 to B06 are content-faithful on the files but are not passed, because acceptance 1 needs a real Copilot dry run on the website job source compared with the reference, which was not possible here. Acceptance 2 (no Craft term, model advice marked team-reported with a valid-as-of date) is supported by the grep over the skill folder, guidance and fallback (no match) and the review of B08 and B09. No evidence folder (no checks captured).

## Result

Not recorded: acceptance 1 is not met.

## Blockers And Escalations

Blocked on acceptance 1. B01 to B06 need a real Copilot dry run, and there is no Copilot access in the build environment. Items [B01] to [B06] in `review-checklist.md` stay unticked.

Exact next action: someone with Copilot access installs the skill folder `document-job-behavior/` in a repository next to the website availability check job, runs it in VS Code agent mode on `website-availability-check/src/` without showing the reference, compares the result with `website-check-job-behavior/website-availability-check.md`, then gives answers to a few questions (update) and acknowledgement facts (acknowledgement) as the dry-run steps in `review-checklist.md` describe, records the model and date, ticks B01 to B06 only the ones that pass, and marks the task complete.

## Recovery

All deliverables are committed in the worktree branch. Resume by performing the dry run above; no file needs rebuilding.

## Next Action

Run the Copilot dry run described under Blockers And Escalations.
