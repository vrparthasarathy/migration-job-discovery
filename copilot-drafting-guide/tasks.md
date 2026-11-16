# Task

## Requirement

Revise the drafting skill, its guidance and its fallback prompt to use-case wording and to the tracker flow: every question traces to a specification, and after drafting or updating the developer is told to run the companion skill `propose-tracker-updates`. The earlier blocked Copilot dry run is superseded and no fresh website-reference Copilot dry run is required (user decision, 2026-11-15); the user's earlier-version results are recorded as user-reported evidence, not as passes. Skills are tested manually by the user in the client environment on real use cases. It also accepts the core inputs `external_tools.md` and `logic.md`, manually tagged documents and supplied findings, questions, corrections and dependency observations as they are, keeps the four evidence kinds apart, checks that evidence supports claims, and updates repeatably with IDs and history kept and no duplicates. Its role is confirmed: it structures and verifies supplied inputs and produces or updates the specification, from which the tracker update skill extracts rows. No behavior is added, because the component is at the ten-behavior cap.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build copilot-drafting-guide`.
