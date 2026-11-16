# Task

## Requirement

Change the Review CSV Exporter's wording, fixtures and tests for the use case ID: the `use_case` cell of every review CSV (header unchanged) holds the use case ID `uc-<vendor-slug>-<use-case-slug>` instead of the name, and rows within a tier are ordered by that ID, so grouped by vendor then by use case name. Update contract.md (use_case cell, sort line), README (B03, B10) and rewrite the order, export, repeat, conflict, review, merge, input, headings and support tests to ID keys, with a test that two vendors' same-named use cases give two rows. No source change is expected, because the cell and the sort read the reconciler's `Change.useCase`.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-tools/review-csv-exporter` after the Tracker Reconciler is built.
