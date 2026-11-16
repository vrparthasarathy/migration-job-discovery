# Task

## Requirement

Make recommend-workflows read its list of use cases and their specifications from the `use-case-index.csv` at the repository root (written by run-discovery), report a missing or blank spec as `missing`, use the fixed proposal ID `recommendations` without asking, and show the full list once with a partial-list warning unless its caller already confirmed it. Also key every Mappings row `<use-case-id>->>candidate-slug` and link blocking questions as `<use-case-id>/Q<n>@v<version>`, with the use case ID `uc-<vendor-slug>-<use-case-slug>` derived from the index row's vendor and use case name, ask once for a blank vendor and write no Mappings row until it is known, and replace the contract copy with the Tracker Data Contract component's file as built. See the planned sections of contract.md. Build after tracker-data-contract.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build workflow-recommender`.
