import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { tabFileName } from "../../tracker-tables/src/schema.ts";
import { looksSecret } from "../../tracker-reconciler/src/secrets.ts";
import { label, REVIEW_CELLS, type Headings } from "./headings.ts";
import { TABS, type Built } from "./rows.ts";

export const STATUSES = ["", "accepted", "rejected", "clarify"];
export const reviewFile = (tab: string): string => `review-${tabFileName(tab)}`;

/** What an earlier run left in a row: the digest it was written with, its flag and the lead's five review cells (keyed by review key). */
export type Stored = { digest: string; changed: string; cells: Record<string, string> };

const identityOf = (record: string, recordKey: string): string => (record !== "" ? record : `new:${recordKey}`);

/** Reads the review files of an earlier run in `out`, keyed `tab|identity`; each finding is added to `problems`. */
export async function loadReviews(out: string, h: Headings, problems: string[]): Promise<Map<string, Stored>> {
  const stored = new Map<string, Stored>();
  const needed = ["record", "record_key", "content_digest", "changed_since_review", ...REVIEW_CELLS];
  for (const tab of TABS) {
    const file = join(out, reviewFile(tab));
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") problems.push(`${file}: cannot read review file (${(error as NodeJS.ErrnoException).code ?? "error"})`);
      continue;
    }
    let table;
    try {
      table = parseCsv(text, file);
    } catch (error) {
      problems.push(`${file}: line 1: ${(error as Error).message.replace(`${file}: `, "")}`);
      continue;
    }
    const lost = needed.find((key) => !table.header.includes(label(h, key)));
    if (lost !== undefined && table.rows.length > 0) {
      problems.push(`${file}: line 1: missing column "${label(h, lost)}"; the headings file changed since this file was written`);
      continue;
    }
    table.rows.forEach((row, index) => {
      const line = index + 2;
      const cell = (key: string): string => row[label(h, key)]!;
      for (const [name, value] of Object.entries(row)) {
        if (looksSecret(value)) problems.push(`${file}: line ${line}: secret-looking value in "${name}"; remove it from the file`);
      }
      if (!STATUSES.includes(cell("review_status"))) problems.push(`${file}: line ${line}: ${label(h, "review_status")} "${cell("review_status")}" must be blank or one of ${STATUSES.slice(1).join(", ")}`);
      stored.set(`${tab}|${identityOf(cell("record"), cell("record_key"))}`, { digest: cell("content_digest"), changed: cell("changed_since_review"), cells: Object.fromEntries(REVIEW_CELLS.map((key) => [key, cell(key)])) });
    });
  }
  return stored;
}

/** Copies each earlier row's review cells onto the matching new row and flags a reviewed row whose content has changed. */
export function mergeReviews(rows: Built[], stored: Map<string, Stored>, h: Headings): { tab: string; cells: Row }[] {
  return rows.map((row) => {
    const old = stored.get(`${row.tab}|${row.identity}`);
    const cells: Row = { ...row.cells };
    const filled = old !== undefined && REVIEW_CELLS.some((key) => old.cells[key] !== "");
    for (const key of REVIEW_CELLS) cells[label(h, key)] = old?.cells[key] ?? "";
    const changed = filled && (old.digest !== row.cells[label(h, "content_digest")] || old.changed === "yes");
    cells[label(h, "changed_since_review")] = changed ? "yes" : "";
    return { tab: row.tab, cells };
  });
}
