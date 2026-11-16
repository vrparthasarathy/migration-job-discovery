# Task

## Requirement

Make run-discovery work with use-case folders at any depth under one repository root: it writes a `use-case-index.csv` at the root (one row per use case: use_case_name, slug, vendor, folder, spec), derives each folder's proposal ID as `uc-<vendor-slug>-<use-case-slug>` and stops on a duplicate, uses the fixed recommendations ID `recommendations`, and runs workflow recommendation over every index row after showing the full list once with a partial-list warning. See the contract's planned section. After the export it hands the review to the `record-review-decisions` skill and records no decision itself.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build discovery-orchestrator`.
