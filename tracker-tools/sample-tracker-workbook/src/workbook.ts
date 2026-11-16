import { rename } from "node:fs/promises";
import ExcelJS from "exceljs";
import { splitList } from "../../tracker-tables/src/csv.ts";
import { getTab } from "../../tracker-tables/src/schema.ts";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import {
  COLOURS, COMPUTED, CONTRACT_TABS, DATE_COLUMNS, DATE_FORMAT, HEADER_ROWS, HEADING_TABS, KEY_COLUMN, SHEET_FOR_TAB, SHEET_INFO,
  SPARE_ROWS, TRACE_KIND, columnWidth, frozenColumns, tabColour,
} from "./layout.ts";
import { pendingChanges, reviewColumns } from "./review_columns.ts";
import type { Heading, SampleData } from "./sample_data.ts";

type Value = string | number;
type SheetRows = { headings: Heading[]; rows: Record<string, Value>[] };

export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
}

/** The rows of one sheet as column-to-value records, with the computed columns filled in at the as-of date. */
function sheetRows(data: SampleData, tab: string, asOf: string): SheetRows {
  const headings = data.headings.filter((h) => h.tab === tab);
  if (tab === "Proposed Changes") {
    return { headings, rows: data.proposals.rows.map((r) => ({ ...r, tab: SHEET_FOR_TAB[r.tab!]! })) };
  }
  if (tab === "Trace") return { headings, rows: traceRows(data) };
  const rows = data.tables[tab]!.rows.map((row) => {
    const extra = tab === "Questions" ? reviewColumns(row, asOf) : {};
    return { ...row, ...extra, pending_change: pendingChanges(data.proposals, tab, row[KEY_COLUMN[tab]!]!) };
  });
  return { headings, rows };
}

/** Trace rows: the omitted columns of every record first, then the explicit trace file, without duplicates. */
function traceRows(data: SampleData): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  for (const tab of CONTRACT_TABS) {
    for (const row of data.tables[tab]!.rows) {
      for (const [column, kind] of Object.entries(TRACE_KIND)) {
        for (const reference of splitList(row[column] ?? "")) rows.push({ tab, record_ref: row[KEY_COLUMN[tab]!]!, kind, reference });
      }
    }
  }
  rows.push(...data.trace.rows);
  const seen = new Set<string>();
  return rows
    .filter((r) => {
      const key = [r.tab, r.record_ref, r.kind, r.reference].join("|");
      return !seen.has(key) && seen.add(key);
    })
    .map((r) => ({ ...r, tab: SHEET_FOR_TAB[r.tab!]! }));
}

function dateColumns(data: SampleData, tab: string): string[] {
  const schemaDates = CONTRACT_TABS.includes(tab) ? getTab(data.schema, tab).columns.filter((c) => c.type === "date").map((c) => c.column) : [];
  return [...schemaDates, ...DATE_COLUMNS];
}

function cellValue(value: Value | undefined, isDate: boolean): ExcelJS.CellValue {
  if (value === undefined || value === "") return null;
  return isDate && typeof value === "string" && isIsoDate(value) ? new Date(`${value}T00:00:00Z`) : value;
}

