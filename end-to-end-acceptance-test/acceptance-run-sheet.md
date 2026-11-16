# Acceptance Run Sheet

A person follows this sheet in the client environment, on fictional data, to check the whole lead flow: from discovery of one use case (Refund Retry, vendor Harborline) through the review decisions, the master and vendor workbooks, a vendor answer and its incorporation into the specification, to the daily summary. Do the steps in order. Tick one box per step. Never claim a pass you did not see.

## Prerequisites

1. Node 26 is installed (`node --version` prints v26 or later).
2. `npm ci` has been run in `{pack}/tracker-tools/master-workbook-updater` and in `{pack}/tracker-tools/vendor-workbook-updater` (this installs `exceljs` from the committed lock files).
3. The pack's skills are installed in Copilot: `run-discovery`, `propose-tracker-updates`, `discover-identity-access`, `document-job-behavior`, `recommend-workflows` and `record-review-decisions`. Excel (or a spreadsheet program that saves `.xlsx`) is available.
4. `{pack}` is the restored pack (the folder that holds `tracker-tools`). `{sandbox}` is a throwaway copy of the fixtures, never the real repository root, a real export or a real vendor workbook. Make it once:

   ```
   cp -R {pack}/end-to-end-acceptance-test/fixtures {sandbox} && mkdir {sandbox}/work
   ```

   Replace `{pack}` and `{sandbox}` with real paths in every prompt and command below. `use-case-index.csv` is written at `{sandbox}`, the repository root of this test.
5. The people for this run: the lead is **Lena Park**, the vendor stand-in is **Harborline Contact**, the developer is **Dev Okafor**. Type exactly these names and the dates shown in the prompts and commands.
6. The reference outputs are in `{sandbox}/expected/`. They are the comparison for every step and are never edited.

## Record sheet

Fill one row per step: the result (`pass`, `fail` or `fallback used`), the date, your initials, a note, and the evidence file (a copy of the output or a screenshot). Leave a step blank if it was not run.

| Step ID | Who | Result (pass, fail or fallback used) | Date | Initials | Notes | Evidence file |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Developer | | | | | |
| S02 | Developer | | | | | |
| S03 | Developer | | | | | |
| S04 | Lead | | | | | |
| S05 | Lead | | | | | |
| S06 | Lead | | | | | |
| S06b | Lead | | | | | |
| S07 | Vendor stand-in | | | | | |
| S08 | Lead | | | | | |
| S09 | Lead | | | | | |
| S10 | Developer | | | | | |
| S10b | Developer | | | | | |
| S11 | Lead | | | | | |
| S11b | Developer | | | | | |
| S12 | Lead | | | | | |
| S13 | Lead | | | | | |

## Failure handling

On any failure, in every step:

1. **Stop** at the first failed step. Do not go on to a step that depends on it. Steps that do not depend on it may still be run, and each step says what it needs.
2. **Record** the step ID, the exact error line (a tool prints `file: line N: message` on standard error and exits with 1 or 2), the date and your initials on the record sheet, and keep the output as the evidence file.
3. **Edit no file** to get past a tool's error: no review cell, proposal, export row or workbook cell outside the cells the step names.
4. Use a reference fixture only where the step's **If it fails** says so. Then mark the step **fallback used** (not pass) and say so in the notes.
5. A Copilot step whose output differs from the reference is not a failure by itself: the skills do not write the same words every time. Compare the key columns the step names, not the whole file.

## Steps

### S01: Discovery of the Refund Retry folder

- **Who:** Developer (Dev Okafor), in Copilot.
- **Skill or tool:** `run-discovery`.
- **File or sheet:** `{sandbox}/harborline/refund-retry` (reads); writes `{sandbox}/use-case-index.csv` and `{sandbox}/proposals/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv`.
- **Exact prompt or command:**

  ```
  Run discovery for the use case folder {sandbox}/harborline/refund-retry. The repository root is {sandbox}. The vendor is Harborline and the source is the folder itself. The tracker export is {sandbox}/empty-export, the proposals root is {sandbox}/proposals, the exporter is {pack}/tracker-tools/review-csv-exporter, and the review files go to {sandbox}/work/review. The lead is Lena Park and today is 2026-11-18. Skip workflow recommendation for this test.
  ```

