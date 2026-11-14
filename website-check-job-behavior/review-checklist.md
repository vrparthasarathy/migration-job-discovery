# Review Checklist

Internal dry-run review of `website-check-job-behavior-v1.md`. Use it as a reviewer who has not seen the finished document. Mark each item pass or fail. This is the stand-in for automated checks; no tool runs it. Last dry-run: 2026-11-14, round 2 (fresh reviewer agent, after the source revision fix): B01 to B09 all pass.

- [x] [B01] Every statement is in plain business language, and the one-box diagram shows the monitored website, the alert request going out and the response coming back, with a plain-text description beside it.
- [x] [B02] Compared with the source in `website-availability-check`, each of these is a current behavior with a source pointer: up on 200 to 399, down on 400 and above, down on a timeout or connection failure, configuration error with no alert, notifier failure, the exit codes, the default timeout of 5000 milliseconds, an empty recipient list allowed, and redirects not followed.
- [x] [B03] The real email system, the schedule and frequency, retries, repeated alerts for one outage and the meaning of "one email" are each their own unknown in part 6 with one question for the vendor, and none is stated as fact.
- [x] [B04] The document holds only current behavior and assumptions and unknowns, with no requested changes and no approved items.
- [x] [B05] The header gives Version 1, the date, status draft, the source revision, the script link as a repository path and a stable job ID; the acknowledgement block is blank and holds no sample.
- [x] [B06] Every acceptance scenario has a "covers" line naming current behavior IDs, and every current behavior is covered by at least one scenario.
- [x] [B07] The parameters are `CHECK_URL`, `CHECK_TIMEOUT_MS` and `ALERT_RECIPIENTS` with their values or defaults, and no similarity or grouping field appears.
- [x] [B08] No internal module, class or function name appears in the business text or the diagram, and file names appear only in source pointers.
- [x] [B09] The document uses all 11 parts of the template with its numbering, adds none, and fills operational context as unknown where the source is silent.
