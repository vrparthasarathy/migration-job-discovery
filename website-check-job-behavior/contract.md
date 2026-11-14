# Contract

## Contract

### What the specification must show

The specification fills in every element of the [template contract](../job-behavior-template/contract.md#contract) and adds none.

| Element | Content for the website-check job |
| --- | --- |
| Header | Use case name "Website Availability Check"; Version 1; the build date; status draft; the source revision and script link the specification was written from; a stable job ID. |
| Parameters | `CHECK_URL` (required), `CHECK_TIMEOUT_MS` (default 5000), `ALERT_RECIPIENTS` (optional, may be empty). |
| Outputs | One outcome line per run; exit code 0 when the site is up or the alert was handed over; exit code 1 for a configuration error or an undelivered alert; a configuration error message. |
| External dependencies | The monitored website (the job calls it and receives an answer or a failure) and the notification system (the job asks it to send one alert email and receives success or failure). |
| Diagram | One black box with those two external systems, the outgoing calls and the incoming responses. |
| Acknowledgement | Blank. |

### Source evidence

The current behaviors point to the source files of the sibling [Website Availability Check](../website-availability-check/README.md#purpose) by file and place. These pointers are the only place file names appear.