- **Expected result:** `use-case-index.csv` has the header `use_case_name,slug,vendor,folder,spec` and one row `Refund Retry,refund-retry,Harborline,harborline/refund-retry,` (the `spec` cell is filled once behavior documentation has run; compare the first four columns with `expected/use-case-index.csv`). The proposal file exists, has the header `update_id,proposal_id,tab,operation,record_key,field,value,base_value,source,reason,created_on,author`, and holds an `add` for the use case `uc-harborline-refund-retry` and for `uc-harborline-refund-retry/Q1`, `/Q2` and `/Q3`. Compare the record keys with `reference-proposals/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv`; the question wording may differ. The workflow recommendation stage (stage 4) is Copilot-only and is skipped here. The skill reports the exporter counts if it ran the export.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the failure. Do not edit a proposal row by hand. Only if Copilot could not produce the proposal, copy the reference proposal and mark this step **fallback used**:

  ```
  cp -R {sandbox}/reference-proposals {sandbox}/proposals
  ```

  The later steps depend on the proposal and need it.

### S02: A duplicate folder stops discovery

- **Who:** Developer (Dev Okafor), in Copilot.
- **Skill or tool:** `run-discovery`.
- **File or sheet:** `{sandbox}/harborline-copy/refund-retry`, and `{sandbox}/use-case-index.csv` from S01. Needs S01.
- **Exact prompt or command:** First make the second folder with `cp -R {sandbox}/harborline {sandbox}/harborline-copy`, then give this prompt:

  ```
  Run discovery for the use case folder {sandbox}/harborline-copy/refund-retry. The repository root is {sandbox}, the vendor is Harborline, and the tracker export, proposals root, exporter and output folder are as before. The lead is Lena Park and today is 2026-11-18.
  ```

- **Expected result:** The skill stops before any stage. It names both folders, `harborline/refund-retry` and `harborline-copy/refund-retry`, says both give the use case ID `uc-harborline-refund-retry`, and says the lead must rename one. It writes nothing: `use-case-index.csv` (still as in `expected/use-case-index.csv`), `proposals/` and `work/review/` are unchanged. Afterwards remove the copy with `rm -r {sandbox}/harborline-copy` so later steps see one folder.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the failure; if the skill went on to write a row or a proposal, that is a fail. Remove `{sandbox}/harborline-copy`. There is no fallback; later steps do not depend on this step.

### S03: Export the review files

