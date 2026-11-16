# Task

## Requirement

Change the Master Workbook Updater to match a new question, access or mapping row's use case by the derived use case ID `uc-<vendor-slug>-<use-case-slug>` (from the shared `useCaseId` helper in tracker-tables) instead of by name: the `use_case` cell of the review CSVs now carries the ID; the "ambiguous use case name" conflict becomes "the use case ID matches more than one master row"; a new use case takes its `use_case_name` from the proposed field; an unknown ID or an old name or slug-alone form stops the run naming file and line. Use the exact wording in the planned section of contract.md; amend the fixtures to the new local references. Behavior B3 is reworded in the plan.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-tools/master-workbook-updater`.
