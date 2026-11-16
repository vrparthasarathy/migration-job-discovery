import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { formatCsv, parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { looksSecret } from "../../tracker-reconciler/src/secrets.ts";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { contentHeader, fieldHeaders, fullHeader, label, type Headings } from "../../review-csv-exporter/src/headings.ts";
import { digestOf } from "../../review-csv-exporter/src/rows.ts";
import { reviewFile, STATUSES } from "../../review-csv-exporter/src/review.ts";
import { VENDOR_TABS } from "./columns.ts";

export const STATES = ["", "add", "update", "suggest", "held", "conflict"];

/** One shown field of a review row: the three cells the exporter writes for it. */
export type Field = { column: string; current: string; proposed: string; state: string };
export type ReviewRow = {
  tab: string;
  file: string;
  line: number;
  /** `record` when not blank, else `new:<record_key>`. */
  identity: string;
  record: string;
  recordKey: string;
  suggestedRef: string;
  useCase: string;
  order: number;
  status: string;
  appliedOn: string;
  changedSinceReview: boolean;
  conflict: string;
  /** False when the content digest in the file is not the digest of the row's content cells. */
  digestMatches: boolean;
  fields: Field[];
  otherChanges: string;
  cells: Row;
};
export type ReviewFile = { tab: string; file: string; header: string[]; rows: ReviewRow[] };

/** Reads the review files of the vendor tabs in `dir` and checks them against the exporter's header and rules; each finding is added to `problems`. */
export async function loadReviews(dir: string, h: Headings, problems: string[]): Promise<ReviewFile[]> {
  const files: ReviewFile[] = [];
  for (const tab of VENDOR_TABS) {
    const file = join(dir, reviewFile(tab));
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      problems.push(`${file}: line 1: cannot read review file`);
      continue;
    }
    let table;
    try {
      table = parseCsv(text, file);
    } catch (error) {
      const message = (error as Error).message.replace(`${file}: `, "");
      problems.push(`${file}: line ${/^row (\d+)/.exec(message)?.[1] ?? 1}: ${message}`);
      continue;
    }
    const expected = fullHeader(h, tab);
    if (table.header.join("\n") !== expected.join("\n")) {
      problems.push(`${file}: line 1: the header is not the review header written by export-review with this headings file`);
      continue;
    }
    const rows: ReviewRow[] = [];
    const seen = new Set<string>();
    table.rows.forEach((cells, index) => {
      const line = index + 2;
      const bad = (message: string) => problems.push(`${file}: line ${line}: ${message}`);
      const cell = (key: string): string => cells[label(h, key)]!;
      for (const [name, value] of Object.entries(cells)) {
        if (looksSecret(value)) bad(`secret-looking value in "${name}"; remove it from the file`);
      }
      if (!STATUSES.includes(cell("review_status"))) bad(`${label(h, "review_status")} "${cell("review_status")}" must be blank or one of ${STATUSES.slice(1).join(", ")}`);
      for (const key of ["reviewed_on", "applied_on"]) {
        if (cell(key) !== "" && !isIsoDate(cell(key))) bad(`${label(h, key)} "${cell(key)}" is not a date in YYYY-MM-DD format`);
      }
      if (!/^\d+$/.test(cell("order"))) bad(`${label(h, "order")} "${cell("order")}" is not a whole number`);
      if (cell("record") === "" && cell("record_key") === "") bad(`${label(h, "record")} and ${label(h, "record_key")} are both blank`);
      const identity = cell("record") !== "" ? cell("record") : `new:${cell("record_key")}`;
      if (seen.has(identity)) bad(`duplicate record "${identity}"`);
      seen.add(identity);
      const fields = h.shown[tab]!.map((s): Field => {
        const [current, proposed, state] = fieldHeaders(h, s.heading).map((name) => cells[name]!) as [string, string, string];
        if (!STATES.includes(state)) bad(`${s.heading} (${label(h, "suffix_state")}) "${state}" must be blank or one of ${STATES.slice(1).join(", ")}`);
        return { column: s.column, current, proposed, state };
      });
      rows.push({
        tab,
        file,
        line,
        identity,
        record: cell("record"),
        recordKey: cell("record_key"),
        suggestedRef: cell("suggested_ref"),
        useCase: cell("use_case"),
        order: Number(cell("order")),
        status: cell("review_status"),
        appliedOn: cell("applied_on"),
        changedSinceReview: cell("changed_since_review") === "yes",
        conflict: cell("conflict"),
        digestMatches: digestOf(contentHeader(h, tab), cells) === cell("content_digest"),
        fields,
        otherChanges: cell("other_changes"),
        cells,
      });
    });
    files.push({ tab, file, header: table.header, rows });
  }
  return files;
}

/** The new text of each review file that holds an applied row, with only that row's `applied_on` set to the run date. */
export function markApplied(files: ReviewFile[], applied: Set<ReviewRow>, h: Headings, runDate: string): { file: string; text: string }[] {
  return files
    .filter((f) => f.rows.some((r) => applied.has(r)))
    .map((f) => ({ file: f.file, text: formatCsv(f.header, f.rows.map((r) => (applied.has(r) ? { ...r.cells, [label(h, "applied_on")]: runDate } : r.cells))) }));
}