- **Who:** Developer (Dev Okafor).
- **Skill or tool:** Review CSV Exporter.
- **File or sheet:** Reads `{sandbox}/empty-export` and `{sandbox}/proposals`; writes the four `review-*.csv` files in `{sandbox}/work/review`.
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/review-csv-exporter/src/main.ts export-review \
    --export {sandbox}/empty-export \
    --proposals {sandbox}/proposals \
    --out {sandbox}/work/review
  ```

- **Expected result:** Exit 0 and the line `exported 4 review row(s) from 1 proposal file(s): Use Cases 1, Questions 3, Identity & Access 0, Mappings 0; tier 1 0, tier 2 0, tier 3 4`. `review-use-cases.csv` has one row, `review-questions.csv` three, and the other two files only a header. Order, kind and tier are as in `expected/s03-review-rows.csv`: order 1 is `uc-harborline-refund-retry` (add), orders 2 to 4 are `.../Q1`, `.../Q2`, `.../Q3` (add), with the suggested references `UC-001`, `QN-0001`, `QN-0002` and `QN-0003`. Running the command again changes nothing.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line. Do not edit a proposal or the export. No fallback: a failure here is a tool failure to report. Later steps need the review files.

### S04: The lead's review decisions

- **Who:** Lead (Lena Park), in Copilot.
- **Skill or tool:** `record-review-decisions`.
- **File or sheet:** `{sandbox}/work/review/review-use-cases.csv` and `review-questions.csv`. Needs S03.
- **Exact prompt or command:** Give these four messages in one chat, one after the other, answering the skill's questions with the words shown:

  ```
  1. Review the pending rows in {sandbox}/work/review. I am Lena Park and today is 2026-11-18.
  2. For Q2 (uc-harborline-refund-retry/Q2): reject, note "Owner is known to the lead.". For Q3: clarify, note "Ask what counts as the last retry.".
  3. Accept all plain adds of uc-harborline-refund-retry.
  4. Revisit uc-harborline-refund-retry: change Q3 to accepted, note "Scope confirmed.".
  ```

- **Expected result:** After message 2: Q2 `rejected` and Q3 `clarify`, reviewer Lena Park, date 2026-11-18 (`expected/s04-decisions-walk.csv`). After message 3: the use case row and Q1 `accepted` with a blank note, Q2 and Q3 unchanged (`expected/s04-decisions-accept-all.csv`). After message 4: Q3 `accepted` and its note `Earlier: clarify by Lena Park on 2026-11-18. Scope confirmed.` (`expected/s04-decisions-final.csv`). Only the review cells (`review_status`, `reviewer`, `review_note`, `reviewed_on`) change, and the row counts stay 1 and 3.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record what the skill wrote or refused. Do not edit a review cell by hand. No fallback: the later steps need the decisions as the lead gave them.

### S05: Build the master workbook from the empty export

- **Who:** Lead (Lena Park).
- **Skill or tool:** Master Workbook Updater.
- **File or sheet:** Reads `{sandbox}/empty-export` and `{sandbox}/work/review`; writes `{sandbox}/work/master-1.xlsx`, `{sandbox}/work/master-1-report.md` and the `applied_on` cells of the review files. Needs S04.
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/master-workbook-updater/src/main.ts update-master-workbook \
    --from-export {sandbox}/empty-export \
    --reviews {sandbox}/work/review \
    --out {sandbox}/work/master-1.xlsx \
    --report {sandbox}/work/master-1-report.md \
    --run-date 2026-11-18
  ```

- **Expected result:** Exit 0 and `applied 3 row(s), skipped 1, 0 conflict(s); synced 0 vendor value(s), 0 vendor workbook(s) held` (`expected/s05-counts.txt`). Use Cases holds one row `UC-001` Refund Retry, Harborline, version 1. Questions holds `QN-0001` and `QN-0003`, both `captured`, captured on 2026-11-18, not released; `QN-0002` (rejected) is not in the master. The report lists the rejected Q2 as skipped. The key cells are in `expected/s05-master.csv`. The review rows of the three applied rows now have `applied_on` 2026-11-18. Run again from `master-1.xlsx` (`--master` instead of `--from-export`) the command changes nothing.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line. Do not edit a review row or the export to get past it. No fallback; the workbook steps need this master.

### S06: Release Q1 and Q3 by hand

- **Who:** Lead (Lena Park), in Excel.
- **Skill or tool:** Excel (by hand). The Master Workbook Updater never releases a question.
- **File or sheet:** Open `{sandbox}/work/master-1.xlsx`, sheet Questions. Save As `{sandbox}/work/master-2.xlsx`. Needs S05.
- **Exact prompt or command:**

  ```
  In the Questions sheet, for rows QN-0001 and QN-0003 only:
    Batch        = BT-001
    Released on  = 2026-11-19   (a date cell)
    Status       = released
  Save As master-2.xlsx. Change nothing else.
  ```

- **Expected result:** Both rows show Batch `BT-001`, Released on 2026-11-19 and Status `released`; every other cell is as in S05 (`expected/s06-master.csv`). `Due on` stays blank; the next step fills it.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record what Excel showed. If the later step rejects the file, record its error line; do not change other cells to get past it. No fallback.

### S06b: Build the first Harborline workbook

