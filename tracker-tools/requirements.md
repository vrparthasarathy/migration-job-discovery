# Requirements: Tracker Tools

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- The group holds the lead-facing tools. Leads run them by hand on exported CSV files and review the output before anything reaches the SharePoint workbooks. No tool writes to SharePoint, and direct integration is deferred.
- Technology: Node 26 with native TypeScript, no dependencies, `node:test`, erasable syntax only and `.ts` import extensions. Tests use real temporary directories as the boundary and fake nothing that a sibling owns.
- The members read the column schema from the [Tracker Data Contract](../tracker-data-contract/README.md#purpose) component's `tracker-schema.csv`, so the shapes live in one place and no member repeats them in code.
- Output is deterministic: the same inputs and the same date produce identical files, and no tool changes a file it reads.
- Vendor-safe output never contains an internal column, a question group or link, a mapping, a lead decision, an unreleased question row or another vendor's row; the internal summary is the only place the vendor tracks appear together.
- No secret value is written to any output, and the tools stop with a clear error on malformed input and write nothing.

## Must match the source

- The contract's schema, reference scheme, status lists, due-date rule and proposal and export formats.

## Need not match

- SharePoint or Excel file formats, a real vendor's data, or any integration with the authoritative tracker.

## Acceptance

The group has no behavior and no task. See the members' `task.acceptance`.
