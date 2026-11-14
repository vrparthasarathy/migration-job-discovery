# Review Checklist

Internal dry-run review of `website-availability-check.md`. Use it as a reviewer who has not seen the finished document. Mark each item pass or fail. This is the stand-in for automated checks; no tool runs it. Last dry-run: 2026-11-15, round 2 (fresh reviewer agent): B01 to B09 all pass.

- [x] [B01] Every statement is in plain business language, and the one-box diagram, laid out vertically, shows the monitored website, the alert request going out and the response coming back, with the behavior IDs in the edge labels and a plain-text description beside it.
- [x] [B02] Compared with the source in `website-availability-check`, each of these is a current behavior with a source pointer: up on 200 to 399, down on any answer code outside 200 to 399 (400 and above, or below 200), down on a timeout or connection failure, configuration error with no alert, notifier failure, the exit codes, the default timeout of 5000 milliseconds, an empty recipient list allowed, and redirects not followed.
- [x] [B03] The real notification system, the schedule and frequency, retries, repeated alerts for one outage and the meaning of "one email" are each their own question for the vendor, and no question asks about anything the source already states.
- [x] [B04] The document holds only current behaviors and questions, with no requested changes, no approved items and no reasons the source does not show.
- [x] [B05] The header gives the use case name, Version 1, the date, status draft, the source revision and the script link as a repository path, with no job ID; "About this document" and the contents list come before the change log; the acknowledgement log is blank and holds no sample.
- [x] [B06] Every acceptance scenario (AC1, AC2, ...) has a "covers" line that links the behavior rows it proves, and every current behavior is covered by at least one scenario.
- [x] [B07] The parameters are `CHECK_URL`, `CHECK_TIMEOUT_MS` and `ALERT_RECIPIENTS` with their values or defaults, and no similarity or grouping field appears.
- [x] [B08] No internal module, class or function name appears in the business text or the diagram, and file names appear only in evidence pointers.
- [x] [B09] The document uses all of the template's parts, adds none, and fills operational context only from evidence or as `unknown`.
