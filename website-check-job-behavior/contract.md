# Contract

## Contract

### What the specification must show

The specification fills in every element of the [template contract](../job-behavior-template/contract.md#contract) and adds none.

| Element | Content for the website-check job |
| --- | --- |
| Header | Use case name "Website Availability Check"; Version 1; the build date; status draft; the source revision and script link the specification was written from (the last commit that changed the script). No job ID. |
| Parameters | `CHECK_URL` (required), `CHECK_TIMEOUT_MS` (default 5000), `ALERT_RECIPIENTS` (optional, may be empty). |
| Outputs | One outcome line per run; exit code 0 when the site is up or the alert was handed over; exit code 1 for a configuration error or an undelivered alert; a configuration error message. |
| External dependencies | The monitored website (the job calls it and receives an answer or a failure) and the notification system (the job asks it to send an alert and receives success or failure). |
| Diagram | One black box with those two external systems, the outgoing calls and the incoming responses, vertical. |
| Acknowledgement log | Blank. |

### Source evidence

The current behaviors point to the source files of the sibling [Website Availability Check](../website-availability-check/README.md#purpose) by file and place. These pointers are the only place file names appear.

### Planned revision

The specification follows the revised template: heading `Use Case Behavior`, `use case` wording with `job` only for the script, and the question rule text "what the migrated use case must do". Questions and scenarios are unchanged. Planned on 2026-11-15: the diagram shows the actual printed alert output and implies no real external notification system (the production notifier stays the open question Q1), and the reported alert status `sent` stays literal with an explanation that a successful print or handoff does not mean delivery. The rewording of the repeated-outage question is undecided and not planned.
