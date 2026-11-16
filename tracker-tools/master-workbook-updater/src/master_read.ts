import ExcelJS from "exceljs";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { getTab, isReference, validateTable, type Schema } from "../../tracker-tables/src/schema.ts";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { loadExport } from "../../tracker-reconciler/src/inputs.ts";
import { looksSecret } from "../../tracker-reconciler/src/secrets.ts";
import { DROPPED, keyOf, MASTER_TABS, REQUIRED_TABS, sheetOf, type MasterColumns } from "./master_columns.ts";
import { cellText, headerRow, isFormula } from "./workbook_cells.ts";

/** One tab of the master: every schema column on each row, plus the lead's extra columns keyed by their heading. */
export type MasterTable = { tab: string; file: string; extras: string[]; rows: Row[]; lines: number[] };
export type Master = {
  file: string;
  tables: Record<string, MasterTable>;
  holidays: string[];
  /** Extra columns holding formulas, which are dropped, as `Tab: heading`. */
  dropped: string[];
};

/** Adds a problem for each blank, malformed or repeated key, and for each value the schema rejects when `validate` is set. */
function checkTable(schema: Schema, table: MasterTable, validate: boolean, problems: string[]): void {
  const key = keyOf(table.tab);
  const where = validate ? `sheet "${sheetOf(table.tab)}": ` : "";
  const seen = new Set<string>();
  table.rows.forEach((row, index) => {
    const reference = row[key]!;
    const bad = (message: string) => problems.push(`${table.file}: line ${table.lines[index]}: ${where}${message}`);
    if (reference === "") bad(`${key} is blank`);
    else if (!isReference(reference)) bad(`${key} "${reference}" is not a reference`);
    else if (seen.has(reference)) bad(`duplicate ${key} "${reference}"`);
    seen.add(reference);
  });
  if (!validate) return;
  const header = getTab(schema, table.tab).columns.map((c) => c.column);
  for (const finding of validateTable(schema, table.tab, { file: table.file, header, rows: table.rows }).filter((f) => f.severity === "error" && f.row !== undefined)) {
    problems.push(`${table.file}: line ${table.lines[finding.row! - 2]}: ${where}${finding.field}: ${finding.message}`);
  }
}

function emptyTable(tab: string, file: string): MasterTable {
  return { tab, file, extras: [], rows: [], lines: [] };
}

function readSheet(ws: ExcelJS.Worksheet, tab: string, cols: MasterColumns, schema: Schema, path: string, problems: string[], dropped: string[]): MasterTable {
  const table = emptyTable(tab, path);
  const bad = (line: number, message: string) => problems.push(`${path}: line ${line}: sheet "${sheetOf(tab)}": ${message}`);
  const key = cols[tab]!.find((c) => c.column === keyOf(tab))!;
  const header = headerRow(ws, [key.heading, key.column]);
  if (header === undefined) {
    bad(1, `no header row; row 1 or 2 must hold "${key.heading}"`);
    return table;
  }
  const byIndex = new Map<number, string>();
  const extraIndex = new Map<number, string>();
  const names: string[] = [];
  ws.getRow(header).eachCell((cell, index) => {
    const name = cell.text.trim();
    if (name === "") return;
    if (names.includes(name.toLowerCase())) return bad(header, `column "${name}" appears twice`);
    names.push(name.toLowerCase());
    const found = cols[tab]!.find((c) => c.heading === name || c.column === name);
    if (found !== undefined) {
      if (!found.computed) byIndex.set(index, found.column);
    } else if (!DROPPED.includes(name)) extraIndex.set(index, name);
  });

  const formulas = new Set<string>();
  const rows: { row: Row; line: number }[] = [];
  for (let line = header + 1; line <= ws.rowCount; line++) {
    const row: Row = Object.fromEntries(getTab(schema, tab).columns.map((c) => [c.column, ""]));
    let empty = true;
    for (const [index, column] of [...byIndex, ...extraIndex]) {
      const cell = ws.getRow(line).getCell(index);
      if (extraIndex.has(index) && isFormula(cell)) formulas.add(column);
      const text = cellText(cell);
      if (text === undefined) bad(line, `error value in "${column}"`);
      else if (looksSecret(text)) bad(line, `secret-looking value in "${column}"; remove it from the file`);
      else {
        row[column] = text;
        if (text !== "") empty = false;
      }
    }
    if (!empty) rows.push({ row, line });
  }
  table.extras = [...extraIndex.values()].filter((name) => !formulas.has(name));
  for (const name of formulas) dropped.push(`${tab}: ${name}`);
  for (const { row, line } of rows) {
    for (const name of formulas) delete row[name];
    table.rows.push(row);
    table.lines.push(line);
  }
  checkTable(schema, table, true, problems);
  return table;
}

function readHolidays(wb: ExcelJS.Workbook, path: string, problems: string[]): string[] {
  const ws = wb.getWorksheet("Holidays");
  if (!ws) return [];
  const holidays: string[] = [];
  for (let line = 1; line <= ws.rowCount; line++) {
    const text = cellText(ws.getRow(line).getCell(1));
    if (text === undefined || text === "" || (line <= 2 && text.toLowerCase() === "holiday")) continue;
    if (!isIsoDate(text)) problems.push(`${path}: line ${line}: sheet "Holidays": "${text}" is not a date in YYYY-MM-DD format`);
    else holidays.push(text);
  }
  return holidays;
}

/** Reads the downloaded master: its tracker sheets and Holidays; each finding is added to `problems` as `file: line N: message`. */
export async function readMaster(path: string, cols: MasterColumns, schema: Schema, problems: string[]): Promise<Master | undefined> {
  const before = problems.length;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.readFile(path);
  } catch (error) {
    problems.push(`${path}: line 1: cannot read the workbook (${(error as Error).message})`);
    return undefined;
  }
  const master: Master = { file: path, tables: {}, holidays: readHolidays(wb, path, problems), dropped: [] };
  for (const tab of MASTER_TABS) {
    const ws = wb.getWorksheet(sheetOf(tab));
    if (ws) master.tables[tab] = readSheet(ws, tab, cols, schema, path, problems, master.dropped);
    else {
      master.tables[tab] = emptyTable(tab, path);
      if (REQUIRED_TABS.includes(tab)) problems.push(`${path}: line 1: sheet "${sheetOf(tab)}": sheet not found`);
    }
  }
  return problems.length > before ? undefined : master;
}

/** Reads a tracker export folder as the first master. */
export async function readExportBase(dir: string, schema: Schema, problems: string[]): Promise<Master | undefined> {
  const before = problems.length;
  const data = await loadExport(dir, schema, problems);
  if (!data) return undefined;
  const master: Master = { file: dir, tables: {}, holidays: [], dropped: [] };
  for (const tab of MASTER_TABS) {
    const source = data.tables[tab]!;
    const columns = getTab(schema, tab).columns.map((c) => c.column);
    const table: MasterTable = { tab, file: source.file, extras: source.header.filter((h) => !columns.includes(h)), rows: [], lines: [] };
    source.rows.forEach((row, index) => {
      table.rows.push(Object.fromEntries([...columns, ...table.extras].map((c) => [c, row[c] ?? ""])));
      table.lines.push(index + 2);
    });
    checkTable(schema, table, false, problems);
    master.tables[tab] = table;
  }
  return problems.length > before ? undefined : master;
}
