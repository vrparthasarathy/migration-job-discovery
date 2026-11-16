# Contract

## Contract

### Command

`reconcile --export <dir> --proposals <dir> [--scope <slug>] --out <dir>` and `validate <file-or-dir>`; see the group's [contract](../contract.md#contract).

### Inputs

- Proposals: `tracker-updates/<proposal-id>/tracker-updates.csv` files in the shared long format of the data contract, found recursively under `--proposals`.
- Export: one CSV per tab named as the contract names them, with `manifest.csv`. Extra lead columns are allowed and preserved. A missing tab file is an empty tab.

### Outputs (`--out <dir>`)

| File | Content |
| --- | --- |
| `reconciliation-report.md` | Counts, the inputs and their dates, and each section below in reading order, with the rejected rows and their reasons. Marked internal. |
| `additions/<tab>.csv` | Only for a tab with additions. Columns: `suggested_ref`, `ref_status` (`suggested`), `local_key`, the spec columns, `suggested_<column>` for each human column, `suggested_proposal_refs`, `trace_source`, `trace_spec_version`, `trace_mr_link`. |
| `field-updates.csv` | `tab, record, record_key, field, current_value, proposed_value, operation, source, update_id`. |
| `conflicts.csv` | `kind, tab, record, record_key, field, current_value, proposed_value, base_value, detail, update_id, source`. Kinds: `stale-export`, `base-mismatch`, `later-edit`, `proposal-disagreement` with both values, and `held` (the affected record and the rows that refer to it, detail `held by <conflict>`). Unrelated safe changes are not held. |
| `suggestions.csv` | `kind, tab, record, field, current_value, suggested_value, related_record, score, review, reason, source, update_id`. Kinds: `link` (review `likely` or `uncertain-review`), `text-review`, `re-review` (review `impact: could-affect` or `impact: unknown`) and `human-field` (review `copy-if-agreed` or `current-value-kept`). |
| `vendor/<slug>/...` | That vendor's tables from the vendor view (its released question rows and vendor-visible columns) and `field-updates.csv` (`tab, record, field, current_value, proposed_value`) restricted to those rows and columns. Never additions, conflicts, suggestions, groups, links or mappings. |

`validate` writes nothing: on success it prints `<file>: ok` for each file checked, on failure it prints each problem on standard error.

### Rules

- Forbidden fields from a proposal (the contract's ownership table) are rejected with a reason: `released_on`, `batch_ref`, answers and answer status, acknowledgement fields, ticket, `raised_on`, expected availability, verification fields and decision fields. A `request_status` other than a suggested `proposed` or `ready-to-raise` is also rejected. So are computed fields, `proposal_refs`, central reference columns and a wording change to a released `question_text`.
- Similarity checking is the reconciler's alone: it compares new question rows with the export and with earlier new rows and suggests links, and no skill proposes link or group rows. A score of at least 0.5 is suggested and at least 0.8 is `likely`; in between it is `uncertain-review`. The score is 1 for equal normalised text and otherwise the overlap of the token sets (Jaccard).
- An existing central reference, answer, answer status, released question text, owner, status, ticket, date or acknowledgement is never changed or reassigned. A suggested reference is the next number after the highest reference of its prefix anywhere in the export.
- Conflicts are never resolved by the tool. A re-review suggestion follows the use case's grouping impact (a lead's override first, else the proposer's suggestion); an unknown impact is listed as unknown and never treated as no impact; existing decisions are never changed.
- A new question row never receives an answer from another row, and a link suggestion never links anything.
- The tool never releases a question, sets a due date or applies a proposal.
- The same inputs give byte-identical outputs. A proposal already reflected in the export (an equal value, or its `update_id` in the record's `proposal_refs`) yields nothing.
- On any input error the exit status is 1, the message names the file and line, and no partial output is written. The output folder is created or replaced only after every input is valid, and only if it is new, empty or a previous run's output.