- **Who:** Lead (Lena Park).
- **Skill or tool:** Master Workbook Updater, `--new-vendor`.
- **File or sheet:** Reads `{sandbox}/work/master-2.xlsx`; writes `{sandbox}/work/master-3.xlsx`, `{sandbox}/work/master-3-report.md` and `{sandbox}/work/vendor-1/Harborline.xlsx`. Needs S06.
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/master-workbook-updater/src/main.ts update-master-workbook \
    --master {sandbox}/work/master-2.xlsx \
    --new-vendor Harborline \
    --vendor-out {sandbox}/work/vendor-1 \
    --out {sandbox}/work/master-3.xlsx \
    --report {sandbox}/work/master-3-report.md \
    --run-date 2026-11-19
  ```

- **Expected result:** Exit 0 and `applied 0 row(s), skipped 0, 0 conflict(s); synced 0 vendor value(s), 0 vendor workbook(s) held`. In `master-3.xlsx` both questions now have `Due on` 2026-11-23 (release plus two working days) (`expected/s06b-master.csv`). `Harborline.xlsx` has the sheets Read Me, Use Cases, Questions, Identity & Access and Lists; one use case row, two question rows, and none of the internal columns (no Status, Resolver, Closed reason, Superseded by, Our owner, Captured on, Current spec text, Text review, Blocks mapping, Source links, Proposal refs, Internal notes or Last updated): the headings are in `expected/s06b-vendor-headings.csv` and the rows in `expected/s06b-vendor.csv`. Running it again changes nothing.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line. Do not edit the master. No fallback.

### S07: The vendor answers Q1

- **Who:** Vendor stand-in (Harborline Contact), in Excel.
- **Skill or tool:** Excel (by hand).
- **File or sheet:** Open `{sandbox}/work/vendor-1/Harborline.xlsx`, sheet Questions, row QN-0001. Save As `{sandbox}/work/vendor-answered/Harborline.xlsx` (make the folder first). Needs S06b.
- **Exact prompt or command:**

  ```
  In the Questions sheet, in the row of QN-0001 only, type:
    Answer        = The job retries three times and waits 30 seconds between tries.
    Answer status = answered
    Answered on   = 2026-11-25   (a date cell)
    Answered by   = Harborline Contact
  Save As Harborline.xlsx in {sandbox}/work/vendor-answered. Change nothing else.
  ```

- **Expected result:** The four cells are filled in the Q1 row and in the vendor-edited (orange) columns only; the values are in `vendor-answer/answer.csv`. QN-0003 has no answer.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record what Excel showed (for example that a cell is locked). Do not unprotect the sheet. No fallback.

### S08: Sync the vendor's answer into the master

- **Who:** Lead (Lena Park).
- **Skill or tool:** Master Workbook Updater, `--vendor`.
- **File or sheet:** Reads `{sandbox}/work/master-3.xlsx` and `{sandbox}/work/vendor-answered/Harborline.xlsx`; writes `{sandbox}/work/master-4.xlsx`, `{sandbox}/work/master-4-report.md` and `{sandbox}/work/vendor-2/Harborline.xlsx`. Needs S07.
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/master-workbook-updater/src/main.ts update-master-workbook \
    --master {sandbox}/work/master-3.xlsx \
    --vendor Harborline={sandbox}/work/vendor-answered/Harborline.xlsx \
    --vendor-out {sandbox}/work/vendor-2 \
    --out {sandbox}/work/master-4.xlsx \
    --report {sandbox}/work/master-4-report.md \
    --run-date 2026-11-25
  ```

