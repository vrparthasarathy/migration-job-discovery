# Task

## Requirement

Create the Copilot skill `propose-tracker-updates` that reads one use case specification (and the previous version when updating) and writes proposed rows for the Use Cases and Questions tabs into the developer's proposal directory, following the shared tracker data contract, with no Craft dependency. It supports a first run and repeat updates from the resulting specifications without duplicates, keeps question identities and vendor answers when wording changes, flags meaning changes for a lead, and has two modes: source screening of the whole inventory before any specification exists (inventory or source-screening evidence, owners or `unassigned`), and later specification update, where it also suggests grouping impact separately from the change class. Specification rows trace to a specification anchor.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build tracker-update-proposer`.
