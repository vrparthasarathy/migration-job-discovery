import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { formatCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { fieldHeaders, fullHeader, label } from "../../review-csv-exporter/src/headings.ts";
import { reviewFile } from "../../review-csv-exporter/src/review.ts";
import { reviewCells } from "../../vendor-workbook-updater/test/support.ts";
import { loadReviews } from "../src/reviews.ts";
import { lib } from "./support.ts";

const TAB = "Use Cases";

/** Loads a folder holding only a Use Cases review file made of the given rows (each a change to the cells of a valid row). */
async function load(rows: ((cells: Row, key: (name: string) => string) => void)[]): Promise<{ problems: string[]; rows: number }> {
  const w = await lib();
  const dir = await mkdtemp(join(tmpdir(), "master-reviews-"));
  const cells = rows.map((change, i) => {
    const row = reviewCells(w, { tab: TAB, record: `UC-00${i + 1}`, useCase: "Daily Report", fields: { stage: ["sent", "review", "update"] } }, i + 1);
    change(row, (name) => label(w.headings, name));
    return row;
  });
  await writeFile(join(dir, reviewFile(TAB)), formatCsv(fullHeader(w.headings, TAB), cells));
  const problems: string[] = [];
  const files = await loadReviews(dir, w.headings, [TAB], problems);
  return { problems: problems.map((p) => p.replace(dir, "dir")), rows: files[0]?.rows.length ?? 0 };
}

test("[B8] a valid review file is read with each row's fields, state and digest check", async () => {
  const { problems, rows } = await load([() => {}, () => {}]);
  assert.deepEqual(problems, []);
  assert.equal(rows, 2);
});

test("[B8] each problem in a review file is named with its file and line", async () => {
  const w = await lib();
  const stage = fieldHeaders(w.headings, w.headings.shown[TAB]!.find((s) => s.column === "stage")!.heading);
  const { problems } = await load([
    (c, key) => (c[key("order")] = "first"),
    (c, key) => (c[key("reviewed_on")] = "soon"),
    (c, key) => (c[key("applied_on")] = "2026-13-45"),
    (c, key) => ((c[key("record")] = ""), (c[key("record_key")] = "")),
    (c, key) => (c[key("record")] = "UC-001"),
    (c) => (c[stage[2]!] = "maybe"),
    (c, key) => (c[key("review_note")] = "token: abcdef123456"),
  ]);
  assert.deepEqual(problems, [
    'dir/review-use-cases.csv: line 2: order "first" is not a whole number',
    'dir/review-use-cases.csv: line 3: reviewed_on "soon" is not a date in YYYY-MM-DD format',
    'dir/review-use-cases.csv: line 4: applied_on "2026-13-45" is not a date in YYYY-MM-DD format',
    "dir/review-use-cases.csv: line 5: record and record_key are both blank",
    'dir/review-use-cases.csv: line 6: duplicate record "UC-001"',
    'dir/review-use-cases.csv: line 7: stage (state) "maybe" must be blank or one of add, update, suggest, held, conflict',
    'dir/review-use-cases.csv: line 8: secret-looking value in "review_note"; remove it from the file',
  ]);
});

test("[B8] a missing or unparsable review file is named with its line", async () => {
  const w = await lib();
  const dir = await mkdtemp(join(tmpdir(), "master-reviews-"));
  const problems: string[] = [];
  await loadReviews(dir, w.headings, [TAB], problems);
  await writeFile(join(dir, reviewFile(TAB)), '"open');
  await loadReviews(dir, w.headings, [TAB], problems);
  await writeFile(join(dir, reviewFile(TAB)), "a\n1,2\n");
  await loadReviews(dir, w.headings, [TAB], problems);
  assert.deepEqual(problems.map((p) => p.replace(dir, "dir")), [
    "dir/review-use-cases.csv: line 1: cannot read review file",
    "dir/review-use-cases.csv: line 1: unterminated quoted field",
    "dir/review-use-cases.csv: line 2: row 2 has 2 fields but the header has 1",
  ]);
});
