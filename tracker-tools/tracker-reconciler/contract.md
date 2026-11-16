# Contract

## Contract

### Command

`reconcile --export <dir> --proposals <dir> [--scope <slug>] --out <dir>` and `validate <file-or-dir>`; see the group's [contract](../contract.md#contract).

### Inputs

- Proposals: `tracker-updates/<proposal-id>/tracker-updates.csv` files in the shared long format of the data contract.
- Export: one CSV per tab named as the contract names them, with `manifest.csv`. Extra lead columns are allowed and preserved.

### Outputs (`--out <dir>`)

| File | Content |
| --- | --- |
| `reconciliation-report.md` | Counts, the inputs and their dates, and each section below in reading order. Marked internal. |
| `additions/<tab>.csv` | Wide rows to add, with a traceability column holding source, specification version and MR link, and a suggested reference marked `suggested`. |
| `field-updates.csv` | Existing record, field, current value, proposed value, source. |
| `conflicts.csv` | Stale export, base mismatch and later-edit conflicts with both values, and the held changes (the affected record and the rows that refer to it, reason `held by <conflict>`). Unrelated safe changes are not held. |
| `suggestions.csv` | Link suggestions between similar question rows, text-review suggestions for reworded questions, re-review suggestions (grouping impact could-affect or unknown, with unknown listed as unknown) and human-field suggestions. |
| `vendor/<slug>/...` | The same files restricted to that vendor's rows and vendor-visible columns. |

### Rules

- Forbidden fields from a proposal (the contract's ownership table) are rejected with a reason: `released_on`, `batch_ref`, answers and answer status, acknowledgement fields, ticket, `raised_on`, expected availability, verification fields and decision fields. A `request_status` other than a suggested `proposed` or `ready-to-raise` is also rejected.
- Similarity checking is the reconciler's alone: it compares new question rows with the export and suggests links, and no skill proposes link or group rows.
- An existing central reference, answer, answer status, released question text, owner, status, ticket, date or acknowledgement is never changed or reassigned.
- Conflicts are never resolved by the tool. A re-review suggestion follows the use case's grouping impact (a lead's override first, else the proposer's suggestion); an unknown impact is listed as unknown and never treated as no impact; existing decisions are never changed.
- A new question row never receives an answer from another row, and a link suggestion never links anything.
- The tool never releases a question, sets a due date or applies a proposal.
- On any input error the exit status is 1, the message names the file and line, and no partial output is written.
