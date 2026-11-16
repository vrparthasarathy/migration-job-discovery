# Requirements: Review CSV Exporter

The shared rules are in the [root requirements](../../requirements.md#requirements) and the [Tracker Tools requirements](../requirements.md#requirements).

## Requirements

- Goal: lead-review CSVs, one wide row per record, built from the long-format proposal files and a tracker export, so a lead reviews adds, updates and suggestions without transposing one-row-per-field proposals. The exporter is the tool the Discovery Orchestrator runs, and a lead can also run it by hand.
- The tool never writes to the tracker, never releases a question and never changes a file it reads. The tracker stays an Excel workbook on SharePoint, and a lead applies accepted rows by hand.
- Reuse, do not copy: matching, conflict and held-change logic come from the Tracker Reconciler (`inputs`, `reconcile`, `secrets`, imported by relative path), and CSV reading, writing and schema validation come from Tracker Tables. The reconciler and the library are not changed by this component.
- No column list is repeated in code. The shown fields and their headings come from a headings data file (`data/review-headings.csv`), in the shape of the sample workbook's `headings.csv`, so a format change after the team reviews the sample is a data change, not a code change. The first version of the file is provisional (headings equal the keys).
- Review state is one set of review columns per row (record level): `review_status` (blank, `accepted`, `rejected` or `clarify`), `reviewer`, `review_note`, `reviewed_on`, and `applied_on` (set by the lead after hand-applying). All are blank on the first write and preserved on refresh. Per-field state in the row is machine state only (`add`, `update`, `suggest`, `conflict`, `held`).
- Rows are ordered by what they need from the lead: conflicts and held changes first, then suggestions for the lead's own fields, then plain evidence-backed adds and plain specification updates grouped by use case ID (so by vendor, then name).

## Must match the source

- The proposal and export formats, owner classes and reference scheme of `tracker-data-contract/tracker-data-contract.md` and `tracker-schema.csv`, read at run time.
- The reconciler's classification of additions, field updates, human-field suggestions, conflicts and held changes, because the exporter reuses its result.
- Forbidden, computed and central-reference fields never appear as proposals; the reconciler's rejected proposal rows are counted and explained on the console only, never written to the CSVs.

## Need not match

- Excel internals, the sample workbook's `.xlsx` writer, a vendor-safe view (these files are internal and mix every column), the optional `same as` shortcut and the infrastructure scope.

## Technology

- Inherited from Tracker Tools: Node 26 with native TypeScript (erasable syntax, `.ts` import extensions), no dependencies, ES modules and `node:test` with real temporary directories. The content digest uses the built-in `node:crypto`. `src/main.ts` is the adapter excluded from coverage by the group's `adapterGlob`. The component declares no `configuration` and inherits the group's checks.

## Depends on

- The Sample Tracker Workbook's reviewed format only through the headings file. The exporter can be built before the team's review with the provisional headings.

## Follow-on work (recorded, not built)

- A `record-decision` subcommand, if hand-editing review cells proves error-prone.
- A combined `review-all.csv`, if leads want one file.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
