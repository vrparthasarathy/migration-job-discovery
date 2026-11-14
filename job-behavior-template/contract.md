# Contract

## Contract

### Content the form must carry

The builder arranges these into sections and records the section list here after the build, for the user to review.

| Element | Content |
| --- | --- |
| Fill-in guidance | Plain-language instructions at the start; no framework names, only a text editor or GitHub Copilot. |
| Header | Use case name, baseline number (1, 2, 3), date, status (`draft` or `acknowledged`), source revision; a stable job ID beside the name. |
| Change log | One entry per baseline: number, date, what changed in plain words, who asked (source change, client request, or resolved assumption). |
| Statement kinds | `CUR-<n>` current behavior (ID, when/then statement, source pointer), `ASM-<n>` assumption or unknown, `CHG-<n>` client-requested change, `MIG-<n>` approved migration behavior (only after acknowledgement). |
| Contracts | Tables for inputs, outputs, parameters (name and this job's value) and external dependencies (role, direction of each call). |
| Diagram | One black box for the job, external systems, outgoing calls and incoming responses only, with a plain-text description beside it. |
| Acceptance scenarios | Given/when/then, each naming the behavior IDs it covers. |
| Traceability | Every current behavior covered by a scenario; every `CHG-`, `ASM-` resolution and `MIG-` item linked to the statements it came from. |
| Acknowledgement | Per-item disposition (accepted, changed, rejected), business owner, technical reviewer, baseline number and date, each open assumption accepted or deferred, and the plain statement of what acknowledgement does and does not claim. |
| Operational context | Schedule and frequency, logging, monitoring and alerts, owner, failure handling; each `unknown` by default. |

### Wording rules

- Plain business language. A file name appears only in a source pointer.
- Never state an inferred behavior as current behavior.
- Never fill in the acknowledgement or any `MIG-` item.
