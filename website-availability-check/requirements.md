# Requirements: Website Availability Check

The shared rules are in the [root requirements](../requirements.md).

## Requirements

- One run checks the one URL in `CHECK_URL` once and exits; it does not loop or schedule itself.
- Up means an HTTP answer of 200 to 399 within the timeout. Down means 400 or above, a timeout or a connection failure. Redirects are not followed.
- A down site requests exactly one alert through the `Notifier` port, carrying the URL, the status or the error reason, the time and the recipients. An up site requests none.
- An invalid or missing URL is a configuration error: nothing is checked and no alert is requested.
- A failing notifier makes the run exit with code 1 and report the alert as undelivered.
- The decision logic takes the HTTP check, the notifier and the clock as arguments so tests inject mocks; no test touches the network, `fetch` or email.

## Must match the source

- The environment variable names and exit codes in the [contract](contract.md#contract).

## Need not match

- A real email transport, retries, outage de-duplication, scheduling.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json); it names B01 to B06.
