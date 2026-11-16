# Contract

## Contract

### Layout

```
end-to-end-acceptance-test/
  acceptance-run-sheet.md
  fixtures/
    harborline/refund-retry/        refund_retry.py, external_tools.md, logic.md
    empty-export/                   manifest.csv only
    reference-proposals/            tracker-updates/uc-harborline-refund-retry/tracker-updates.csv  (version 1, the S01 stand-in and fallback)
    reference-proposals-v2/         the same path (version 2: current_version 2, no question added)
    vendor-answer/answer.csv        question_ref, spec_question, answer, answer_status, answered_on, answered_by for Q1
    expected/                       reference outputs per step (see Fixtures)
  test/
    support.ts  sheet.test.ts  tools.test.ts  safety.test.ts  fixtures.test.ts
```

### Run sheet

- **Before S01:** the prerequisites and the record sheet, with the columns step ID, who, result (`pass`, `fail` or `fallback used`), date, initials, notes and evidence file.
- **Each step** is a heading `### S<nn>[letter]: title` followed by these fields, each a list item `- **<Field>:**`, in this order: Who, Skill or tool, File or sheet, Exact prompt or command, Expected result, Pass or fail, If it fails. The prompt or command is the first fenced block of the "Exact prompt or command" field; commands use the placeholders `{pack}` (the restored pack) and `{sandbox}` (the copy of `fixtures/`) and nothing else in braces. The Pass or fail field is the three boxes `[ ] pass  [ ] fail  [ ] fallback used`.
- **Expected result** is concrete: the files written, counts, key cell values and the path of at least one reference output in `fixtures/` (under `expected/`, `reference-proposals`, `reference-proposals-v2` or `vendor-answer/`).
- **Failure handling** section: stop at the first fail; record the step, the error line and the evidence; never edit a file to get past a tool's exit 1; where the step says so, run the reference fixture and mark the step `fallback used`; run later steps only when they do not depend on the failed one. Every step's "If it fails" starts with the stop; only S01, S10 and S11 give a fallback command (a fenced `cp -R` of a reference fixture), and every other step says there is no fallback.
- **Steps** S01, S02, S03, S04, S05, S06, S06b, S07, S08, S09, S10, S10b, S11, S11b, S12, S13 as in the README's Design. S11 states that no tool exports the master to CSV, names the backlog item `master-csv-export`, and gives `fixtures/expected/export-after-answer/` as the comparison and the fallback input for S11b, S12 and S13.

### Fixtures

- Fictional only. Fixed values: the vendor Harborline, the use case Refund Retry (ID `uc-harborline-refund-retry`), the lead Lena Park, the developer Dev Okafor, the vendor stand-in Harborline Contact, the dates in the README's decisions and the answer text.
- Questions: Q1 accepted and answered, Q2 rejected, Q3 clarify then accepted at the revisit and left unanswered.
- Text only (CSV, Markdown and one Python file), no file named `tracker-data-contract.md` or `tracker-schema.csv`, no binary, no link or address, no secret-looking value.
- `expected/` holds: `use-case-index.csv`; `s03-review-rows.csv` (file, order, use case ID, record key, suggested reference, kind); `s04-decisions-walk.csv`, `s04-decisions-accept-all.csv` and `s04-decisions-final.csv` (the review cells after each round); `s05-master.csv`, `s06-master.csv`, `s06b-master.csv`, `s08-master.csv` and `s09-master.csv` (every non-empty cell of the Use Cases and Questions rows, `tab,ref,field,value`); `s06b-vendor-headings.csv`, `s06b-vendor.csv` and `s08-vendor.csv`; `sNN-counts.txt` (the counts line of the command of step NN, with the sandbox path as `{sandbox}`) and `s10b-ok.txt`; `export-after-answer/` (a full export folder with `manifest.csv`) and `summary.md`. The files were produced once during the build by running the scripted sequence, reviewed by eye and then fixed; no test regenerates them.

### Tests

- Node `node:test`, real temporary directories, every test title tagged with its behavior ID (for example `[B03]`).
- `support.ts` parses the sheet, makes the sandbox, runs a documented command through the tool's own command module (by the tool folder in the command's `main.ts` path), does the hand and Copilot steps in code (the scripted decisions, the workbook edits with `exceljs` resolved from the Master Workbook Updater, the export of the master) and runs the whole sequence once. `sheet.test.ts` checks the sheet's structure (B01, B02, B08). `tools.test.ts` runs the commands and compares with `expected/` (B03 to B07) and reruns them (B04, B10). `safety.test.ts` checks that no vendor workbook has an internal heading or field, computed from the schema's visibility, and the duplicate-folder case (B10). `fixtures.test.ts` walks `fixtures/` for a forbidden file name, a binary or a secret-looking value, and checks the reference outputs (B09).
- Workbooks are read back with the Master Workbook Updater's and the Vendor Workbook Updater's own readers; no converter is added.

### Messages

A test failure names the step ID, the file and the first differing line.
