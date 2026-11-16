import { readFile } from "node:fs/promises";
import { parseCsv } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { KEY_COLUMN, SHEET_FOR_TAB } from "../../sample-tracker-workbook/src/layout.ts";

/** The tabs the master holds, in sheet order. */
export const MASTER_TABS = ["Use Cases", "Questions", "Identity & Access", "Mappings", "Question Groups", "Question Links", "Batches"];
/** The tabs a lead must have in a downloaded master; the others may be missing and are then empty. */
export const REQUIRED_TABS = MASTER_TABS.slice(0, 4);
/** Columns the sample shows that are not schema columns and are recomputed on every run. */
export const REVIEW_COMPUTED: Record<string, string[]> = { Questions: ["review_state", "days_past_original_due", "age_awaiting_review"] };
/** Sample columns the master does not carry, because it has no Proposed Changes sheet; ignored when read. */
export const DROPPED = ["pending_change"];
export const TRAILING_BAND = "Trace and bookkeeping";

export type MasterColumn = { column: string; heading: string; band: string; visibility: "V" | "I"; computed: boolean };
export type MasterColumns = Record<string, MasterColumn[]>;

export const sheetOf = (tab: string): string => SHEET_FOR_TAB[tab] ?? tab;
const OTHER_KEYS: Record<string, string> = { "Question Groups": "group_ref", "Question Links": "link_ref", Batches: "batch_ref" };
export const keyOf = (tab: string): string => KEY_COLUMN[tab] ?? OTHER_KEYS[tab]!;

/**
 * The columns of each master tab: the sample's headings first, then the schema columns they omit, so every schema column is kept.
 * A tab the sample has no headings for takes the schema names. Each finding is added to `problems`.
 */
export async function loadMasterColumns(headingsFile: string, schema: Schema, problems: string[]): Promise<MasterColumns | undefined> {
  const before = problems.length;
  let text: string;
  try {
    text = await readFile(headingsFile, "utf8");
  } catch {
    problems.push(`${headingsFile}: line 1: cannot read file`);
    return undefined;
  }
  let table;
  try {
    table = parseCsv(text, headingsFile);
  } catch (error) {
    problems.push(`${headingsFile}: line 1: ${(error as Error).message.replace(`${headingsFile}: `, "")}`);
    return undefined;
  }
  const missing = ["tab", "column", "heading", "band", "visibility"].find((c) => !table.header.includes(c));
  if (missing !== undefined) {
    problems.push(`${headingsFile}: line 1: missing column "${missing}"`);
    return undefined;
  }
  const columns: MasterColumns = Object.fromEntries(MASTER_TABS.map((tab) => [tab, []]));
  table.rows.forEach((row, index) => {
    if (!MASTER_TABS.includes(row.tab!) || DROPPED.includes(row.column!)) return;
    const known = getTab(schema, row.tab!).columns.some((c) => c.column === row.column);
    const computed = REVIEW_COMPUTED[row.tab!]?.includes(row.column!) ?? false;
    if (!known && !computed) {
      problems.push(`${headingsFile}: line ${index + 2}: "${row.column}" is not a column of tab "${row.tab}" in the schema`);
      return;
    }
    columns[row.tab!]!.push({ column: row.column!, heading: row.heading!, band: row.band!, visibility: row.visibility === "V" ? "V" : "I", computed });
  });
  for (const tab of MASTER_TABS) {
    const shown = columns[tab]!;
    const band = shown.length > 0 ? TRAILING_BAND : tab;
    for (const c of getTab(schema, tab).columns.filter((x) => !shown.some((s) => s.column === x.column))) {
      shown.push({ column: c.column, heading: c.column, band, visibility: c.visibility === "vendor" ? "V" : "I", computed: false });
    }
    const names = shown.map((c) => c.heading.toLowerCase());
    const twice = names.find((n, i) => names.indexOf(n) !== i);
    if (twice !== undefined) problems.push(`${headingsFile}: line 1: heading "${twice}" is used twice in tab "${tab}"`);
  }
  return problems.length > before ? undefined : columns;
}
