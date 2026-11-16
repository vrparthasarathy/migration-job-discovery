import ExcelJS from "exceljs";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { dueOn, isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { COLOURS, columnWidth, DATE_FORMAT, frozenColumns, HEADER_ROWS, SPARE_ROWS } from "../../sample-tracker-workbook/src/layout.ts";
import { reviewColumns } from "../../sample-tracker-workbook/src/review_columns.ts";
import { fixedZip } from "../../vendor-workbook-updater/src/archive.ts";
import { keyOf, MASTER_TABS, sheetOf, type MasterColumn, type MasterColumns } from "./master_columns.ts";
import type { Master } from "./master_read.ts";

export const EXTRA_BAND = "Lead columns";
const MIXED_TABS = ["Use Cases", "Questions", "Identity & Access"];
const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

export type DueMismatch = { tab: string; reference: string; stored: string; expected: string };

/** Fills `due_on` where it is blank as the release date plus two working days; a stored value that differs is listed and left as it is. */
export function fillDueDates(master: Master): DueMismatch[] {
  const mismatches: DueMismatch[] = [];
  for (const tab of ["Questions", "Batches"]) {
    for (const row of master.tables[tab]!.rows) {
      if (row.released_on === "") continue;
      const expected = dueOn(row.released_on!, master.holidays);
      if (row.due_on === "") row.due_on = expected;
      else if (row.due_on !== expected) mismatches.push({ tab, reference: row[keyOf(tab)]!, stored: row.due_on!, expected });
    }
  }
  return mismatches;
}

function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
}

type List = { name: string; column: string; values: string[] };
type Lists = { lists: List[]; nameOf: Map<string, string> };

/** The cell values of a question's computed review columns at the run date; blank when the row lacks what they need. */
function computed(row: Row, runDate: string): Row {
  if (row.released_on === "" || row.status === "") return { review_state: row.released_on === "" ? "Not released" : "", days_past_original_due: "", age_awaiting_review: "" };
  const review = reviewColumns(row, runDate);
  const clean = (value: string | number): string => (typeof value === "number" && Number.isNaN(value) ? "" : String(value));
  return { review_state: review.review_state, days_past_original_due: clean(review.days_past_original_due), age_awaiting_review: clean(review.age_awaiting_review) };
}

