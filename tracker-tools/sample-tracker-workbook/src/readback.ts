import ExcelJS from "exceljs";

/** Reads a generated workbook back into plain data, so tests can compare layout without opening Excel. */
export type Cell = string | number;
export type Validation = { type: string; formulae: string[]; errorStyle: string; showErrorMessage: boolean };
export type SheetData = {
  name: string;
  state: string;
  tabColor: string;
  /** Cell values by row and column; dates read as `yyyy-mm-dd`, empty cells as `""`, trailing empty rows dropped. */
  rows: Cell[][];
  freeze: { x: number; y: number };
  tables: { name: string; ref: string; filterButtons: boolean }[];
  /** Dropdowns by cell address. */
  validations: Record<string, Validation>;
  widths: number[];
  /** Fill colours of rows 1 and 2 by cell address. */
  fills: Record<string, string>;
  /** Number formats other than General by cell address. */
  formats: Record<string, string>;
  hiddenColumns: number[];
  hiddenRows: number[];
};
export type Book = { sheets: SheetData[]; names: Record<string, string>; created: string; modified: string };

function plain(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "number" ? value : String(value);
}

function readSheet(ws: ExcelJS.Worksheet): SheetData {
  const rows: Cell[][] = [];
  const fills: Record<string, string> = {};
  const formats: Record<string, string> = {};
  const hiddenRows: number[] = [];
  const columns = ws.columnCount;
  ws.eachRow({ includeEmpty: true }, (row, r) => {
    const values: Cell[] = [];
    for (let c = 1; c <= columns; c++) {
      const cell = row.getCell(c);
      values.push(plain(cell.value));
      if (r <= 2 && cell.fill?.type === "pattern") fills[cell.address] = String(cell.fill.fgColor?.argb);
      if (cell.numFmt && cell.numFmt !== "General") formats[cell.address] = cell.numFmt;
    }
    rows.push(values);
    if (row.hidden) hiddenRows.push(r);
  });
  while (rows.length > 0 && rows.at(-1)!.every((v) => v === "")) rows.pop();

  const validations: Record<string, Validation> = {};
  const model = ws.dataValidations.model as Record<string, ExcelJS.DataValidation>;
  for (const [address, v] of Object.entries(model)) {
    validations[address] = { type: v.type, formulae: v.formulae as string[], errorStyle: String(v.errorStyle), showErrorMessage: Boolean(v.showErrorMessage) };
  }
  const view = (ws.views ?? [])[0] as { xSplit?: number; ySplit?: number } | undefined;
  const widths: number[] = [];
  const hiddenColumns: number[] = [];
  for (let c = 1; c <= columns; c++) {
    widths.push(ws.getColumn(c).width ?? 0);
    if (ws.getColumn(c).hidden) hiddenColumns.push(c);
  }
  return {
    name: ws.name,
    state: ws.state,
    tabColor: ws.properties.tabColor?.argb ?? "",
    rows,
    freeze: { x: view?.xSplit ?? 0, y: view?.ySplit ?? 0 },
    tables: ws.getTables().map((t) => {
      const model = t.model as { name: string; tableRef: string; columns: { filterButton?: boolean }[] };
      return { name: model.name, ref: model.tableRef, filterButtons: model.columns.every((c) => c.filterButton === true) };
    }),
    validations,
    widths,
    fills,
    formats,
    hiddenColumns,
    hiddenRows,
  };
}

export async function readWorkbook(path: string): Promise<Book> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const names: Record<string, string> = {};
  for (const { name, ranges } of wb.definedNames.model as { name: string; ranges: string[] }[]) names[name] = ranges[0]!;
  return { sheets: wb.worksheets.map(readSheet), names, created: wb.created.toISOString(), modified: wb.modified.toISOString() };
}
