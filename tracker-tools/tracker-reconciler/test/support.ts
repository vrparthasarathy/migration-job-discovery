import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatCsv, parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { getTab, loadSchema, tabFileName, type Schema } from "../../tracker-tables/src/schema.ts";
import { run } from "../src/cli.ts";

export const schemaPath = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));
export const examplePath = fileURLToPath(new URL("../../../tracker-update-proposer/propose-tracker-updates/tracker-updates.csv", import.meta.url));

export const PROPOSAL_HEADER = ["update_id", "proposal_id", "tab", "operation", "record_key", "field", "value", "base_value", "source", "reason", "created_on", "author"];

let schemaCache: Promise<Schema> | undefined;
export function schema(): Promise<Schema> {
  return (schemaCache ??= loadSchema(schemaPath));
}

export async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "reconciler-"));
}

export const MANIFEST = [{ scope: "internal", workbook: "master.xlsx", exported_at: "2026-11-20", exported_by: "lead-a" }];

/** Writes `manifest.csv` and one CSV per given tab, with every schema column plus any extra lead columns. */
export async function writeExport(dir: string, data: Record<string, Row[]>, manifest: Row[] = MANIFEST, extra: string[] = []): Promise<void> {
  const s = await schema();
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.csv"), formatCsv(["scope", "workbook", "exported_at", "exported_by"], manifest));
  for (const [tab, rows] of Object.entries(data)) {
    const header = [...getTab(s, tab).columns.map((c) => c.column), ...extra];
    await writeFile(join(dir, tabFileName(tab)), formatCsv(header, rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] ?? ""])))));
  }
}

export type PRow = { tab: string; op: string; key: string; field: string; value?: string; base?: string; source?: string; reason?: string; created?: string; id?: string };

export function proposalText(id: string, rows: PRow[]): string {
  return formatCsv(
    PROPOSAL_HEADER,
    rows.map((r) => ({
      update_id: `${r.id ?? id}:${r.tab}:${r.key}:${r.field}`,
      proposal_id: r.id ?? id,
      tab: r.tab,
      operation: r.op,
      record_key: r.key,
      field: r.field,
      value: r.value ?? "",
      base_value: r.base ?? "",
      source: r.source ?? "specs/spec.md@v2#anchor",
      reason: r.reason ?? "reason",
      created_on: r.created ?? "2026-11-18",
      author: "propose-tracker-updates",
    })),
  );
}

export async function writeProposal(root: string, id: string, rows: PRow[]): Promise<string> {
  const dir = join(root, id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "tracker-updates.csv"), proposalText(id, rows));
  return dir;
}

export async function rows(path: string): Promise<Row[]> {
  try {
    return parseCsv(await readFile(path, "utf8"), path).rows;
  } catch {
    return [];
  }
}

export async function text(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

export async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let names: string[] = [];
  try {
    names = (await readdir(dir, { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name));
  } catch {
    return out;
  }
  for (const name of names.sort()) out[name.slice(dir.length)] = await readFile(name, "utf8");
  return out;
}

export type Outcome = { status: number; stdout: string; stderr: string };

export async function cli(...args: string[]): Promise<Outcome> {
  let stdout = "";
  let stderr = "";
  const status = await run(args, { out: (t) => (stdout += t), err: (t) => (stderr += t) });
  return { status, stdout, stderr };
}

export type Fixture = { root: string; exportDir: string; proposals: string; out: string };

export async function fixture(): Promise<Fixture> {
  const root = await tmp();
  return { root, exportDir: join(root, "export"), proposals: join(root, "proposals"), out: join(root, "out") };
}

export function reconcile(f: Fixture, ...more: string[]): Promise<Outcome> {
  return cli("reconcile", "--export", f.exportDir, "--proposals", f.proposals, "--out", f.out, ...more);
}

/** The use case IDs of the base export's use cases (uc-<vendor-slug>-<use-case-slug>). */
export const ids = { daily: "uc-acme-daily-report", nightly: "uc-beta-nightly-sync", invoice: "uc-gamma-invoice-feed" };

/** The use case name of a base export ID, for the `use_case_name` value of a question. */
export const nameOf = (id: string): string => ({ [ids.daily]: "Daily Report", [ids.nightly]: "Nightly Sync", [ids.invoice]: "Invoice Feed", "uc-beta-daily-report": "Daily Report" })[id] ?? id;

export async function put(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
