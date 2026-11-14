# Contract

## Contract

### Environment variables

| Variable | Required | Meaning |
| --- | --- | --- |
| `CHECK_URL` | yes | The website URL to check; must be `http:` or `https:`. |
| `CHECK_TIMEOUT_MS` | no | Request timeout in milliseconds; default 5000. |
| `ALERT_RECIPIENTS` | no | Comma-separated email addresses for the alert; may be empty. |

### Exit codes

| Code | When |
| --- | --- |
| 0 | The site is up, or it is down and the alert was handed to the notifier. |
| 1 | Configuration error, or the notifier failed and the alert is undelivered. |

See the component's [contract](website-availability-check/contract.md#contract) for the notifier port and the alert shape.
