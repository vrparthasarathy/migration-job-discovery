# Discovery Batch Agent

## Purpose

A GitHub Copilot custom agent that runs discovery for a list of use case folders in one go, each folder in its own isolated subagent, for leads and developers whose Copilot runs Claude Sonnet 5.5.

## Navigation

[Job Behavior Specifications](../README.md#navigation) / **Discovery Batch Agent**

- [Design](#design)
- [Install](#install)
- [Behavior](#behavior)
- [Open Questions](#open-questions)
- [Links](#links)

## Design

One file, [discovery-batch.agent.md](discovery-batch.agent.md), set to `Claude Sonnet 5.5 (copilot)`. It asks once for the facts only the lead has, derives each folder's proposal ID as `uc-<vendor-slug>-<use-case-slug>` and shows one confirmation table. It then loops over the folders one at a time. Each folder goes to a fresh subagent that runs source screening, identity and access, and behavior documentation through the existing skills and returns a fixed nine-line record. The steps that need the whole set stay in the main agent: workflow recommendation runs once after the loop over every specification (confirmed once, in its own subagent), the exporter runs once, and the review walk is left to `run-discovery`, so the agent writes no review cell.

Decisions (record of the build; override in chat):
- Sequential, not parallel: each folder writes only its own proposal folder so parallel would be safe, but throttling and cost in the client are unknown. Parallel is a later change.
- No `use-case-index.csv`: the planned index in [Discovery Orchestrator](../discovery-orchestrator/README.md#planned-design) is not built, so the agent derives the ID itself and shows it for the lead's confirmation, and resumes by skipping a folder whose `tracker-updates/<proposal-id>/tracker-updates.csv` exists.
- The worker brief is inside the agent file and passed as the subagent's instruction, so no second agent file has to be installed.
- A worker never asks the lead anything. A missing fact becomes a blocked stage.

## Install

1. Install the four skills (`propose-tracker-updates`, `discover-identity-access`, `document-job-behavior`, `recommend-workflows`) as the team already does.
2. Copy `discovery-batch.agent.md` into the workspace's `.github/agents/` folder.
3. In Copilot Chat choose the `discovery-batch` agent and name the folders or a parent folder.
4. First run the [Subagent Smoke Test](../subagent-smoke-test/README.md#design) to confirm subagents and skill use work in the environment. If the agent's `tools` or `model` line is not accepted, fix the names to what the editor shows; the tool names differ by version.

## Behavior

- **B01** When the lead names folders, then it asks once for the missing shared facts and shows one table of folders with derived proposal IDs before anything runs.
- **B02** When the lead confirms, then each folder runs in its own subagent, one after another, and the main agent keeps only the nine-line record.
- **B03** When a folder fails or is blocked, then the batch goes on and the final table says why.
- **B04** When a folder already has a proposal file, then it is skipped unless the lead asks for a rerun.
- **B05** When the loop ends, then workflow recommendation runs once over every specification after one lead confirmation with the partial-list warning.
- **B06** When recommendation ends, then the exporter runs once and the agent reports per folder, the recommendation counts and the exporter's counts.
- **B07** When it runs, then it never writes to the tracker, a proposal file, a specification or a review cell, and records no decision.
- **B08** When no subagent tool exists, then it says so and stops without running a folder itself.

## Open Questions

- Not run in the client environment yet. Whether subagents there can load skills is what [test 2](../subagent-smoke-test/test-2-subagent-skill.md) answers.
- The `model` and `tools` names in the front matter follow VS Code's custom agent format and may need adjusting to the installed version.
- Derived proposal IDs differ from the IDs already used for earlier folders if those were chosen by hand; check the confirmation table for a skip that should not happen.
- Not benchmarked; add batch runs to `prompt-skill-benchmark`.

## Links

- [Discovery Orchestrator](../discovery-orchestrator/README.md#design) (one folder at a time, with the review walk)
- [Subagent Smoke Test](../subagent-smoke-test/README.md#design)
