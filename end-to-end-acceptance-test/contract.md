# Contract

## Contract

Planned, not built.

### Layout

```
end-to-end-acceptance-test/
  acceptance-run-sheet.md
  fixtures/
    harborline/refund-retry/        refund_retry.py, external_tools.md, logic.md
    empty-export/                   manifest.csv only
    reference-proposals/            tracker-updates/uc-harborline-refund-retry/tracker-updates.csv  (version 1)
    reference-proposals-v2/         the same path (version 2: current_version 2, no duplicate Q1)
    vendor-answer/answer.csv        answer, answer_status, answered_on, answered_by for Q1
    expected/                       reference outputs per step; export-after-answer/ and summary.md
  test/
    sheet.test.ts  tools.test.ts  safety.test.ts  fixtures.test.ts
```

### Run sheet

- **Before S01:** the prerequisites and the record sheet, with the columns step ID, who, result (`pass`, `fail` or `fallback used`), date, initials, notes and evidence file.
- **Each step** is a heading `S<nn>` followed by these fields in this order: Who, Skill or tool, File or sheet, Exact prompt or command, Expected result, Pass or fail, If it fails. The command or prompt is in one fenced block directly under the step heading; commands use the placeholders `{pack}` (the restored pack) and `{sandbox}` (the copy of `fixtures/`).
- **Expected result** is concrete: the files written, counts, key cell values and the path of the reference output in `fixtures/expected/`.
- **Failure handling** section: stop at the first fail; record the step, the error line and the evidence; never edit a file to get past a tool's exit 1; where the sheet says so, run the reference fixture and mark the step `fallback used`; run later steps only when they do not depend on the failed one.
- **Steps** S01 to S12 as in the README's Planned Design. S11 states that no tool exports the master to CSV, names the backlog item `master-csv-export`, and gives `fixtures/expected/export-after-answer/` as the comparison and the fallback input for S12.

### Fixtures

- Fictional only. Fixed fictional values: the vendor Harborline, the use case Refund Retry, the lead and developer names, the test date and the answer text.
- Questions: Q1 accepted and answered, Q2 rejected, Q3 clarify then accepted at the revisit and left unanswered.
- No file named `tracker-data-contract.md` or `tracker-schema.csv`, no binary, no secret-looking value.
- `expected/` holds, per step, the review row keys, order, kinds and tiers; the review statuses after the decisions; the key columns of each master after S05, S06, S08 and S09; the vendor workbook's sheets and headings; the counts of each report; `export-after-answer/` (a full export folder with `manifest.csv`) and `summary.md`. The files are produced once during the build, reviewed by eye and then fixed.

### Tests

- Node `node:test`, real temporary directories, every test title tagged with its behavior ID (for example `[B03]`).
- `sheet.test.ts` checks the sheet's structure (B01, B02, B08). `tools.test.ts` extracts the fenced commands, substitutes the placeholders and runs them through the tools' command modules, comparing with `expected/` (B03, B04, B05, B06, B07 and the reruns of B10). `safety.test.ts` checks that the vendor workbook has no internal-only heading, computed from the schema's visibility, and the duplicate-ID fixture (B10). `fixtures.test.ts` walks `fixtures/` for a forbidden file name or a secret-looking value (B09).
- Hand edits of the sheet (the release of S06, the answer of S07, the acceptance of S09) are done in test code with `exceljs`; workbooks are read back with the Master Workbook Updater's own reader; no converter is added.

### Messages

A test failure names the step ID, the file and the first differing item.
