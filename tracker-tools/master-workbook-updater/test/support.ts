import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { formatCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { loadSchema, type Schema } from "../../tracker-tables/src/schema.ts";
import { baseExport } from "../../tracker-reconciler/test/fixtures.ts";
import { writeExport } from "../../tracker-reconciler/test/support.ts";
import { contentHeader, fullHeader, label, loadHeadings } from "../../review-csv-exporter/src/headings.ts";
import { digestOf } from "../../review-csv-exporter/src/rows.ts";
import { reviewFile } from "../../review-csv-exporter/src/review.ts";
import { loadColumns } from "../../vendor-workbook-updater/src/columns.ts";
import { buildVendorWorkbook } from "../../vendor-workbook-updater/src/workbook_write.ts";
import { reviewCells, type RV, type World } from "../../vendor-workbook-updater/test/support.ts";
import { run } from "../src/cli.ts";
import { loadMasterColumns, type MasterColumns } from "../src/master_columns.ts";
import { readMaster, type Master } from "../src/master_read.ts";

export { baseExport, type RV };
export type RVP = RV & { proposals?: string };

export const schemaPath = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
export const headingsPath = fileURLToPath(new URL("../../review-csv-exporter/data/review-headings.csv", import.meta.url));
export const columnsPath = fileURLToPath(new URL("../../sample-tracker-workbook/data/headings.csv", import.meta.url));
export const editedPath = fileURLToPath(new URL("../../vendor-workbook-updater/data/vendor-edited.csv", import.meta.url));
export const RUN_DATE = "2026-11-20";

export type Lib = World & { master: MasterColumns };
let cached: Promise<Lib> | undefined;
/** The schema, review headings, vendor columns and master columns. */
export function lib(): Promise<Lib> {
  cached ??= (async () => {
    const schema: Schema = await loadSchema(schemaPath);
    const problems: string[] = [];
    const headings = (await loadHeadings(headingsPath, schema, problems))!;
    const columns = (await loadColumns(columnsPath, editedPath, schema, problems))!;
    const master = (await loadMasterColumns(columnsPath, schema, problems))!;
    if (problems.length > 0) throw new Error(problems.join("\n"));
    return { schema, headings, columns, master };
  })();
  return cached;
}

export type Outcome = { status: number; stdout: string; stderr: string };

export async function cli(...args: string[]): Promise<Outcome> {
  let stdout = "";
  let stderr = "";
  const status = await run(args, { out: (t) => (stdout += t), err: (t) => (stderr += t), today: () => RUN_DATE });
  return { status, stdout, stderr };
}

export type Env = { root: string; exportDir: string; master: string; reviews: string; out: string; report: string; vendorOut: string };

/** A folder with a tracker export, the master bootstrapped from it, and room for reviews, downloads and outputs. */
export async function setup(data: Record<string, Row[]> = baseExport(), extra: string[] = []): Promise<Env> {
  const root = await mkdtemp(join(tmpdir(), "master-updater-"));
  const env: Env = { root, exportDir: join(root, "export"), master: join(root, "master.xlsx"), reviews: join(root, "reviews"), out: join(root, "out", "master.xlsx"), report: join(root, "out", "report.md"), vendorOut: join(root, "out", "vendors") };
  await writeExport(env.exportDir, data, undefined, extra);
  const boot = await cli("update-master-workbook", "--from-export", env.exportDir, "--out", env.master, "--report", join(root, "boot.md"));
  if (boot.status !== 0) throw new Error(`bootstrap failed: ${boot.stderr}`);
  return env;
}

const TABS = ["Use Cases", "Questions", "Identity & Access", "Mappings"];

/** Writes the four review files with the digests the exporter would compute; `proposals` fills the proposals cell. */
export async function reviews(env: Env, rvs: RVP[]): Promise<void> {
  const w = await lib();
  const h = w.headings;
  await mkdir(env.reviews, { recursive: true });
  for (const tab of TABS) {
    const rows = rvs.filter((r) => r.tab === tab).map((rv, i) => {
      const cells = reviewCells(w, { ...rv, digest: "x" }, i + 1);
      cells[label(h, "proposals")] = rv.proposals ?? "";
      if (rv.digest === undefined) cells[label(h, "content_digest")] = digestOf(contentHeader(h, tab), cells);
      else cells[label(h, "content_digest")] = rv.digest;
      return cells;
    });
    await writeFile(join(env.reviews, reviewFile(tab)), formatCsv(fullHeader(h, tab), rows));
  }
}

/** A vendor's downloaded workbook, written from the rows given by tab (the vendor-visible columns only). */
export async function download(env: Env, file: string, vendor: string, rows: Record<string, Row[]>): Promise<string> {
  const w = await lib();
  const full = Object.fromEntries(Object.entries(w.columns).map(([tab, cols]) => [tab, (rows[tab] ?? []).map((r) => Object.fromEntries(cols.map((c) => [c.column, r[c.column] ?? ""])))]));
  const path = join(env.root, file);
  await writeFile(path, await buildVendorWorkbook(w.schema, w.columns, full, vendor, "2026-11-01"));
  return path;
}

/** The released rows of a vendor in the base export, by vendor tab. */
export function vendorRows(vendor: string, data: Record<string, Row[]> = baseExport()): Record<string, Row[]> {
  const mine = (tab: string, filter: (r: Row) => boolean = () => true): Row[] => data[tab]!.filter((r) => r.vendor === vendor && filter(r));
  return { "Use Cases": mine("Use Cases"), Questions: mine("Questions", (r) => (r.released_on ?? "") !== ""), "Identity & Access": mine("Identity & Access") };
}

export function update(env: Env, ...more: string[]): Promise<Outcome> {
  return cli("update-master-workbook", "--master", env.master, "--out", env.out, "--report", env.report, ...more);
}

/** Runs the update and requires success. */
export async function ok(env: Env, ...more: string[]): Promise<Outcome> {
  const outcome = await update(env, ...more);
  if (outcome.status !== 0) throw new Error(`exit ${outcome.status}: ${outcome.stderr}`);
  return outcome;
}

/** A master workbook read back with the tool's own reader. */
export async function readBack(path: string): Promise<Master> {
  const w = await lib();
  const problems: string[] = [];
  const master = await readMaster(path, w.master, w.schema, problems);
  if (!master) throw new Error(problems.join("\n"));
  return master;
}

export const rowsOf = async (path: string, tab: string): Promise<Row[]> => (await readBack(path)).tables[tab]!.rows;
export const rowOf = async (path: string, tab: string, key: string, ref: string): Promise<Row> => (await rowsOf(path, tab)).find((r) => r[key] === ref)!;
export const textOf = (path: string): Promise<string> => readFile(path, "utf8");
export const listFiles = async (dir: string): Promise<string[]> => (await readdir(dir, { recursive: true })).sort();

/** Opens the master, lets the test change it, and writes it back in place. */
export async function editMaster(env: Env, edit: (wb: ExcelJS.Workbook) => void): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(env.master);
  edit(wb);
  await wb.xlsx.writeFile(env.master);
}

/** Sets the cell under `header` in the row whose first cell is `ref`; `value` null clears it. */
export function setCell(wb: ExcelJS.Workbook, sheet: string, ref: string, header: string, value: ExcelJS.CellValue): void {
  const ws = wb.getWorksheet(sheet)!;
  let column = 0;
  ws.getRow(2).eachCell((cell, index) => {
    if (cell.text === header) column = index;
  });
  for (let r = 3; r <= ws.rowCount; r++) {
    if (ws.getRow(r).getCell(1).text === ref) ws.getRow(r).getCell(column).value = value;
  }
}

/** The sheets of a workbook with their state and header texts of row 2. */
export async function sheetsOf(path: string): Promise<{ name: string; state: string; header: string[] }[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  return wb.worksheets.map((ws) => ({ name: ws.name, state: ws.state, header: ((ws.getRow(2).values as ExcelJS.CellValue[]) ?? []).slice(1).map(String) }));
}
