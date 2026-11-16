# Requirements: End-To-End Acceptance Test

The shared rules are in the [root requirements](../requirements.md#requirements).

## Requirements

- Goal: a person can validate the whole lead flow in the client environment by following one run sheet on fictional data, and can tell at each step whether it passed.
- The run sheet, `acceptance-run-sheet.md`, opens with the prerequisites (Node 26, `npm ci` already run in the Master Workbook Updater and the Vendor Workbook Updater, the pack's skills installed, a throwaway sandbox that is a copy of `fixtures/`, the names of the lead, the vendor stand-in and the developer, and a fixed lead name and test date to type into the prompts) and the record sheet (step ID, who, pass, fail or fallback used, date, initials, notes, evidence file), then the steps S01 to S12 in order.
- Every step has the fields in [contract.md](contract.md#contract). Commands use `{pack}` and `{sandbox}` placeholders and are copied from the tools' contracts.
- On a failure the person stops, records the failure and the error line, edits no file to get past a tool's error, and uses a reference fixture only where the sheet says so, marking the step "fallback used".
- Fixtures are fictional only (vendor Harborline, use case Refund Retry), CSV and Markdown only, with expected outputs for every step. They hold no file named `tracker-data-contract.md` or `tracker-schema.csv`, no secret-looking value and no binary.
- The tests run the command text of the sheet on a copy of the fixtures in a real temporary directory and compare the outputs with `fixtures/expected/`; they read the schema from the Tracker Data Contract by relative path and resolve `exceljs` from the Master Workbook Updater. They import the tools' command modules by relative path and add no dependency.
- Copilot steps (S01, the live stop of S02, S04, S10) are stood in by reference proposals and a scripted edit of the same review cells; no pass is claimed for them.

## Must match the source

- Each tool's command line and exit rules, each skill's inputs and outputs, and the Tracker Data Contract's field ownership and the use case ID rules (the derived ID `uc-<vendor-slug>-<use-case-slug>` and ID-keyed references), as built when this component is built.

## Must not

- Change another component's files. The root's own records change as the root's Plan says.
- Run against the real repository root, a real export or a real vendor workbook.
- Put a copy of the contract or schema, a binary, or a real name, address or secret in a fixture.
- Claim a pass for a Copilot step, or hide a failure behind a fallback.

## Need not match

- The Sample Tracker Workbook, the packaging of the pack, and any export of the master by a tool (a known gap, step S11).

## Testing policy

As the root's: the tests prove every documented command and the fixtures; the skill steps are validated only by a person running the sheet, recorded on the record sheet for the version tested.

## Follow-on work (recorded, not built)

- Replace the manual export step S11 with one command when the open backlog item `master-csv-export` is built.
- A second round for a clarification-requested answer, and a second vendor for the vendor-safety comparison.

## Acceptance

See `task.acceptance` in [`craft.json`](craft.json).