- **Expected result:** Exit 0 and `applied 0 row(s), skipped 0, 0 conflict(s); synced 4 vendor value(s), 0 vendor workbook(s) held`. In `master-4.xlsx` only QN-0001 gained Answer, Answer status `answered`, Answered on 2026-11-25 and Answered by `Harborline Contact`; its Status is still `released` (the lead's), its Review state reads `Awaiting lead review`, and QN-0003 is `Overdue` by 2 days (`expected/s08-master.csv`). The report lists 4 values synced and no sync conflict. `vendor-2/Harborline.xlsx` holds the answer (`expected/s08-vendor.csv`). Running it again changes nothing.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line or the sync conflict in the report. Do not copy the answer by hand. No fallback.

### S09: The lead accepts the answer

- **Who:** Lead (Lena Park), in Excel.
- **Skill or tool:** Excel (by hand). Only the lead sets `status`.
- **File or sheet:** Open `{sandbox}/work/master-4.xlsx`, sheet Questions. Save As `{sandbox}/work/master-5.xlsx`. Needs S08.
- **Exact prompt or command:**

  ```
  In the Questions sheet, in the row of QN-0001 only, set Status = accepted.
  Save As master-5.xlsx. Change nothing else.
  ```

- **Expected result:** QN-0001 has Status `accepted`; every other cell is as after S08 (`expected/s09-master.csv`).
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record what Excel showed. No fallback.

### S10: The developer incorporates the answer

- **Who:** Developer (Dev Okafor), in Copilot.
- **Skill or tool:** `document-job-behavior`, then `propose-tracker-updates` in specification-update mode.
- **File or sheet:** Reads and updates the use case specification (written next to `{sandbox}/harborline/refund-retry` in S01); writes `{sandbox}/work/proposals-v2/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv`. Needs S01 and S09.
- **Exact prompt or command:**

  ```
  Update the Refund Retry specification of the use case folder {sandbox}/harborline/refund-retry to version 2 with this answer from the vendor to Q1: "The job retries three times and waits 30 seconds between tries." Today is 2026-11-30. Then run propose-tracker-updates in specification-update mode for it with the proposal ID uc-harborline-refund-retry, the previous version as the base, and write the proposal under {sandbox}/work/proposals-v2.
  ```

- **Expected result:** The specification is at version 2, with a change log entry and the answer in its behavior text. The proposal has `set` rows for `current_version` (2, base 1) and `spec_revision` of the use case, and for Q1 a `suggest` of `status` `incorporated` and of `incorporated_version` 2. It holds no `add` row for any question: Q1 is not added a second time. Compare the keys and operations with `reference-proposals-v2/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv`; the words of the reasons may differ.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the failure. Do not edit a proposal row by hand. Only if Copilot could not produce the specification or the proposal, copy the reference proposal and mark this step **fallback used**:

  ```
  cp -R {sandbox}/reference-proposals-v2 {sandbox}/work/proposals-v2
  ```

### S10b: Validate the version 2 proposal

- **Who:** Developer (Dev Okafor).
- **Skill or tool:** Tracker Reconciler, `validate`.
- **File or sheet:** `{sandbox}/work/proposals-v2/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv`. Needs S10.
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/tracker-reconciler/src/main.ts validate \
    {sandbox}/work/proposals-v2/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv
  ```

- **Expected result:** Exit 0 and the line `{sandbox}/work/proposals-v2/tracker-updates/uc-harborline-refund-retry/tracker-updates.csv: ok` (`expected/s10b-ok.txt`). Nothing is written.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record each `file: line N: message`. Do not edit the proposal to make it pass; send it back to the developer step (S10). No fallback of its own: if S10 used its fallback, this step checks the reference proposal and is marked **fallback used** too.

### S11: Export the master to CSV (known gap)

- **Who:** Lead (Lena Park), in Excel.
- **Skill or tool:** Excel (by hand). **No tool exports the master back to CSV.** This is a known gap, recorded as the backlog item `master-csv-export`; when it is built this step becomes one command.
- **File or sheet:** Open `{sandbox}/work/master-5.xlsx`; writes the folder `{sandbox}/work/export-after-answer`. Needs S09.
- **Exact prompt or command:**

  ```
  For each of the sheets Use Cases, Questions, Identity & Access, Workflow Mappings,
  Question Groups, Question Links and Batches of master-5.xlsx:
    delete the band row 1, rename the row-2 headings to the schema column names
    (the Tracker Data Contract's tracker-schema.csv), and Save As CSV (UTF-8) as
    use-cases.csv, questions.csv, identity-access.csv, mappings.csv,
    question-groups.csv, question-links.csv and batches.csv
    in {sandbox}/work/export-after-answer.
  Add manifest.csv there with the header scope,workbook,exported_at,exported_by and
  one row: internal,master-5.xlsx,2026-12-01,Lena Park
  ```

- **Expected result:** The folder matches `expected/export-after-answer/` in the key columns of `use-cases.csv` and `questions.csv`: `question_ref`, `status`, `answer`, `answer_status`, `answered_on`, `answered_by`, `released_on`, `due_on`. QN-0001 is `accepted` and answered, QN-0003 is `released` and unanswered.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record what failed. Do not edit an export row to make it fit. If the manual export cannot be done, copy the reference export and mark this step **fallback used**, because S11b and S12 need an export folder:

  ```
  cp -R {sandbox}/expected/export-after-answer {sandbox}/work/export-after-answer
  ```

### S11b: The version 2 proposal adds no duplicate question

- **Who:** Developer (Dev Okafor).
- **Skill or tool:** Tracker Reconciler, `reconcile`.
- **File or sheet:** Reads `{sandbox}/work/export-after-answer` and `{sandbox}/work/proposals-v2`; writes `{sandbox}/work/reconcile-v2`. Needs S10b and S11.
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/tracker-reconciler/src/main.ts reconcile \
    --export {sandbox}/work/export-after-answer \
    --proposals {sandbox}/work/proposals-v2 \
    --out {sandbox}/work/reconcile-v2
  ```

- **Expected result:** Exit 0 and the counts line in `expected/s11b-counts.txt`. There are 0 additions, so no `additions/questions.csv`: no question row is added twice. The 5 field updates (version, source revision, change class and grouping impact of the use case, and the specification reference of Q1) and 2 suggestions (the status and incorporated version of Q1) are listed for the lead to apply by hand.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line or the extra addition. No fallback.

### S12: The daily summary

- **Who:** Lead (Lena Park).
- **Skill or tool:** Tracker Summary.
- **File or sheet:** Reads `{sandbox}/work/export-after-answer`; writes `{sandbox}/work/summary.md`. Needs S11 (or its fallback).
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/tracker-summary/src/main.ts \
    --export {sandbox}/work/export-after-answer \
    --date 2026-12-01 \
    --out {sandbox}/work/summary.md
  ```

- **Expected result:** Exit 0 and `summarized 1 use case(s) as of 2026-12-01`. `summary.md` equals `expected/summary.md`: one overdue question, `QN-0003` of Refund Retry (due 2026-11-23, 8 days overdue), and `QN-0003` also under Unassigned; QN-0001 is not listed as overdue. Running it again changes nothing.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line. Do not edit the export. No fallback of its own: if S11 used its fallback, mark this step **fallback used** too and say so in the notes.

### S13: The Vendor Workbook Updater accepts the same files

- **Who:** Lead (Lena Park).
- **Skill or tool:** Vendor Workbook Updater.
- **File or sheet:** Reads `{sandbox}/work/vendor-answered/Harborline.xlsx`, `{sandbox}/work/review` and `{sandbox}/work/export-after-answer`; writes `{sandbox}/work/vendor-check.xlsx` and `{sandbox}/work/vendor-check-report.md`. Needs S05, S07 and S11 (or its fallback).
- **Exact prompt or command:**

  ```
  node {pack}/tracker-tools/vendor-workbook-updater/src/main.ts update-vendor-workbook \
    --workbook {sandbox}/work/vendor-answered/Harborline.xlsx \
    --reviews {sandbox}/work/review \
    --export {sandbox}/work/export-after-answer \
    --vendor Harborline \
    --out {sandbox}/work/vendor-check.xlsx \
    --report {sandbox}/work/vendor-check-report.md \
    --run-date 2026-12-01
  ```

- **Expected result:** Exit 0 and `applied 0 row(s), skipped 4, 0 conflict(s), 0 pending question(s)` (`expected/s13-counts.txt`). The report lists three rows as already applied on 2026-11-18 and Q2 as not accepted. The review files are not rewritten. Running it again changes nothing.
- **Pass or fail:** [ ] pass  [ ] fail  [ ] fallback used
- **If it fails:** Stop and record the error line. Do not edit a review file or the workbook. No fallback.
