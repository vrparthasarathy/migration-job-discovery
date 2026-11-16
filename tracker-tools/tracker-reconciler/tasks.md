# Task

## Requirement

Build the `reconcile` and `validate` commands: read the proposal files and the latest export (CSV per tab with a manifest), and write a reconciliation report, per-tab additions, field updates, conflicts, duplicate and link suggestions, re-review suggestions and vendor-safe copies. Preserve every human-entered value and central reference, produce identical output on repeated runs, flag stale exports and base mismatches as conflicts (holding the affected record and the rows that refer to it while reporting unrelated safe changes), keep per-use-case answers and released question text, suggest re-review from the grouping impact with unknown kept visible, never release or apply anything, and stop with a clear error and no partial output on bad input.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-tools/tracker-reconciler`.