function addDataSheet(wb: ExcelJS.Workbook, schema: Schema, cols: MasterColumns, master: Master, tab: string, runDate: string, lists: Lists): void {
  const name = sheetOf(tab);
  const table = master.tables[tab]!;
  const shown: MasterColumn[] = [...cols[tab]!, ...table.extras.map((e): MasterColumn => ({ column: e, heading: e, band: EXTRA_BAND, visibility: "I", computed: false }))];
  const schemaColumns = getTab(schema, tab).columns;
  const dates = new Set(schemaColumns.filter((c) => c.type === "date").map((c) => c.column));
  const text = (row: Row, c: MasterColumn): string => (c.computed ? computed(row, runDate)[c.column]! : row[c.column]!);
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: MIXED_TABS.includes(tab) ? COLOURS.mixedTab : COLOURS.internalTab } } });
  const values = table.rows.map((row) => shown.map((c): ExcelJS.CellValue => (text(row, c) === "" ? null : dates.has(c.column) && isIsoDate(text(row, c)) ? new Date(`${text(row, c)}T00:00:00Z`) : text(row, c))));
  ws.addTable({
    name: `tbl${name.replace(/[^A-Za-z0-9]/g, "")}`,
    ref: `A${HEADER_ROWS}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleLight1", showRowStripes: true },
    columns: shown.map((c) => ({ name: c.heading, filterButton: true })),
    rows: values.length > 0 ? values : [shown.map(() => null)],
  });

  let group = -1;
  let previousBand = "";
  const last = HEADER_ROWS + Math.max(table.rows.length, 1);
  shown.forEach((c, i) => {
    if (c.band !== previousBand) group++;
    const band = ws.getCell(1, i + 1);
    band.fill = solid(COLOURS.bands[group % 2]!);
    band.font = { bold: true };
    if (c.band !== previousBand) band.value = c.band;
    previousBand = c.band;

    const header = ws.getCell(2, i + 1);
    header.fill = solid(c.visibility === "V" ? COLOURS.vendorHeader : COLOURS.internalHeader);
    header.font = { bold: true, color: { argb: COLOURS.white } };
    header.alignment = { vertical: "middle", wrapText: true };
    ws.getColumn(i + 1).width = columnWidth(c.heading, table.rows.map((r) => text(r, c)));
    for (let r = HEADER_ROWS + 1; r <= last; r++) {
      const cell = ws.getCell(r, i + 1);
      cell.alignment = { vertical: "top", wrapText: true };
      if (dates.has(c.column)) cell.numFmt = DATE_FORMAT;
    }
    const listName = lists.nameOf.get(`${tab}|${c.column}`);
    if (listName !== undefined) {
      for (let r = HEADER_ROWS + 1; r <= last + SPARE_ROWS; r++) {
        ws.getCell(r, i + 1).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [listName],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Not in the list",
          error: `Pick one of the values in the ${listName} list on the Lists sheet.`,
        };
      }
    }
  });
  const x = frozenColumns(name);
  ws.views = [{ state: "frozen", xSplit: x, ySplit: HEADER_ROWS, topLeftCell: `${columnLetter(x)}${HEADER_ROWS + 1}`, activeCell: `${columnLetter(x)}${HEADER_ROWS + 1}` }];
}

/** One dropdown list per enum column, named after the column; a column that two tabs list with different values gets the tab in its name. */
function enumLists(schema: Schema, cols: MasterColumns): Lists {
  const result: Lists = { lists: [], nameOf: new Map() };
  for (const tab of MASTER_TABS) {
    for (const c of cols[tab]!) {
      const column = getTab(schema, tab).columns.find((s) => s.column === c.column);
      if (column?.type !== "enum") continue;
      let list = result.lists.find((l) => l.column === c.column && l.values.join(";") === column.allowed.join(";"));
      if (!list) {
        const clash = result.lists.some((l) => l.column === c.column);
        result.lists.push((list = { name: clash ? `${c.column}_${tab.replace(/[^A-Za-z0-9]/g, "")}` : c.column, column: c.column, values: column.allowed }));
      }
      result.nameOf.set(`${tab}|${c.column}`, list.name);
    }
  }
  return result;
}

function addLists(wb: ExcelJS.Workbook, lists: List[]): void {
  const ws = wb.addWorksheet("Lists", { properties: { tabColor: { argb: COLOURS.referenceTab } } });
  lists.forEach((list, i) => {
    const header = ws.getCell(1, i + 1);
    header.value = list.name;
    header.fill = solid(COLOURS.internalHeader);
    header.font = { bold: true, color: { argb: COLOURS.white } };
    list.values.forEach((value, r) => (ws.getCell(r + 2, i + 1).value = value));
    ws.getColumn(i + 1).width = columnWidth(list.name, list.values);
    const letter = columnLetter(i);
    wb.definedNames.add(`Lists!$${letter}$2:$${letter}$${list.values.length + 1}`, list.name);
  });
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function addHolidays(wb: ExcelJS.Workbook, holidays: string[]): void {
  const ws = wb.addWorksheet("Holidays", { properties: { tabColor: { argb: COLOURS.internalTab } } });
  const header = ws.getCell(1, 1);
  header.value = "holiday";
  header.fill = solid(COLOURS.internalHeader);
  header.font = { bold: true, color: { argb: COLOURS.white } };
  holidays.forEach((day, i) => {
    const cell = ws.getCell(i + 2, 1);
    cell.value = new Date(`${day}T00:00:00Z`);
    cell.numFmt = DATE_FORMAT;
  });
  ws.getColumn(1).width = 14;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

function addReadMe(wb: ExcelJS.Workbook, runDate: string): void {
  const ws = wb.addWorksheet("Read Me", { properties: { tabColor: { argb: COLOURS.referenceTab } } });
  [24, 80].forEach((width, i) => (ws.getColumn(i + 1).width = width));
  const line = (...cells: string[]) => ws.addRow(cells);
  line("Use case tracker, internal master").font = { bold: true, size: 16 };
  line(`Written ${runDate} by the Master Workbook Updater. Internal: never share this file with a vendor.`);
  line();
  line("Sheets").font = { bold: true };
  line("Use Cases, Questions, Identity & Access", "The tracker tabs, with vendor-visible (blue) and internal (grey) columns.");
  line("Workflow Mappings, Question Groups, Question Links, Batches", "Internal tabs (red).");
  line("Holidays", "Dates that do not count as working days for due dates.");
  line("Lists", "The allowed values behind the dropdowns.");
  line();
  line("Notes").font = { bold: true };
  line("Values only", "Formulas and formatting are not kept. Due on is the release date plus two working days.");
  line("Lead columns", "Columns you added are kept at the right, as values.");
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** The master as bytes: Read Me, the seven tracker sheets, Holidays and Lists, values only, nothing hidden, and the same bytes for the same master and run date. */
export async function buildMaster(schema: Schema, cols: MasterColumns, master: Master, runDate: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Use case tracker";
  wb.lastModifiedBy = "Use case tracker";
  wb.created = new Date(`${runDate}T00:00:00Z`);
  wb.modified = wb.created;
  const lists = enumLists(schema, cols);
  addReadMe(wb, runDate);
  for (const tab of MASTER_TABS) addDataSheet(wb, schema, cols, master, tab, runDate, lists);
  addHolidays(wb, master.holidays);
  addLists(wb, lists.lists);
  return fixedZip(Buffer.from(await wb.xlsx.writeBuffer()));
}
