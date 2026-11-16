import { copyFile, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { formatCsv, parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { loadSchema, type Schema } from "../../tracker-tables/src/schema.ts";
import { baseExport } from "../../tracker-reconciler/test/fixtures.ts";
import { writeExport } from "../../tracker-reconciler/test/support.ts";
import { contentHeader, fieldHeaders, fullHeader, label, loadHeadings, type Headings } from "../../review-csv-exporter/src/headings.ts";
import { digestOf } from "../../review-csv-exporter/src/rows.ts";
import { reviewFile } from "../../review-csv-exporter/src/review.ts";
import { loadColumns, VENDOR_TABS, type Columns } from "../src/columns.ts";
import { run } from "../src/cli.ts";
import { buildVendorWorkbook } from "../src/workbook_write.ts";

import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";

export { baseExport };

/** Use case IDs of the fixtures, from the library's one helper. */
export const DAILY = useCaseId("Acme", "Daily Report")!;
export const NIGHTLY = useCaseId("Beta", "Nightly Sync")!;
export const WEEKLY = useCaseId("Acme", "Weekly Digest")!;

export const schemaPath = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
export const headingsPath = fileURLToPath(new URL("../../review-csv-exporter/data/review-headings.csv", import.meta.url));
export const columnsPath = fileURLToPath(new URL("../../sample-tracker-workbook/data/headings.csv", import.meta.url));
export const editedPath = fileURLToPath(new URL("../data/vendor-edited.csv", import.meta.url));
export const RUN_DATE = "2026-11-20";

export type World = { schema: Schema; headings: Headings; columns: Columns };
const cached = new Map<string, Promise<World>>();
/** The schema, review headings and vendor columns, from the defaults or from the given files. */
export function world(headings = headingsPath, columns = columnsPath): Promise<World> {
  const key = `${headings}|${columns}`;
  if (!cached.has(key)) {
    cached.set(key, (async () => {
      const schema = await loadSchema(schemaPath);
      const problems: string[] = [];
      const h = (await loadHeadings(headings, schema, problems))!;
      const c = (await loadColumns(columns, editedPath, schema, problems))!;
      if (problems.length > 0) throw new Error(problems.join("\n"));
      return { schema, headings: h, columns: c };
    })());
  }
  return cached.get(key)!;
}

/** A review row to write: fields are `[current, proposed, state]` by schema column. */
export type RV = {
  tab: string;
  record?: string;
  key?: string;
  ref?: string;
  useCase?: string;
  status?: string;
  fields?: Record<string, [string, string, string]>;
  conflict?: string;
  other?: string;
  appliedOn?: string;
  changed?: string;
  order?: number;
  /** Replaces the digest the file would carry. */
  digest?: string;
};

/** The CSV row for one review row, with the digest the exporter would compute. */
export function reviewCells(w: World, rv: RV, order: number): Row {
  const h = w.headings;
  const cells: Row = Object.fromEntries(fullHeader(h, rv.tab).map((name) => [name, ""]));
  Object.assign(cells, {
    [label(h, "order")]: String(rv.order ?? order),
    [label(h, "use_case")]: rv.useCase ?? "",
    [label(h, "record")]: rv.record ?? "",
    [label(h, "suggested_ref")]: rv.ref ?? "",
    [label(h, "record_key")]: rv.key ?? (rv.record ? "" : `key-${order}`),
    [label(h, "kind")]: rv.record ? "update" : "add",
    [label(h, "conflict")]: rv.conflict ?? "",
    [label(h, "other_changes")]: rv.other ?? "",
  });
  for (const s of h.shown[rv.tab]!) {
    const [current, proposed, state] = rv.fields?.[s.column] ?? ["", "", ""];
    fieldHeaders(h, s.heading).forEach((name, i) => (cells[name] = [current, proposed, state][i]!));
  }
  cells[label(h, "content_digest")] = rv.digest ?? digestOf(contentHeader(h, rv.tab), cells);
  cells[label(h, "changed_since_review")] = rv.changed ?? "";
  cells[label(h, "review_status")] = rv.status ?? "accepted";
  cells[label(h, "applied_on")] = rv.appliedOn ?? "";
  return cells;
}

/** Writes the four review files; the Mappings file is header-only (and is never read). */
export async function writeReviews(w: World, dir: string, rvs: RV[]): Promise<void> {
  await mkdir(dir, { recursive: true });
  for (const tab of [...VENDOR_TABS, "Mappings"]) {
    const rows = rvs.filter((r) => r.tab === tab).map((r, i) => reviewCells(w, r, i + 1));
    await writeFile(join(dir, reviewFile(tab)), formatCsv(fullHeader(w.headings, tab), rows));
  }
}

export const rowsOf = async (path: string): Promise<Row[]> => parseCsv(await readFile(path, "utf8"), path).rows;
export const textOf = (path: string): Promise<string> => readFile(path, "utf8");

/** The rows a vendor would see as released in the base export, by vendor tab. */
export function acmeRows(): Record<string, Row[]> {
  const data = baseExport();
  const mine = (tab: string, filter: (r: Row) => boolean = () => true): Row[] => data[tab]!.filter((r) => r.vendor === "Acme" && filter(r));
  return { "Use Cases": mine("Use Cases"), Questions: mine("Questions", (r) => (r.released_on ?? "") !== ""), "Identity & Access": mine("Identity & Access") };
}

export type Run = { root: string; workbook: string; reviews: string; exportDir: string; out: string; report: string };

/** A folder with the base export, a downloaded Acme workbook and the given review rows. */
export async function setup(rvs: RV[], rows: Record<string, Row[]> = acmeRows(), data: Record<string, Row[]> = baseExport(), w?: World): Promise<Run> {
  w ??= await world();
  const root = await mkdtemp(join(tmpdir(), "vendor-updater-"));
  const f: Run = { root, workbook: join(root, "downloaded.xlsx"), reviews: join(root, "reviews"), exportDir: join(root, "export"), out: join(root, "out", "updated.xlsx"), report: join(root, "out", "report.md") };
  await writeExport(f.exportDir, data);
  const full = Object.fromEntries(VENDOR_TABS.map((tab) => [tab, rows[tab]!.map((r) => Object.fromEntries(w.columns[tab]!.map((c) => [c.column, r[c.column] ?? ""])))]));
  await writeFile(f.workbook, await buildVendorWorkbook(w.schema, w.columns, full, "Acme", "2026-11-01"));
  await writeReviews(w, f.reviews, rvs);
  return f;
}

export type Outcome = { status: number; stdout: string; stderr: string };

export async function cli(...args: string[]): Promise<Outcome> {
  let stdout = "";
  let stderr = "";
  const status = await run(args, { out: (t) => (stdout += t), err: (t) => (stderr += t), today: () => RUN_DATE });
  return { status, stdout, stderr };
}

export function update(f: Run, ...more: string[]): Promise<Outcome> {
  return cli("update-vendor-workbook", "--workbook", f.workbook, "--reviews", f.reviews, "--export", f.exportDir, "--vendor", "Acme", "--out", f.out, "--report", f.report, ...more);
}

/** Runs the update and requires success. */
export async function ok(f: Run, ...more: string[]): Promise<Outcome> {
  const outcome = await update(f, ...more);
  if (outcome.status !== 0) throw new Error(`exit ${outcome.status}: ${outcome.stderr}`);
  return outcome;
}

export const RELEASE = ["--release-batch", "BT-009", "--release-date", "2026-11-18"];

/** The cell values of a sheet as strings (dates as `YYYY-MM-DD`), by header text then row. */
export async function sheetRows(path: string, sheet: string): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.getWorksheet(sheet)!;
  const header = (ws.getRow(2).values as ExcelJS.CellValue[]).slice(1).map(String);
  const out: Record<string, string>[] = [];
  for (let r = 3; r <= ws.rowCount; r++) {
    const values = header.map((_, c) => {
      const v = ws.getRow(r).getCell(c + 1).value;
      return v instanceof Date ? v.toISOString().slice(0, 10) : v === null ? "" : String(v);
    });
    if (values.some((v) => v !== "")) out.push(Object.fromEntries(header.map((h, c) => [h, values[c]!])));
  }
  return out;
}

export async function listFiles(dir: string): Promise<string[]> {
  return (await readdir(dir, { recursive: true })).sort();
}

export { copyFile };

/** The entry names of a zip, from its central directory. */
export function zipNames(zip: Buffer): string[] {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const names: string[] = [];
  let p = zip.readUInt32LE(end + 16);
  for (let i = 0; i < zip.readUInt16LE(end + 10); i++) {
    names.push(zip.toString("utf8", p + 46, p + 46 + zip.readUInt16LE(p + 28)));
    p += 46 + zip.readUInt16LE(p + 28) + zip.readUInt16LE(p + 30) + zip.readUInt16LE(p + 32);
  }
  return names;
}
