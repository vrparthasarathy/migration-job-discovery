# Requirements: Lead Tracker Skills

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The group holds Markdown-only Copilot agent skills that a lead uses in chat on top of the lead tracker tools' output. Today it holds one, Review Decisions. It has no behavior of its own and no tests.
- The lead tracker tools (Tracker Reconciler, Review CSV Exporter, Tracker Summary, Vendor Workbook Updater) stay Node tools in Tracker Tools and run in the client environment; no skill in this group does a tool's job. The earlier plan for four Markdown counterparts is withdrawn.
- A skill reads and writes only the files the lead names, never the tracker or SharePoint, runs no executable and holds no copy of the Tracker Data Contract unless its own record says so.

## Must not

- Include a Craft term, command or file in any skill folder.
- Put these skills under Tracker Tools, whose members share Node checks.

## Acceptance

None: a group has no task.
