import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run as reconciler } from "../tracker-tools/tracker-reconciler/src/cli.ts";
import { run as summarizer } from "../tracker-tools/tracker-summary/src/cli.ts";
import { formatCsv, parseCsv, type Row } from "../tracker-tools/tracker-tables/src/csv.ts";
import { getTab, loadSchema, tabFileName, type Schema } from "../tracker-tools/tracker-tables/src/schema.ts";

/** The project root, the real schema and the real example proposal, found by relative path. */
export const root = fileURLToPath(new URL("../", import.meta.url));
export const schemaPath = join(root, "tracker-data-contract", "tracker-schema.csv");
export const examplePath = join(root, "tracker-update-proposer", "propose-tracker-updates", "tracker-updates.csv");

export const PROPOSAL_HEADER = ["update_id", "proposal_id", "tab", "operation", "record_key", "field", "value", "base_value", "source", "reason", "created_on", "author"];
export const MANIFEST: Row[] = [{ scope: "internal", workbook: "master.xlsx", exported_at: "2026-11-20", exported_by: "lead-a" }];

let schemaCache: Promise<Schema> | undefined;
export function schema(): Promise<Schema> {
  return (schemaCache ??= loadSchema(schemaPath));
}

export type Export = Record<string, Row[]>;
export type Workspace = { dir: string; exportDir: string; proposals: string; out: string; summary: string };

/** A new real temporary directory with the usual sub-paths (nothing is created inside it yet). */
export async function workspace(): Promise<Workspace> {
  const dir = await mkdtemp(join(tmpdir(), "root-test-"));
  return { dir, exportDir: join(dir, "export"), proposals: join(dir, "proposals"), out: join(dir, "out"), summary: join(dir, "summary.md") };
}

/** Writes `manifest.csv` and one CSV per given tab with every schema column. */
export async function writeExport(dir: string, data: Export, manifest: Row[] = MANIFEST): Promise<void> {
  const s = await schema();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.csv"), formatCsv(["scope", "workbook", "exported_at", "exported_by"], manifest));
  for (const [tab, rows] of Object.entries(data)) {
    const header = getTab(s, tab).columns.map((c) => c.column);
    await writeFile(join(dir, tabFileName(tab)), formatCsv(header, rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] ?? ""])))));
  }
}

export type PRow = { tab: string; op: string; key: string; field: string; value?: string; base?: string; reason?: string };

/** Writes `<root>/<id>/tracker-updates.csv` in the shared long format and returns its path. */
export async function writeProposal(proposals: string, id: string, rows: PRow[]): Promise<string> {
  const dir = join(proposals, id);
  await mkdir(dir, { recursive: true });
  const file = join(dir, "tracker-updates.csv");
  await writeFile(
    file,
    formatCsv(
      PROPOSAL_HEADER,
      rows.map((r) => ({
        update_id: `${id}:${r.tab}:${r.key}:${r.field}`,
        proposal_id: id,
        tab: r.tab,
        operation: r.op,
        record_key: r.key,
        field: r.field,
        value: r.value ?? "",
        base_value: r.base ?? "",
        source: "specs/spec.md@v2#anchor",
        reason: r.reason ?? "reason",
        created_on: "2026-11-18",
        author: "propose-tracker-updates",
      })),
    ),
  );
  return file;
}

export type Outcome = { status: number; stdout: string; stderr: string };

export async function reconcile(w: Workspace, ...more: string[]): Promise<Outcome> {
  return capture((io) => reconciler(["reconcile", "--export", w.exportDir, "--proposals", w.proposals, "--out", w.out, ...more], io));
}

export async function validate(path: string): Promise<Outcome> {
  return capture((io) => reconciler(["validate", path], io));
}

export async function summarize(w: Workspace, date = "2026-11-16"): Promise<Outcome> {
  return capture((io) => summarizer(["--export", w.exportDir, "--date", date, "--out", w.summary], io));
}

async function capture(go: (io: { out: (t: string) => void; err: (t: string) => void }) => Promise<number>): Promise<Outcome> {
  let stdout = "";
  let stderr = "";
  const status = await go({ out: (t) => (stdout += t), err: (t) => (stderr += t) });
  return { status, stdout, stderr };
}

function missing(error: unknown): boolean {
  return (error as { code?: string }).code === "ENOENT";
}

/** The rows of a CSV file, or none when the file does not exist; any other problem is thrown. */
export async function rows(path: string): Promise<Row[]> {
  try {
    return parseCsv(await readFile(path, "utf8"), path).rows;
  } catch (error) {
    if (missing(error)) return [];
    throw error;
  }
}

/** The text of a file, or an empty string when the file does not exist; any other problem is thrown. */
export async function text(path: string): Promise<string> {
  return readFile(path, "utf8").catch((error) => {
    if (missing(error)) return "";
    throw error;
  });
}

/** Every file under `dir` (relative path to content), sorted, or nothing when the folder is absent. */
export async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  for (const entry of entries.filter((e) => e.isFile()).sort((a, b) => join(a.parentPath, a.name).localeCompare(join(b.parentPath, b.name)))) {
    const path = join(entry.parentPath, entry.name);
    out[path.slice(dir.length + 1)] = await readFile(path, "utf8");
  }
  return out;
}

export async function put(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
