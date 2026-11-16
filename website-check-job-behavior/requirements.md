# Requirements: Website Check Job Behavior

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The specification is the completed reference for the website-check job, filled in from the [Job Behavior Template](../job-behavior-template/README.md#purpose) using only its parts, in plain business language, as one file `website-availability-check.md` with a change log.
- It lists as current behaviors, each with a source pointer (the reported alert status `sent` is stated literally and explained as not meaning that a message was delivered): up on 200 to 399, down on any answer code outside 200 to 399 (400 and above, or below 200), down on a timeout or connection failure, configuration error with no alert, notifier failure, the exit codes (0 when up or when the alert was handed over, 1 for a configuration error or an undelivered alert), the default timeout of 5000 milliseconds, an empty recipient list allowed, and redirects not followed. A blank value counts as empty for the address and the timeout.
- It asks the vendor only the questions that pass the question rule: the real notification system, the schedule and frequency, retries, repeated alerts for one outage, and what "one email" means. It asks nothing the source already states.
- Its parameters are `CHECK_URL`, `CHECK_TIMEOUT_MS` and `ALERT_RECIPIENTS`, with no similarity or grouping field.
- It has the heading `Use Case Behavior`, is Version 1, a draft, with no job ID: the acknowledgement log is blank, the "About this document" part and contents list come before the change log. It holds no requested changes, no approved items and no reasons the source does not show.
- Acceptance scenarios (`AC1`, ...) each carry a "covers" line linking the behavior rows, and every current behavior is covered.
- The one-box diagram is vertical, shows the use case, the monitored website, the request going out and the response coming back, and the alert as printed output of the script, with behavior IDs as plain text in edge labels; it implies no real external notification system, and shows no internal modules or file names.

## Must match the source

- The behaviors and defaults of the sibling [Website Availability Check](../website-availability-check/README.md#purpose): its `README.md`, `requirements.md`, `contract.md`, `src/` and `test/`, which are read-only evidence here.

## Need not match

- The job's code structure, its dry-run notifier as a delivery mechanism, or any real email system.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).

## Known risks

- **Two meanings of "behavior".** The behaviors in this component's README (`B01` style) describe this component. The behaviors a job document records (`B1` style) belong to the job. They sit in different files and are separate.
- **Verification gap.** The framework's benchmark verification for documents is not built, so each behavior is marked "untested: benchmark pending". The stand-in is `review-checklist.md` plus a manual dry-run review by someone who has not seen the finished document. No tool runs it and it does not satisfy the test-tag rule. A first dry run of the earlier skill was exploratory and ticked nothing.
- **Document files versus records.** The `README.md`, `craft.json`, `tasks.md`, `requirements.md`, `contract.md` and `review-checklist.md` beside the deliverables are internal and are never sent to the vendor. Copying the finished files out is a manual step.
- **Two kinds of diagram.** The diagram in a component's README shows components. The one-box diagram inside a job document is deliverable content and follows its own rule.
- **Evidence must survive.** The sibling Website Availability Check holds code that no document behavior needs. It stays in place as read-only evidence, and a build of this component must not delete or edit it.

## Revision (use case wording)

Done on 2026-11-16 after the user's alignment of 2026-11-15; the reasons are in the [root requirements](../requirements.md#requirements). `use case` names the business unit, `job` or `script` names only the vendor's script, the question rule reads `what the migrated use case must do`, the heading reads `Use Case Behavior`, and no vendor-readable text mentions workflows or grouping. Structure, IDs and anchors did not change. The diagram shows the printed alert and no real notification system, and the reported status `sent` is stated literally and explained as not meaning delivery. The example was not expanded, the source stays unchanged, version 1 was edited in place because it has never been issued, and the proposed rewording of the repeated-outage question is not decided.
