import ExcelJS from "exceljs";

/** The text of a cell, trimmed, with a date as `YYYY-MM-DD`, a formula as its result and a hyperlink as its text; undefined for an error cell. */
export function cellText(cell: ExcelJS.Cell): string | undefined {
  const value = cell.value;
  const result = value !== null && typeof value === "object" && "result" in value ? value.result : value;
  if (result instanceof Date) return result.toISOString().slice(0, 10);
  if (cell.type === ExcelJS.ValueType.Error || (result !== null && typeof result === "object" && "error" in result)) return undefined;
  return cell.text.trim();
}

/** True when the cell holds a formula. */
export function isFormula(cell: ExcelJS.Cell): boolean {
  return cell.type === ExcelJS.ValueType.Formula;
}

/** The header row is the first of rows 1 and 2 that holds one of the key names, as a sample heading or a schema column name. */
export function headerRow(ws: ExcelJS.Worksheet, keys: string[]): number | undefined {
  return [1, 2].find((r) => {
    let found = false;
    ws.getRow(r).eachCell((cell) => {
      if (keys.includes(cell.text.trim())) found = true;
    });
    return found;
  });
}
