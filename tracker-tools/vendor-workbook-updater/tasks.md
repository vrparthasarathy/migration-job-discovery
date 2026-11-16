# Task

## Requirement

Change the Vendor Workbook Updater to match a use case by the derived use case ID `uc-<vendor-slug>-<use-case-slug>` (from the shared `useCaseId` helper in tracker-tables) instead of by name: the `use_case` cell of the review CSVs now carries the ID; a new question or access row finds its use case by ID in the workbook, the export or the review files; a new use case takes its `use_case_name` from the proposed field; an unknown ID or an old name or slug-alone form stops the run naming file and line. Use the exact wording in the planned section of contract.md; amend the fixtures to the new local references. Behaviors B5, B8 and B10 are reworded in the plan.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-tools/vendor-workbook-updater`.
