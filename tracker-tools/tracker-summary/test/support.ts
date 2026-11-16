import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { getTab, loadSchema, tabFileName, type Schema } from "../../tracker-tables/src/schema.ts";
import { run } from "../src/cli.ts";

export const schemaPath = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
export const DATE = "2026-11-16";

let schemaCache: Promise<Schema> | undefined;
export function schema(): Promise<Schema> {
  return (schemaCache ??= loadSchema(schemaPath));
}

export async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "summary-"));
}

export type Export = Record<string, Row[]>;

/** Writes `manifest.csv` and one CSV per given tab with every schema column, minus any column named in `drop`. */
export async function writeExport(dir: string, data: Export, drop: Record<string, string[]> = {}): Promise<void> {
  const s = await schema();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.csv"), formatCsv(["scope", "workbook", "exported_at", "exported_by"], [{ scope: "internal", workbook: "master.xlsx", exported_at: "2026-11-15", exported_by: "lead-a" }]));
  for (const [tab, rows] of Object.entries(data)) {
    const header = getTab(s, tab).columns.map((c) => c.column).filter((c) => !(drop[tab] ?? []).includes(c));
    await writeFile(join(dir, tabFileName(tab)), formatCsv(header, rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] ?? ""])))));
  }
}

export type Outcome = { status: number; stdout: string; stderr: string; summary: string };

/** Runs the command in process against `exportDir`, writing to `out`, and returns the exit status, messages and file text. */
export async function summarize(exportDir: string, out: string, extra: string[] = ["--date", DATE], today?: () => string): Promise<Outcome> {
  let stdout = "";
  let stderr = "";
  const status = await run(["--export", exportDir, "--out", out, ...extra], { out: (t) => (stdout += t), err: (t) => (stderr += t) }, today);
  return { status, stdout, stderr, summary: await readFile(out, "utf8").catch(() => "") };
}

/** Writes the given export to a new temporary directory and returns it with an output path. */
export async function fixture(data: Export, drop: Record<string, string[]> = {}): Promise<{ dir: string; exportDir: string; out: string }> {
  const dir = await tmp();
  const exportDir = join(dir, "export");
  await writeExport(exportDir, data, drop);
  return { dir, exportDir, out: join(dir, "summary.md") };
}

/** The text of one numbered section, up to the next one. */
export function section(summary: string, title: string): string {
  const start = summary.indexOf(`## ${title}\n`);
  if (start < 0) return "";
  const rest = summary.slice(start);
  const next = rest.search(/\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

export async function snapshot(dir: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of (await readdir(dir, { recursive: true })).sort()) {
    const text = await readFile(join(dir, entry), "utf8").catch(() => undefined);
    if (text !== undefined) result[entry] = text;
  }
  return result;
}
