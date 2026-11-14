# Requirements: Website Check Job Behavior

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The specification is the completed reference for the website-check job, filled in from the [Job Behavior Template](../job-behavior-template/README.md#purpose) using only its sections, in plain business language.
- It lists as current behavior, with a source pointer for each: up on 200 to 399, down on 400 and above, down on a timeout or connection failure, configuration error with no alert, notifier failure, the exit codes (0 when up or when the alert was handed over, 1 for a configuration error or an undelivered alert), the default timeout of 5000 milliseconds, an empty recipient list allowed, and redirects not followed.
- It lists as separate unknowns for the client to answer one by one, never as fact: the real email system and transport, the schedule and frequency, retries, repeated alerts for one outage, and what "one email" means. These are the user's unresolved decisions.
- Its parameters are `CHECK_URL`, `CHECK_TIMEOUT_MS` and `ALERT_RECIPIENTS`, with no similarity or grouping field.
- It is Version 1, a draft: status draft, the acknowledgement block blank, any sample marked as a worked example. It holds no requested changes and no approved items.
- Acceptance scenarios each carry a "covers" line and every current behavior is covered.
- The one-box diagram shows the job, the monitored website, the alert request going out and the response coming back; no internal modules or file names.

## Must match the source

- The behaviors and defaults of the sibling [Website Availability Check](../website-availability-check/README.md#purpose): its `README.md`, `requirements.md`, `contract.md`, `src/` and `test/`, which are read-only evidence here.

## Need not match

- The job's code structure, its dry-run notifier as a delivery mechanism, or any real email system.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README describe the document. The job behaviors a document records carry the prefixes `CUR-` and `ASM-` and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule.
- **Client files versus records.** The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` beside the deliverables are internal and are never sent to the client. Copying the client-facing files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The one-box diagram inside a job document is deliverable content and follows its own rule.
- **Evidence must survive.** The sibling Website Availability Check holds code that no document behavior needs. It stays in place as read-only evidence, and a build of this component must not delete or edit it.
