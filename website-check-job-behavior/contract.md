# Contract

## Contract

### What the specification must show

The specification fills in every element of the [template contract](../job-behavior-template/contract.md#contract) and adds none.

| Element | Content for the website-check job |
| --- | --- |
| Header | Document heading `Use Case Behavior: Website Availability Check`; use case name "Website Availability Check"; Version 1; the build date; status draft; the source revision and script link the specification was written from (the last commit that changed the script). No job ID. |
| Parameters | `CHECK_URL` (required), `CHECK_TIMEOUT_MS` (default 5000), `ALERT_RECIPIENTS` (optional, may be empty). |
| Outputs | One outcome line per run with the alert status `none`, `sent` or `undelivered`, where `sent` is literal and is explained as not meaning that a message was delivered; exit code 0 when the site is up or the alert was handed over; exit code 1 for a configuration error or an undelivered alert; a configuration error message; the alert text, printed today. |
| External dependencies | The monitored website (the use case calls it and receives an answer or a failure) and the printed output where the alert text goes today. It is not a notification system; whether a real one is used in production is the open question Q1. |
| Diagram | One black box with the monitored website, the request and the response, and the alert as printed output of the script, vertical. It implies no real external notification system. |
| Acknowledgement log | Blank. |

### Source evidence

The current behaviors point to the source files of the sibling [Website Availability Check](../website-availability-check/README.md#purpose) by file and place. These pointers are the only place file names appear.

### Wording and revision

The specification follows the revised template: heading `Use Case Behavior`, `use case` wording with `job` or `script` only for the vendor's script, and the question rule text "what the migrated use case must do". Questions and scenarios are unchanged except for wording: Q1 reads "which notification system, if any", Q2 to Q4 say "script" or "use case" instead of "job", and the scenarios say "use case"; Q5 is not reworded. The diagram shows the actual printed alert output and implies no real external notification system (the production notifier stays the open question Q1). The reported alert status `sent` stays literal and is explained as not meaning delivery: a successful print or handoff of the request is not a delivered message. Version 1 was edited in place, with no new version, because it has never been issued. The source revision is `fef65ff6552d2e781dbafb0f7445a5fcb0707e9f`, the unchanged last commit of the script source.
