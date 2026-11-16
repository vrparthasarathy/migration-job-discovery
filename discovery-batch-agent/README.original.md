# Discovery Batch Agent

## Purpose

A GitHub Copilot custom agent that runs discovery for a list of use cases in one go, each use case in its own isolated subagent, and hands the review to the lead, for leads and developers whose Copilot runs Claude Sonnet 5.5.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Discovery Batch Agent**

- [Design](#design)
- [Install](#install)
- [Behavior](#behavior)
- [Open Questions](#open-questions)
- [Links](#links)

## Design

One file, [discovery-batch.agent.md](discovery-batch.agent.md), set to `Claude Sonnet 5.5 (copilot)`. It is a batch version of [run-discovery](../discovery-orchestrator/README.md#design): the same stages, the same use case index and the same review, for many use cases.

It first asks only which use cases to run now (names or slugs). It finds each in `use-case-index.csv` for the folder, vendor and specification path, derives the proposal ID `uc-<vendor-slug>-<use-case-slug>`, and asks once only for what it can neither read nor derive (the repository root, the export, proposals, exporter and review folders, the lead's name and date). It never asks for a proposal ID, and the recommendations ID is the fixed `recommendations`. One confirmation table follows. It then loops over the use cases one at a time. Each goes to a fresh subagent that runs source screening, identity and access, and behavior documentation through the existing skills and returns a fixed nine-line record. The steps that need the whole set stay in the main agent: workflow recommendation runs once after the loop over every row of the index that has a specification (confirmed once, in its own subagent), the exporter runs once, and the review is handed to `record-review-decisions` in the main conversation, so the lead answers the questions interactively. The agent's only own write is an index row, following the index rules of `run-discovery`.

Decisions (record of the build; override in chat):
- Sequential, not parallel: each use case writes only its own proposal folder so parallel would be safe, but throttling and cost in the client are unknown. Parallel is a later change.
- It does not call `run-discovery` per use case, because that skill exports and walks the review for one folder and a subagent cannot ask the lead. It uses the stage skills directly and reads `run-discovery`'s index section for the index rules, so the rules are not copied.
- The index holds only folders started before, so a name with no row costs one question for its folder. Seeding the index from the master workbook's Use Cases tab is not done.
- Resume: a use case whose `tracker-updates/<proposal-id>/tracker-updates.csv` exists is skipped unless the lead asks.
- The worker brief is inside the agent file and passed as the subagent's instruction, so no second agent file has to be installed. A worker never asks the lead anything; a missing fact becomes a blocked stage that the final report lists.

## Install

1. Install the four skills (`propose-tracker-updates`, `discover-identity-access`, `document-job-behavior`, `recommend-workflows`) as the team already does.
2. Copy `discovery-batch.agent.md` into the workspace's `.github/agents/` folder.
3. In Copilot Chat choose the `discovery-batch` agent and name the use cases to run.
4. First run the [Subagent Smoke Test](../subagent-smoke-test/README.md#design) to confirm subagents and skill use work in the environment. If the agent's `tools` or `model` line is not accepted, fix the names to what the editor shows; the tool names differ by version.

## Behavior

- **B01** When a lead asks for a batch, then it first asks which use cases to run, finds each one's folder, vendor and specification in the use case index, and asks once only for facts it can neither read nor derive.
- **B02** When it prepares the run, then it derives every proposal ID, uses the fixed `recommendations` ID, asks for neither, checks for duplicates and shows one table before anything runs.
- **B03** When the lead confirms, then each use case runs in its own subagent, one after another, and the main agent keeps only the nine-line record and updates the index row.
- **B04** When a use case fails or is blocked, then the batch goes on and the final report lists the missing fact or the reason.
- **B05** When a use case already has a proposal file, then it is skipped unless the lead asks for a rerun.
- **B06** When the loop ends, then workflow recommendation runs once over every indexed specification after one lead confirmation with the partial-list warning.
- **B07** When recommendation ends, then the exporter runs once and the agent reports per use case, the recommendation counts and the exporter's counts.
- **B08** When the export has run, then it hands the review folder, the lead's name and the date to `record-review-decisions` in the main conversation, where the lead decides each row interactively.
- **B09** When it runs, then it never writes to the tracker, a proposal file, a specification or a review cell, writes only index rows, and records no decision.
- **B10** When no subagent tool exists, then it says so and stops without running a use case itself.

## Open Questions

- Not run in the client environment yet. Whether subagents there can load skills is what [test 2](../subagent-smoke-test/test-2-subagent-skill.md) answers.
- The `model` and `tools` names in the front matter follow VS Code's custom agent format and may need adjusting to the installed version.
- Proposal IDs and the `recommendations` ID are fixed by the built orchestrator; the agent follows them. Earlier folders run before the index existed may need a check of the confirmation table for a skip that should not happen.
- Not benchmarked; add batch runs to `prompt-skill-benchmark`.

## Links

- [Discovery Orchestrator](../discovery-orchestrator/README.md#design) (one folder at a time, with the review walk)
- [Subagent Smoke Test](../subagent-smoke-test/README.md#design)
