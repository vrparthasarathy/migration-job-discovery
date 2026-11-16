# Task

## Requirement

Make every row of propose-tracker-updates keyed by the use case ID `uc-<vendor-slug>-<use-case-slug>` (derived from vendor and use_case_name, never stored): the use case record key, the Questions record key `<use-case-id>/Q<n>` and `spec_refs` `<use-case-id>/Q<n>@v<version>`. Add the vendor-unknown rule (ask once, no keyed row), keep the reworded record_key sentence that no longer ties the slug to a folder name, regenerate the example proposal under a fictional vendor, and replace the contract copy with the Tracker Data Contract component's file as built. See the planned section of contract.md. Build after tracker-data-contract.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-update-proposer`.
