import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { valueProblem } from "../../vendor-workbook-updater/src/apply.ts";
import type { WorkbookData } from "../../vendor-workbook-updater/src/workbook_read.ts";
import { keyOf, VENDOR_TABS, type Columns } from "../../vendor-workbook-updater/src/columns.ts";
import type { Master } from "./master_read.ts";
import { norm } from "./values.ts";

/** A question in one of these statuses has been settled by the lead, so a vendor's changed answer is not copied. */
export const RESOLVED = ["accepted", "incorporated", "closed", "withdrawn", "superseded"];

export type Synced = { tab: string; reference: string; column: string; old: string; new: string; kind: "copy" | "update" };
export type SyncConflict = { tab: string; reference: string; line: number; reason: string };
export type SyncResult = { vendor: string; synced: Synced[]; conflicts: SyncConflict[] };

/**
 * Copies the vendor-owned columns of one vendor's downloaded workbook into the master row of the same reference, and nothing else.
 * A row with any problem is left alone as a whole and listed; a row with no master row is left to the vendor rebuild, which holds it.
 */
export function syncVendor(schema: Schema, columns: Columns, master: Master, vendor: string, data: WorkbookData, runDate: string): SyncResult {
  const result: SyncResult = { vendor, synced: [], conflicts: [] };
  for (const tab of VENDOR_TABS) {
    const owned = columns[tab]!.filter((c) => c.edited);
    for (const { row, line } of data[tab]!) {
      const reference = row[keyOf(tab)]!;
      const target = master.tables[tab]!.rows.find((m) => m[keyOf(tab)] === reference);
      if (target === undefined) continue;
      const causes: string[] = [];
      if (target.vendor!.trim() !== vendor) causes.push("the master row belongs to another vendor");
      if (tab === "Questions" && target.released_on === "") causes.push("the master question is unreleased");
      const copies: Synced[] = [];
      if (causes.length === 0) {
        for (const c of owned) {
          const [from, to] = [norm(row[c.column]!), norm(target[c.column]!)];
          if (from === to) continue;
          const problem = from === "" ? "would blank a filled master cell" : valueProblem(getTab(schema, tab).columns.find((x) => x.column === c.column)!, from);
          if (problem !== undefined) causes.push(`${c.column} ${problem}`);
          else if (to !== "" && tab === "Questions" && RESOLVED.includes(target.status!)) causes.push(`${c.column} differs from the master on a question already ${target.status}`);
          else copies.push({ tab, reference, column: c.column, old: target[c.column]!, new: from, kind: to === "" ? "copy" : "update" });
        }
      }
      if (causes.length > 0) {
        result.conflicts.push({ tab, reference, line, reason: causes.join("; ") });
        continue;
      }
      for (const c of copies) target[c.column] = c.new;
      if (copies.length > 0) target.last_updated = runDate;
      result.synced.push(...copies);
    }
  }
  return result;
}
