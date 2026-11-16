# Task

## Requirement

Change the Tracker Reconciler so a use case is identified by its use case ID `uc-<vendor-slug>-<use-case-slug>` (from the Tracker Tables `useCaseId`, derived from `vendor` and `use_case_name`, never stored) instead of its name. `inputs.ts` resolves a key's leading ID against the export Use Cases rows and the Use Cases `add` keys (`Change.useCase` holds the ID, name and slug forms are not valid); `reconcile.ts` `matchesNaturalKey` and the `report.ts` `mr_link` lookup use the ID; an unknown ID, a mismatched `use_case_name` value and two export Use Cases rows deriving one ID stop the run naming the file and line and the expected form. Rewrite the reconcile, repeat, vendor, input, support and fixture tests to ID keys, add a test with two same-named use cases of different vendors, and update README (Design, B01, B09, new B11) and contract.md with the wording in the planned section.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-tools/tracker-reconciler` after the Tracker Tables, Tracker Data Contract and skill components are built.
