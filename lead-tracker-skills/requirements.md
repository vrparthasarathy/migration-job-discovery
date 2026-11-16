# Requirements: Lead Tracker Skills

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The group holds four Markdown-only skills, one per lead tool converted for the client environment, where executables are blocked: Proposal Reconciliation, Review Queue Export, Daily Call Briefing and Vendor Sheet Update. It has no behavior of its own and no tests.
- Each skill does its tool's job by following an explicit procedure on CSV files and keeps the tool's output names and shapes, so the Discovery Orchestrator and the other skills read them unchanged.
- No skill writes an executable, runs anything, or writes into the tracker or SharePoint; none writes `.xlsx`.
- The reference Node tools stay unchanged in Tracker Tools and are not shipped to the client.
- Shared across the four: byte-identical copies of the Tracker Data Contract's contract and schema, one `tracker-table-rules.md` mastered in Proposal Reconciliation and copied byte for byte, a count line first in every output, a tally of rows in against rows classified, and stop-with-a-named-error instead of guessing.

## Must not

- Include a Craft term, command or file in any skill folder.
- Put these skills under Tracker Tools, whose members share Node checks.

## Acceptance

None: a group has no task.
