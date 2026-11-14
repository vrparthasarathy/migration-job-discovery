# Contract

## Contract

### Notifier port

| Type | Shape |
| --- | --- |
| `CheckResult` | `{ ok: true, status: number }` or `{ ok: false, status?: number, reason: string }` |
| `HttpCheck` | `(url: string, timeoutMs: number) => Promise<CheckResult>` |
| `Alert` | `{ url: string, status?: number, reason?: string, time: string, recipients: string[] }`; `time` is ISO 8601 UTC |
| `Notifier` | `{ send(alert: Alert): Promise<void> }`; rejecting means the alert is undelivered |

### Run outcome

`runCheck` returns `{ state: "up" | "down", alert: "none" | "sent" | "undelivered", exitCode: 0 | 1 }`.

### Configuration and exit codes

The environment variables and exit codes are in the [root contract](../contract.md#contract).

### Output

The job prints one line for the outcome. A configuration error is printed to stderr. The dry-run notifier prints the alert to stdout.
