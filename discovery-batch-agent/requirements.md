# Requirements: Discovery Batch Agent

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- Goal: a lead names several use cases and the stages to run (screening, identity and access, specification, any combination, in separate runs if wanted) and gets discovery run for all of them in one go, each in its own subagent so no use case sees another's context, then one workflow recommendation, one review export and an interactive review in the main conversation.
- A GitHub Copilot custom agent for VS Code agent mode, one `discovery-batch.agent.md` with front matter `name: discovery-batch`, `description`, `model: Claude Sonnet 5.5 (copilot)` and `tools`. Plain Markdown, no code, no Craft term.
- It asks first only which use cases to run (names or slugs), which stages to run (default all three) and whether to run workflow recommendation (default no), finds each one's folder, vendor and specification path in `use-case-index.csv` at the repository root, and asks for a folder only for a name with no row. It then asks once only for what it can neither read nor derive.
- The proposal ID of a use case is derived as `uc-<vendor-slug>-<use-case-slug>` by the index rules of `run-discovery` and never asked for; the recommendations ID is the fixed `recommendations` and never asked for. A duplicate ID, or a proposals root that is `.`, missing or holds anything besides `tracker-updates`, stops the run before anything starts and writes nothing.
- One confirmation table before anything runs, with `run`, `skip: not chosen` or `skip: already done` per stage. A stage is already done when its own result exists (Identity & Access rows for identity, a Use Cases row with `source_status` for screening, a non-blank `spec` in the index row for specification) and is repeated only when the lead asks. Specification is never blocked for missing screening. A use case with no index row gets a row with a blank `spec` and is reported as `spec unknown`.
- One subagent per use case, one after another, each running only the chosen stages (source screening, identity and access, behavior documentation) in that fixed order through the installed skills, each writing only its own rows, never asking the lead anything, and replying with the fixed ten-line record (the tenth is `VALIDATION`) in [contract.md](contract.md#worker-reply-record). A failed, blocked or malformed use case never stops the batch.
- Workflow recommendation runs only when asked, once after the loop, in its own subagent, over every index row that has a `spec`, after one lead confirmation with the partial-list warning. The exporter runs once after every run into the same review folder, so earlier decisions are kept. The review is handed to `record-review-decisions` in the main conversation.
- With no subagent tool it says `NO SUBAGENT TOOL` and stops. Sequential runs only.
- It needs the skills installed beside it, a subagent tool and Node 26 for the exporter.

## Must match the source

- The index rules of `run-discovery` (columns, slug rule, derived ID, duplicate check, row key `folder`), read from that skill and not copied.
- Each stage skill's own contract and its own tab or rows (Use Cases and Questions for screening and specification, Identity & Access for identity), and the exporter's command line, exit codes and its preservation of review decisions.

## Must not

- Write to the use case tracker, release a question, record an acknowledgement or a decision, apply a change, or write a proposal file, a specification or a review cell. Its only own write is an index row.
- Run a use case's stages in the main conversation as a stand-in for a subagent.
- Ask for a proposal ID or the recommendations ID, or invent a vendor, a source location, a name or a date.
- Rerun a done stage unless the lead asks.
- Include a Craft term, command or file in the agent file.

## Need not match

- The tool names in the front matter, which differ by VS Code version and are unverified in the client environment.
- Parallel runs, which are a later change.

## Follow-on work

- Verify subagent support and skill loading in the client environment with the [Subagent Smoke Test](../subagent-smoke-test/README.md#design).
- Benchmark batch runs with the Copilot skills (backlog item `prompt-skill-benchmark`) and consider parallel runs (backlog item `batch-parallel-runs`).

## Planned change: shared use case file location

- Convention: the use case index `use-case-index.csv` at the repository root is the single lookup: its row's `folder` is the use case's own folder and its `spec` is the root-relative path of the specification; a new specification is written in the use case's own folder as `<folder>/<use case name>.md`, never in a proposal folder.
- The Worker brief names the use case's `Folder:` as the specification's home and says the specification is written at `<folder>/<use case name>.md`, the one exception to writing only under the proposals root.
- The `SPEC-PATH` reply line is that root-relative path, and the agent sets the index `spec` from it.
- Must not: change the stage choice, the done checks, the reply record's other lines or what the agent itself writes; move an existing specification.
- Applies from the build of this change; the Tracker Data Contract and its copies do not change.
