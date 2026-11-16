import { joinList, splitList, type Row, type Table } from "./csv.ts";
import { isReference, type Column, type Schema } from "./schema.ts";

function cell(row: Row, column: string): string {
  return row[column] ?? "";
}

function ownedAndReleased(table: Table, row: Row, vendor: string, columns: Column[]): boolean {
  if (!table.header.includes("vendor") || cell(row, "vendor").trim() !== vendor) return false;
  const needsRelease = columns.some((c) => c.column === "released_on");
  return !needsRelease || (table.header.includes("released_on") && cell(row, "released_on") !== "");
}

export function vendorView(schema: Schema, tables: Record<string, Table>, vendor: string): Record<string, Table> {
  if (vendor.trim() === "") throw new Error("vendor must not be empty");
  const picked: { tab: string; table: Table; columns: Column[]; rows: Row[] }[] = [];
  const visibleKeys = new Set<string>();

  for (const { tab, columns } of schema.tabs) {
    const table = tables[tab];
    const vendorColumns = columns.filter((c) => c.visibility === "vendor");
    if (!table || vendorColumns.length === 0) continue;
    const rows = table.rows.filter((row) => ownedAndReleased(table, row, vendor, vendorColumns));
    for (const key of vendorColumns.filter((c) => c.key && c.type === "ref")) {
      rows.forEach((row) => visibleKeys.add(cell(row, key.column)));
    }
    picked.push({ tab, table, columns: vendorColumns, rows });
  }

  const view: Record<string, Table> = {};
  for (const { tab, table, columns, rows } of picked) {
    view[tab] = {
      file: table.file,
      header: columns.map((c) => c.column),
      rows: rows.map((row) =>
        Object.fromEntries(
          columns.map((c) => {
            const value = cell(row, c.column);
            if (c.type === "ref") return [c.column, visibleKeys.has(value) ? value : ""];
            if (c.type === "list") {
              return [c.column, joinList(splitList(value).filter((v) => !isReference(v) || visibleKeys.has(v)))];
            }
            return [c.column, value];
          }),
        ),
      ),
    };
  }
  return view;
}
