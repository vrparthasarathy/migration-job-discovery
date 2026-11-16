import { readFile } from "node:fs/promises";
import { parseCsv } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { KEY_COLUMN, SHEET_FOR_TAB } from "../../sample-tracker-workbook/src/layout.ts";

/** The tabs a vendor workbook carries, with the sheet each is written to. */
export const VENDOR_TABS = ["Use Cases", "Questions", "Identity & Access"];
export const sheetOf = (tab: string): string => SHEET_FOR_TAB[tab]!;
export const keyOf = (tab: string): string => KEY_COLUMN[tab]!;

export type VendorColumn = {
  column: string;
  heading: string;
  band: string;
  /** True when the vendor edits this column in their copy, so it is never applied from a review row. */
  edited: boolean;
  owner: string;
  type: string;
  allowed: string[];
};
/** The vendor columns of each vendor tab, in the order of the headings file. */
export type Columns = Record<string, VendorColumn[]>;

async function readTable(file: string, header: string[], problems: string[]) {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    problems.push(`${file}: line 1: cannot read file`);
    return undefined;
  }
  let table;
  try {
    table = parseCsv(text, file);
  } catch (error) {
    problems.push(`${file}: line 1: ${(error as Error).message.replace(`${file}: `, "")}`);
    return undefined;
  }
  const missing = header.find((c) => !table.header.includes(c));
  if (missing !== undefined) problems.push(`${file}: line 1: missing column "${missing}"`);
  return missing === undefined ? table : undefined;
}

/** Reads the vendor columns from the sample's headings file and marks the vendor-edited ones; each finding is added to `problems`. */
export async function loadColumns(headingsFile: string, editedFile: string, schema: Schema, problems: string[]): Promise<Columns | undefined> {
  const before = problems.length;
  const headings = await readTable(headingsFile, ["tab", "column", "heading", "band", "visibility"], problems);
  const edited = await readTable(editedFile, ["tab", "column"], problems);
  if (!headings || !edited) return undefined;

  const columns: Columns = Object.fromEntries(VENDOR_TABS.map((tab) => [tab, []]));
  const editedKeys = new Set(edited.rows.map((row) => `${row.tab}|${row.column}`));
  edited.rows.forEach((row, index) => {
    const found = VENDOR_TABS.includes(row.tab!) && getTab(schema, row.tab!).columns.some((c) => c.column === row.column && c.visibility === "vendor");
    if (!found) problems.push(`${editedFile}: line ${index + 2}: "${row.column}" is not a vendor column of tab "${row.tab}"`);
  });
  headings.rows.forEach((row, index) => {
    if (row.visibility !== "V" || !VENDOR_TABS.includes(row.tab!)) return;
    const column = getTab(schema, row.tab!).columns.find((c) => c.column === row.column);
    if (!column || column.visibility !== "vendor") {
      problems.push(`${headingsFile}: line ${index + 2}: "${row.column}" is not a vendor column of tab "${row.tab}" in the schema`);
      return;
    }
    columns[row.tab!]!.push({ column: column.column, heading: row.heading!, band: row.band!, edited: editedKeys.has(`${row.tab}|${row.column}`), owner: column.owner, type: column.type, allowed: column.allowed });
  });
  for (const tab of VENDOR_TABS) {
    if (!columns[tab]!.some((c) => c.column === keyOf(tab))) problems.push(`${headingsFile}: line 1: no heading for the key column "${keyOf(tab)}" of tab "${tab}"`);
  }
  edited.rows.forEach((row, index) => {
    if (VENDOR_TABS.includes(row.tab!) && !columns[row.tab!]!.some((c) => c.column === row.column)) {
      problems.push(`${editedFile}: line ${index + 2}: "${row.column}" has no vendor heading in ${headingsFile}`);
    }
  });
  return problems.length > before ? undefined : columns;
}
