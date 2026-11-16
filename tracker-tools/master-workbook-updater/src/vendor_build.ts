import type { Row, Table } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { vendorView } from "../../tracker-tables/src/vendor_view.ts";
import { keyOf, VENDOR_TABS, type Columns } from "../../vendor-workbook-updater/src/columns.ts";
import type { WorkbookData } from "../../vendor-workbook-updater/src/workbook_read.ts";
import { buildVendorWorkbook } from "../../vendor-workbook-updater/src/workbook_write.ts";
import type { Master } from "./master_read.ts";

export type HeldRow = { tab: string; reference: string; line: number; values: string[] };
export type Added = { tab: string; reference: string };
export type VendorOutcome = {
  vendor: string;
  /** The workbook, or undefined when it is held because a row of the vendor's download has no row in the rebuilt view. */
  bytes: Buffer | undefined;
  held: HeldRow[];
  added: Added[];
};

/**
 * Rebuilds one vendor's workbook from the new master with the vendor view, so it holds only that vendor's released rows and vendor-visible columns.
 * `download` is the vendor's own workbook, when there is one: its rows missing from the view hold the rebuild, and the view's rows missing from it are listed as added.
 */
export async function buildVendor(schema: Schema, columns: Columns, master: Master, vendor: string, download: WorkbookData | undefined, runDate: string): Promise<VendorOutcome> {
  const tables: Record<string, Table> = Object.fromEntries(
    Object.values(master.tables).map((t) => [t.tab, { file: t.file, header: getTab(schema, t.tab).columns.map((c) => c.column), rows: t.rows }]),
  );
  const view = vendorView(schema, tables, vendor);
  const held: HeldRow[] = [];
  const added: Added[] = [];
  const rows: Record<string, Row[]> = {};
  for (const tab of VENDOR_TABS) {
    const key = keyOf(tab);
    rows[tab] = view[tab]!.rows;
    const shown = new Set(rows[tab]!.map((r) => r[key]!));
    const had = new Set((download?.[tab] ?? []).map((w) => w.row[key]!));
    for (const { row, line } of download?.[tab] ?? []) {
      if (shown.has(row[key]!)) continue;
      const values = columns[tab]!.filter((c) => c.edited && row[c.column] !== "").map((c) => `${c.column}: ${row[c.column]}`);
      held.push({ tab, reference: row[key]!, line, values });
    }
    if (download) for (const r of rows[tab]!) if (!had.has(r[key]!)) added.push({ tab, reference: r[key]! });
  }
  if (held.length > 0) return { vendor, bytes: undefined, held, added: [] };
  return { vendor, bytes: await buildVendorWorkbook(schema, columns, rows, vendor, runDate), held, added };
}
