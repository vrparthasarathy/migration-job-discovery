import { join } from "node:path";
import { formatCsv, parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { baseExport } from "../../tracker-reconciler/test/fixtures.ts";
import { fixture, ids, put, rows, snapshot, text, writeExport, writeProposal, type Fixture, type PRow } from "../../tracker-reconciler/test/support.ts";
import { run } from "../src/cli.ts";

export { baseExport, fixture, ids, put, rows, snapshot, text, writeExport, writeProposal };
export type { Fixture, PRow };

export type Outcome = { status: number; stdout: string; stderr: string };

export async function cli(...args: string[]): Promise<Outcome> {
  let stdout = "";
  let stderr = "";
  const status = await run(args, { out: (t) => (stdout += t), err: (t) => (stderr += t) });
  return { status, stdout, stderr };
}

export const FILES = ["review-use-cases.csv", "review-questions.csv", "review-identity-access.csv", "review-mappings.csv"];

/** A fixture with the base export and one proposal folder per entry. */
export async function setup(proposals: Record<string, PRow[]>, data: Record<string, Row[]> = baseExport()): Promise<Fixture> {
  const f = await fixture();
  await writeExport(f.exportDir, data);
  for (const [id, list] of Object.entries(proposals)) await writeProposal(f.proposals, id, list);
  return f;
}

export function exportReview(f: Fixture, ...more: string[]): Promise<Outcome> {
  return cli("export-review", "--export", f.exportDir, "--proposals", f.proposals, "--out", f.out, ...more);
}

/** Runs the exporter and requires success. */
export async function ok(f: Fixture, ...more: string[]): Promise<Outcome> {
  const outcome = await exportReview(f, ...more);
  if (outcome.status !== 0) throw new Error(`exit ${outcome.status}: ${outcome.stderr}`);
  return outcome;
}

export const review = (f: Fixture, file: string): Promise<Row[]> => rows(join(f.out, file));

/** Rewrites a review file with the given cells set on the row whose `record_key` or `record` matches. */
export async function edit(f: Fixture, file: string, match: string, cells: Row): Promise<void> {
  const original = await text(join(f.out, file));
  const table = parseCsv(original, file);
  for (const row of table.rows) if (row.record === match || row.record_key === match) Object.assign(row, cells);
  await put(join(f.out, file), formatCsv(table.header, table.rows));
}

export const set = (tab: string, key: string, field: string, value: string, base: string, extra: Partial<PRow> = {}): PRow => ({ tab, op: "set", key, field, value, base, ...extra });
export const add = (tab: string, key: string, field: string, value: string, extra: Partial<PRow> = {}): PRow => ({ tab, op: "add", key, field, value, ...extra });