const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function addDataSheet(wb: ExcelJS.Workbook, data: SampleData, tab: string, asOf: string, enums: Set<string>): void {
  const name = SHEET_FOR_TAB[tab]!;
  const { headings, rows } = sheetRows(data, tab, asOf);
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tabColour(name) } } });
  const dates = dateColumns(data, tab);
  const values = rows.map((row) => headings.map((h) => cellValue(row[h.column], dates.includes(h.column))));
  ws.addTable({
    name: `tbl${name.replace(/[^A-Za-z0-9]/g, "")}`,
    ref: `A${HEADER_ROWS}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleLight1", showRowStripes: true },
    columns: headings.map((h) => ({ name: h.heading, filterButton: true })),
    rows: values,
  });

  let group = -1;
  let previousBand = "";
  headings.forEach((h, i) => {
    if (h.band !== previousBand) group++;
    const band = ws.getCell(1, i + 1);
    band.fill = solid(COLOURS.bands[group % 2]!);
    band.font = { bold: true };
    if (h.band !== previousBand) band.value = h.band;
    previousBand = h.band;

    const header = ws.getCell(2, i + 1);
    header.fill = solid(h.visibility === "V" ? COLOURS.vendorHeader : COLOURS.internalHeader);
    header.font = { bold: true, color: { argb: COLOURS.white } };
    header.alignment = { vertical: "middle", wrapText: true };

    ws.getColumn(i + 1).width = columnWidth(h.heading, rows.map((r) => String(r[h.column])));
    const isDate = dates.includes(h.column);
    rows.forEach((_, r) => {
      const cell = ws.getCell(HEADER_ROWS + 1 + r, i + 1);
      cell.alignment = { vertical: "top", wrapText: true };
      if (isDate) cell.numFmt = DATE_FORMAT;
    });
    if (enums.has(h.column) && CONTRACT_TABS.includes(tab)) {
      for (let r = HEADER_ROWS + 1; r <= HEADER_ROWS + rows.length + SPARE_ROWS; r++) {
        ws.getCell(r, i + 1).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [h.column],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Not in the list",
          error: `Pick one of the values in the ${h.column} list on the Lists sheet.`,
        };
      }
    }
  });
  const x = frozenColumns(name);
  ws.views = [{ state: "frozen", xSplit: x, ySplit: HEADER_ROWS, topLeftCell: `${columnLetter(x)}${HEADER_ROWS + 1}`, activeCell: `${columnLetter(x)}${HEADER_ROWS + 1}` }];
}

/** The enum lists shown by the main sheets, in the order they first appear, with their allowed values from the schema. */
function enumLists(data: SampleData): { name: string; values: string[] }[] {
  const lists: { name: string; values: string[] }[] = [];
  for (const h of data.headings.filter((x) => CONTRACT_TABS.includes(x.tab))) {
    const column = getTab(data.schema, h.tab).columns.find((c) => c.column === h.column);
    if (column?.type === "enum" && !lists.some((l) => l.name === column.column)) lists.push({ name: column.column, values: column.allowed });
  }
  return lists;
}

function addLists(wb: ExcelJS.Workbook, lists: { name: string; values: string[] }[]): void {
  const ws = wb.addWorksheet("Lists", { properties: { tabColor: { argb: tabColour("Lists") } } });
  lists.forEach((list, i) => {
    const column = columnLetter(i);
    const header = ws.getCell(1, i + 1);
    header.value = list.name;
    header.fill = solid(COLOURS.internalHeader);
    header.font = { bold: true, color: { argb: COLOURS.white } };
    list.values.forEach((value, r) => (ws.getCell(r + 2, i + 1).value = value));
    ws.getColumn(i + 1).width = columnWidth(list.name, list.values);
    wb.definedNames.add(`Lists!$${column}$2:$${column}$${list.values.length + 1}`, list.name);
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function addReadMe(wb: ExcelJS.Workbook, data: SampleData, asOf: string): void {
  const ws = wb.addWorksheet("Read Me", { properties: { tabColor: { argb: tabColour("Read Me") } } });
  [22, 46, 40, 46, 14, 12].forEach((width, i) => (ws.getColumn(i + 1).width = width));
  const line = (...cells: Value[]) => ws.addRow(cells);
  const bold = (row: ExcelJS.Row) => {
    row.font = { bold: true };
  };
  line("Sample Tracker Workbook").font = { bold: true, size: 16 };
  line(`A fictional sample for the team to review the format of the tracker. As-of date: ${asOf}. Nothing here is real vendor data.`);
  line("This workbook is an internal sample. It mixes vendor-visible and internal columns and is not vendor-safe. Nothing in it is hidden.");
  line("Vendor workbooks are separate files built from the layout guide. Never share this file with a vendor.");
  line();
  bold(line("Sheets"));
  bold(line("Sheet", "Visibility", "What it holds"));
  for (const sheet of SHEET_INFO) line(sheet.name, sheet.visibility, sheet.purpose);
  line();
  bold(line("Colour key"));
  line("Blue column header", "Vendor-visible column");
  line("Grey column header", "Internal column");
  line("Red sheet tab", "Internal sheet. Never share it with a vendor.");
  line("Row 1 band", "Groups related columns. Row 2 is the table header with filters.");
  line();
  bold(line("How the review columns are worked out"));
  line("Due on is the release date plus two working days, with no holidays. A response never moves it.");
  line("Days past original due counts working days after Due on up to the as-of date, for rows that are overdue.");
  line("Age awaiting review counts calendar days from the answer to the as-of date. Complete answers awaiting lead review are not overdue.");
  line("A clarification-requested row stays overdue against its original due date. A partial answer is overdue and a follow-up.");
  line("Due on, Review state, Days past original due and Age awaiting review are values at the as-of date, not formulas.");
  line("Pending change points to a row on Proposed Changes. The main sheets hold accepted values only.");
  line();
  bold(line("Column dictionary"));
  bold(line("Sheet", "Heading", "Visibility", "Schema column", "Owner", "Type"));
  for (const h of data.headings) {
    const schemaColumn = CONTRACT_TABS.includes(h.tab) ? getTab(data.schema, h.tab).columns.find((c) => c.column === h.column) : undefined;
    const computed = COMPUTED[h.tab]?.[h.column];
    const description = computed ? `${h.column} (${computed})` : h.column;
    line(SHEET_FOR_TAB[h.tab]!, h.heading, h.visibility === "V" ? "Vendor-visible" : "Internal", description, schemaColumn?.owner ?? (computed ? "computed" : "proposal"), schemaColumn?.type ?? (computed ? "computed" : "text"));
  }
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** Builds the eight-sheet workbook from validated sample data at the as-of date. */
export function buildWorkbook(data: SampleData, asOf: string): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sample Tracker Workbook";
  wb.lastModifiedBy = "Sample Tracker Workbook";
  wb.created = new Date(`${asOf}T00:00:00Z`);
  wb.modified = wb.created;
  const lists = enumLists(data);
  addReadMe(wb, data, asOf);
  for (const tab of HEADING_TABS) addDataSheet(wb, data, tab, asOf, new Set(lists.map((l) => l.name)));
  addLists(wb, lists);
  return wb;
}

/** Writes to a temporary name and renames, so a failed write never leaves a partial workbook. */
export async function saveWorkbook(workbook: ExcelJS.Workbook, path: string): Promise<void> {
  const temporary = `${path}.tmp`;
  await workbook.xlsx.writeFile(temporary);
  await rename(temporary, path);
}
