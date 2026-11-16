import ExcelJS from "exceljs";
import type { Row } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { COLOURS, columnWidth, DATE_FORMAT, frozenColumns, HEADER_ROWS, SPARE_ROWS } from "../../sample-tracker-workbook/src/layout.ts";
import { fixedZip } from "./archive.ts";
import { sheetOf, VENDOR_TABS, type Columns } from "./columns.ts";

/** Header colour of the columns the vendor fills in; the read-only columns keep the sample's vendor blue. */
const EDITED_HEADER = "FFC55A11";
const solid = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
}

function cellValue(value: string, isDate: boolean): ExcelJS.CellValue {
  if (value === "") return null;
  return isDate && isIsoDate(value) ? new Date(`${value}T00:00:00Z`) : value;
}

async function addDataSheet(wb: ExcelJS.Workbook, schema: Schema, columns: Columns, tab: string, rows: Row[], enums: Set<string>): Promise<void> {
  const name = sheetOf(tab);
  const cols = columns[tab]!;
  const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: COLOURS.mixedTab } } });
  const dates = new Set(getTab(schema, tab).columns.filter((c) => c.type === "date").map((c) => c.column));
  const values = rows.map((row) => cols.map((c) => cellValue(row[c.column]!, dates.has(c.column))));
  ws.addTable({
    name: `tbl${name.replace(/[^A-Za-z0-9]/g, "")}`,
    ref: `A${HEADER_ROWS}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleLight1", showRowStripes: true },
    columns: cols.map((c) => ({ name: c.heading, filterButton: true })),
    rows: values.length > 0 ? values : [cols.map(() => null)],
  });

  let group = -1;
  let previousBand = "";
  cols.forEach((c, i) => {
    if (c.band !== previousBand) group++;
    const band = ws.getCell(1, i + 1);
    band.fill = solid(COLOURS.bands[group % 2]!);
    band.font = { bold: true };
    if (c.band !== previousBand) band.value = c.band;
    previousBand = c.band;

    const header = ws.getCell(2, i + 1);
    header.fill = solid(c.edited ? EDITED_HEADER : COLOURS.vendorHeader);
    header.font = { bold: true, color: { argb: COLOURS.white } };
    header.alignment = { vertical: "middle", wrapText: true };

    ws.getColumn(i + 1).width = columnWidth(c.heading, rows.map((r) => r[c.column]!));
    const last = HEADER_ROWS + Math.max(rows.length, 1);
    for (let r = HEADER_ROWS + 1; r <= last; r++) {
      const cell = ws.getCell(r, i + 1);
      cell.alignment = { vertical: "top", wrapText: true };
      if (dates.has(c.column)) cell.numFmt = DATE_FORMAT;
      if (c.edited) cell.protection = { locked: false };
    }
    if (enums.has(c.column)) {
      for (let r = HEADER_ROWS + 1; r <= last + SPARE_ROWS; r++) {
        ws.getCell(r, i + 1).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [c.column],
          showErrorMessage: true,
          errorStyle: "stop",
          errorTitle: "Not in the list",
          error: `Pick one of the values in the ${c.column} list on the Lists sheet.`,
        };
      }
    }
  });
  const x = frozenColumns(name);
  ws.views = [{ state: "frozen", xSplit: x, ySplit: HEADER_ROWS, topLeftCell: `${columnLetter(x)}${HEADER_ROWS + 1}`, activeCell: `${columnLetter(x)}${HEADER_ROWS + 1}` }];
  // No password: a password adds a random salt, which would make the bytes differ from run to run. This is a guard against slips, not security.
  await ws.protect("", { selectLockedCells: true, selectUnlockedCells: true, autoFilter: true, formatColumns: true, formatRows: true });
}

function addLists(wb: ExcelJS.Workbook, lists: { name: string; values: string[] }[]): void {
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

function addReadMe(wb: ExcelJS.Workbook, vendor: string, runDate: string): void {
  const ws = wb.addWorksheet("Read Me", { properties: { tabColor: { argb: COLOURS.referenceTab } } });
  [24, 70].forEach((width, i) => (ws.getColumn(i + 1).width = width));
  const line = (...cells: string[]) => ws.addRow(cells);
  line("Use case tracker").font = { bold: true, size: 16 };
  line(`Prepared for ${vendor}. Updated ${runDate}.`);
  line();
  line("Sheets").font = { bold: true };
  for (const tab of VENDOR_TABS) line(sheetOf(tab), { "Use Cases": "One row per use case, with its specification and acknowledgement.", Questions: "One row per question, with its due date and your answer.", "Identity & Access": "One row per access request, with its status and your actions." }[tab]!);
  line("Lists", "The allowed values behind the dropdowns.");
  line();
  line("Colour key").font = { bold: true };
  line("Blue column header", "Filled in by us. Locked.");
  line("Orange column header", "Filled in by you. Open for editing.");
  line("Row 1 band", "Groups related columns. Row 2 is the table header with filters.");
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** The vendor-safe workbook as bytes: Read Me, the three vendor sheets and Lists, nothing hidden, and the same bytes for the same rows and run date. */
export async function buildVendorWorkbook(schema: Schema, columns: Columns, rows: Record<string, Row[]>, vendor: string, runDate: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Use case tracker";
  wb.lastModifiedBy = "Use case tracker";
  wb.created = new Date(`${runDate}T00:00:00Z`);
  wb.modified = wb.created;
  const lists: { name: string; values: string[] }[] = [];
  for (const tab of VENDOR_TABS) {
    for (const c of columns[tab]!.filter((x) => x.type === "enum")) {
      if (!lists.some((l) => l.name === c.column)) lists.push({ name: c.column, values: c.allowed });
    }
  }
  addReadMe(wb, vendor, runDate);
  for (const tab of VENDOR_TABS) await addDataSheet(wb, schema, columns, tab, rows[tab]!, new Set(lists.map((l) => l.name)));
  addLists(wb, lists);
  return fixedZip(Buffer.from(await wb.xlsx.writeBuffer()));
}
