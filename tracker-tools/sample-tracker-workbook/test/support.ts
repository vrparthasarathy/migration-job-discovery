import { spawnSync } from "node:child_process";
import { cp, mkdtemp } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { formatCsv, parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { buildWorkbook, saveWorkbook } from "../src/workbook.ts";
import { loadSampleData, SampleDataError, type SampleData } from "../src/sample_data.ts";
import { readWorkbook, type Book, type SheetData } from "../src/readback.ts";

export const COMPONENT = join(import.meta.dirname, "..");
export const DATA = join(COMPONENT, "data");
export const SCHEMA = join(COMPONENT, "..", "..", "tracker-data-contract", "tracker-schema.csv");
export const AS_OF = "2026-11-16";
export const SHEETS = ["Read Me", "Use Cases", "Questions", "Identity & Access", "Workflow Mappings", "Proposed Changes", "Trace", "Lists"];

export async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "swb-"));
}

export function generate(args: string[]) {
  return spawnSync(process.execPath, [join(COMPONENT, "src", "main.ts"), "generate", ...args], { encoding: "utf8" });
}

/** A copy of the data folder in a fresh temporary directory, with one CSV optionally edited. */
export async function dataCopy(file?: string, mutate?: (rows: Row[]) => void): Promise<string> {
  const dir = join(await tempDir(), "data");
  await cp(DATA, dir, { recursive: true });
  if (file && mutate) {
    const path = join(dir, file);
    const table = parseCsv(await readFile(path, "utf8"), file);
    mutate(table.rows);
    await writeFile(path, formatCsv(table.header, table.rows));
  }
  return dir;
}

/** Loads the sample data from an edited copy and returns the findings the load reported. */
export async function findingsFor(file: string, mutate: (rows: Row[]) => void): Promise<string[]> {
  const dir = await dataCopy(file, mutate);
  try {
    await loadSampleData(dir, SCHEMA);
  } catch (error) {
    if (error instanceof SampleDataError) return error.findings;
    throw error;
  }
  return [];
}

export async function realData(): Promise<SampleData> {
  return loadSampleData(DATA, SCHEMA);
}

let cached: Promise<Book> | undefined;
/** The workbook built from the real data at the as-of date, read back. */
export function generatedBook(): Promise<Book> {
  cached ??= (async () => {
    const file = join(await tempDir(), "sample.xlsx");
    await saveWorkbook(buildWorkbook(await realData(), AS_OF), file);
    return readWorkbook(file);
  })();
  return cached;
}

export function sheetOf(book: Book, name: string): SheetData {
  const found = book.sheets.find((s) => s.name === name);
  if (!found) throw new Error(`no sheet ${name}`);
  return found;
}

/** The main-sheet rows as heading-to-value records (row 2 is the header, row 1 the band). */
export function records(sheet: SheetData): Record<string, string | number>[] {
  const header = sheet.rows[1]!;
  return sheet.rows.slice(2).map((row) => Object.fromEntries(header.map((h, i) => [String(h), row[i] ?? ""])));
}

export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
}
