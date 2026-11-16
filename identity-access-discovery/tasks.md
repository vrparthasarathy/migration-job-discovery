# Task

## Requirement

Create the Copilot skill `discover-identity-access` that reads source and configuration and writes proposed rows for the Identity & Access tab into the developer's proposal directory, following the shared tracker data contract. It records only what the evidence shows, leaves runtime values unknown, never writes a secret, never invents request, approval or availability facts, and keeps one row per use case and endpoint with the request wording matched to the observed authentication, flags possible sharing for lead review without consolidating, and runs as an early lightweight sweep across all known use cases. No Craft dependency.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build identity-access-discovery`.
