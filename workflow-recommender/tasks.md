# Task

## Requirement

Create the Copilot skill `recommend-workflows` that compares use case specifications by behavior (not by shared systems alone), generates `use-case-to-workflow-recommendations.md`, reads but never edits the lead-owned `use-case-to-workflow-decisions.md`, proposes mapping rows for the Mappings tab, and exposes unread or missing specifications and the unknowns that block a mapping. It ships the decisions file format and a validation procedure and never claims the method is proven. Tagged earlier workflow analyses supplement candidates only; re-review follows a grouping-impact assessment (unknown stays visible, lead override respected) and not every behavior change or version bump; draft specifications can produce recommendations before acknowledgement. Recommendations are internal. No Craft dependency.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build workflow-recommender`.
