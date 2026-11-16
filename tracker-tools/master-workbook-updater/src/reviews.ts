import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv } from "../../tracker-tables/src/csv.ts";
import { looksSecret } from "../../tracker-reconciler/src/secrets.ts";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { contentHeader, fieldHeaders, fullHeader, label, type Headings } from "../../review-csv-exporter/src/headings.ts";
import { digestOf } from "../../review-csv-exporter/src/rows.ts";
import { reviewFile, STATUSES } from "../../review-csv-exporter/src/review.ts";
import { STATES, type Field, type ReviewFile, type ReviewRow } from "../../vendor-workbook-updater/src/reviews.ts";

export { markApplied, type ReviewFile, type ReviewRow } from "../../vendor-workbook-updater/src/reviews.ts";

/** Reads the review files of the given tabs in `dir` and checks them against the exporter's header and rules; each finding is added to `problems`. */
export async function loadReviews(dir: string, h: Headings, tabs: string[], problems: string[]): Promise<ReviewFile[]> {
  const files: ReviewFile[] = [];
  for (const tab of tabs) {
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
      if (cell("use_case") !== "" && !/^uc-[a-z0-9]+(-[a-z0-9]+)+$/.test(cell("use_case"))) bad(`${label(h, "use_case")} "${cell("use_case")}" is not a use case ID such as uc-example-vendor-daily-report`);
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
