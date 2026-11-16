import ExcelJS from "exceljs";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { isReference } from "../../tracker-tables/src/schema.ts";
import { looksSecret } from "../../tracker-reconciler/src/secrets.ts";
import { keyOf, sheetOf, VENDOR_TABS, type Columns } from "./columns.ts";

/** A row of the downloaded workbook: its cells by schema column, and its row number on the sheet. */
export type WorkbookRow = { row: Row; line: number };
export type WorkbookData = Record<string, WorkbookRow[]>;

/** The text of a cell, trimmed, with a date as `YYYY-MM-DD`, a formula as its result and a hyperlink as its text; undefined for an error cell. */
function cellText(cell: ExcelJS.Cell): string | undefined {
  const value = cell.value;
  const result = value !== null && typeof value === "object" && "result" in value ? value.result : value;
  if (result instanceof Date) return result.toISOString().slice(0, 10);
  if (cell.type === ExcelJS.ValueType.Error || (result !== null && typeof result === "object" && "error" in result)) return undefined;
  return cell.text.trim();
}

/** The header row is the first of rows 1 and 2 that holds the key heading, as the sample heading or the schema column name. */
function headerRow(ws: ExcelJS.Worksheet, keys: string[]): number | undefined {
  return [1, 2].find((r) => {
    let found = false;
    ws.getRow(r).eachCell((cell) => {
      if (keys.includes(cell.text.trim())) found = true;
    });
    return found;
  });
}

/**
 * Reads the three vendor sheets of the downloaded workbook into rows keyed by schema column.
 * Read Me, Lists, hidden sheets, comments and links are never read. Each finding is added to `problems` as `file: line N: message`.
 */
export async function readVendorWorkbook(path: string, columns: Columns, vendor: string, problems: string[]): Promise<WorkbookData | undefined> {
  const before = problems.length;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(path);
  } catch (error) {
    problems.push(`${path}: line 1: cannot read the workbook (${(error as Error).message})`);
    return undefined;
  }
  const data: WorkbookData = {};
  for (const tab of VENDOR_TABS) {
    data[tab] = [];
    const ws = wb.getWorksheet(sheetOf(tab));
    const bad = (line: number, message: string) => problems.push(`${path}: line ${line}: sheet "${sheetOf(tab)}": ${message}`);
    if (!ws) {
      bad(1, "sheet not found");
      continue;
    }
    const key = columns[tab]!.find((c) => c.column === keyOf(tab))!;
    const header = headerRow(ws, [key.heading, key.column]);
    if (header === undefined) {
      bad(1, `no header row; row 1 or 2 must hold "${key.heading}"`);
      continue;
    }
    const byIndex = new Map<number, string>();
    ws.getRow(header).eachCell((cell, index) => {
      const name = cell.text.trim();
      const found = columns[tab]!.find((c) => c.heading === name || c.column === name);
      if (found === undefined) bad(header, `column "${name}" is not a vendor column`);
      else if ([...byIndex.values()].includes(found.column)) bad(header, `column "${name}" appears twice`);
      else byIndex.set(index, found.column);
    });

    const seen = new Set<string>();
    for (let line = header + 1; line <= ws.rowCount; line++) {
      const row: Row = Object.fromEntries(columns[tab]!.map((c) => [c.column, ""]));
      let empty = true;
      for (const [index, column] of byIndex) {
        const text = cellText(ws.getRow(line).getCell(index));
        if (text === undefined) bad(line, `error value in "${column}"`);
        else if (looksSecret(text)) bad(line, `secret-looking value in "${column}"; remove it from the file`);
        else {
          row[column] = text;
          if (text !== "") empty = false;
        }
      }
      if (empty) continue;
      const reference = row[key.column]!;
      if (reference === "") bad(line, `${key.column} is blank`);
      else if (!isReference(reference)) bad(line, `${key.column} "${reference}" is not a reference`);
      else if (seen.has(reference)) bad(line, `duplicate ${key.column} "${reference}"`);
      seen.add(reference);
      if (row.vendor !== vendor) bad(line, `vendor "${row.vendor}" is not "${vendor}"`);
      data[tab]!.push({ row, line });
    }
  }
  return problems.length > before ? undefined : data;
}
