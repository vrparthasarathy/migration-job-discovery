# Task

## Requirement

Bring the Discovery Batch Agent under a plan: review `discovery-batch.agent.md` against the confirmed behaviors B01 to B10, close its gaps (a blank-spec index row for a skipped use case with no row, a confirmed-list statement in the recommendation subagent's brief, a final report that lists every failed or blocked stage with its missing fact), add the internal review checklist, and keep requirements.md and contract.md in step. Build it after the Workflow Recommender, because the agent calls `recommend-workflows` over the index with the fixed ID `recommendations`. The smoke tests are not a gate for the build, only for any client claim.

## Plan

See ## Plan in README.md.

## Progress

## Validation

## Result

## Blockers And Escalations

## Recovery

## Next Action

Run `/craft:build discovery-batch-agent`.
