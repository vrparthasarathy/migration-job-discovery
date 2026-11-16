# Task

## Requirement

Add one exported function `useCaseId(vendor, name)` to the Tracker Tables library, in a new module `src/use_case_id.ts`, returning `uc-<vendor-slug>-<use-case-slug>` by the slug rule (lower case, each run of characters outside `a-z` and `0-9` becomes one `-`, leading and trailing `-` trimmed) and `undefined` when either slug is empty, with its test `test/use_case_id.test.ts`. Change no other module or test. The tools import it so none keeps a private copy.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-tools/tracker-tables`.
