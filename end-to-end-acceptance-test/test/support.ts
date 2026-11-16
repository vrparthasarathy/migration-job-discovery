import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { run as exporter } from "../../tracker-tools/review-csv-exporter/src/cli.ts";
import { run as masterUpdater } from "../../tracker-tools/master-workbook-updater/src/cli.ts";
import { loadMasterColumns } from "../../tracker-tools/master-workbook-updater/src/master_columns.ts";
import { readMaster } from "../../tracker-tools/master-workbook-updater/src/master_read.ts";
import { run as reconciler } from "../../tracker-tools/tracker-reconciler/src/cli.ts";
import { run as summarizer } from "../../tracker-tools/tracker-summary/src/cli.ts";
import { formatCsv, parseCsv, type Row } from "../../tracker-tools/tracker-tables/src/csv.ts";
import { getTab, loadSchema, tabFileName, type Schema } from "../../tracker-tools/tracker-tables/src/schema.ts";
import { loadColumns, keyOf } from "../../tracker-tools/vendor-workbook-updater/src/columns.ts";
import { run as vendorUpdater } from "../../tracker-tools/vendor-workbook-updater/src/cli.ts";
import { readVendorWorkbook } from "../../tracker-tools/vendor-workbook-updater/src/workbook_read.ts";

/** The component, the project root (the pack), the fixtures and the reference outputs, found by relative path. */
export const component = fileURLToPath(new URL("../", import.meta.url));
export const pack = join(component, "..");
export const fixtures = join(component, "fixtures");
export const expected = join(fixtures, "expected");
export const sheetPath = join(component, "acceptance-run-sheet.md");
export const schemaPath = join(pack, "tracker-data-contract", "tracker-schema.csv");
export const columnsPath = join(pack, "tracker-tools", "sample-tracker-workbook", "data", "headings.csv");
export const editedPath = join(pack, "tracker-tools", "vendor-workbook-updater", "data", "vendor-edited.csv");

// exceljs is resolved from the installed Master Workbook Updater; this component has no dependency of its own.
const ExcelJS = createRequire(join(pack, "tracker-tools", "master-workbook-updater", "package.json"))("exceljs");

export const ID = "uc-harborline-refund-retry";
export const LEAD = "Lena Park";
export const ANSWERER = "Harborline Contact";

let schemaCache: Promise<Schema> | undefined;
export const schema = (): Promise<Schema> => (schemaCache ??= loadSchema(schemaPath));

// ---------- the run sheet ----------

export type Step = { id: string; title: string; text: string; fields: Record<string, string>; command: string; fallback: string };
export const FIELD_ORDER = ["Who", "Skill or tool", "File or sheet", "Exact prompt or command", "Expected result", "Pass or fail", "If it fails"];

export async function sheetText(): Promise<string> {
  return readFile(sheetPath, "utf8");
}

/** The first fenced block of a text, without the indentation of the list item it sits in. */
function fenced(text: string): string {
  const block = /^([ \t]*)```[a-z]*\n([\s\S]*?)\n[ \t]*```/m.exec(text);
  if (!block) return "";
  return block[2]!.split("\n").map((line) => (line.startsWith(block[1]!) ? line.slice(block[1]!.length) : line)).join("\n");
}

/** The steps of the sheet, each with its fields, its first fenced block and the fenced block under "If it fails". */
export function parseSteps(sheet: string): Step[] {
  const parts = sheet.split(/^### (?=S\d\d)/m).slice(1);
  return parts.map((part) => {
    const [head, ...rest] = part.split("\n");
    const text = rest.join("\n");
    const fields: Record<string, string> = {};
    const labels = [...text.matchAll(/^- \*\*([^*]+):\*\*/gm)];
    labels.forEach((m, i) => {
      fields[m[1]!] = text.slice(m.index! + m[0].length, labels[i + 1]?.index ?? text.length).trim();
    });
    return { id: /^(S\d\d[a-z]?)/.exec(head!)![1]!, title: head!, text, fields, command: fenced(fields["Exact prompt or command"] ?? ""), fallback: fenced(fields["If it fails"] ?? "") };
  });
}

export async function steps(): Promise<Step[]> {
  return parseSteps(await sheetText());
}

export function step(all: Step[], id: string): Step {
  const found = all.find((s) => s.id === id);
  if (!found) throw new Error(`the run sheet has no step ${id}`);
  return found;
}

/** The words of a documented command with the placeholders replaced; a trailing backslash continues the line. */
export function words(command: string, sandboxDir: string): string[] {
  return command
    .replace(/\\\n/g, " ")
    .split(/\s+/)
    .filter((w) => w !== "")
    .map((w) => w.split("{pack}").join(pack).split("{sandbox}").join(sandboxDir));
}

// ---------- running a documented command through the tool's own command module ----------

export type Outcome = { status: number; stdout: string; stderr: string };
type Io = { out: (t: string) => void; err: (t: string) => void; today: () => string };
type Runner = (argv: string[], io: Io) => Promise<number>;

const TOOLS: Record<string, Runner> = {
  "review-csv-exporter": exporter,
  "master-workbook-updater": masterUpdater,
  "vendor-workbook-updater": vendorUpdater,
  "tracker-reconciler": reconciler,
  "tracker-summary": (argv, io) => summarizer(argv, io),
};

/** Runs a `node <pack>/tracker-tools/<tool>/src/main.ts ...` command; the clock is a fixed date no command may rely on. */
export async function runCommand(command: string, sandboxDir: string): Promise<Outcome> {
  const w = words(command, sandboxDir);
  if (w[0] !== "node") throw new Error(`not a node command: ${command.split("\n")[0]}`);
  const tool = basename(dirname(dirname(w[1]!)));
  const runner = TOOLS[tool];
  if (!runner) throw new Error(`no command module for ${w[1]}`);
  let stdout = "";
  let stderr = "";
  const status = await runner(w.slice(2), { out: (t) => (stdout += t), err: (t) => (stderr += t), today: () => "2099-01-01" });
  return { status, stdout, stderr };
}

/** The sandbox path shown as `{sandbox}`, so an output can be compared with a reference. */
export const portable = (text: string, sandboxDir: string): string => text.split(sandboxDir).join("{sandbox}");

// ---------- the sandbox ----------

/** A real temporary copy of `fixtures/`, with an empty `work/` folder. */
export async function sandbox(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "acceptance-"));
  await cp(fixtures, dir, { recursive: true });
  await mkdir(join(dir, "work"), { recursive: true });
  return dir;
}

export async function snapshot(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  for (const e of entries.filter((x) => x.isFile()).sort((a, b) => join(a.parentPath, a.name).localeCompare(join(b.parentPath, b.name)))) {
    const path = join(e.parentPath, e.name);
    out[path.slice(dir.length + 1)] = (await readFile(path)).toString("latin1");
  }
  return out;
}

export async function rows(path: string): Promise<Row[]> {
  return parseCsv(await readFile(path, "utf8"), path).rows;
}

// ---------- the lead's, the vendor's and the developer's hand work, done in code ----------

export type Decision = { status: string; note: string; date: string };

/** What the lead does in S04: writes the review cells of the rows picked, as the review decisions skill would. */
export async function decide(reviewDir: string, file: string, pick: (row: Row) => Decision | undefined): Promise<void> {
  const path = join(reviewDir, file);
  const table = parseCsv(await readFile(path, "utf8"), path);
  for (const row of table.rows) {
    const d = pick(row);
    if (d) Object.assign(row, { review_status: d.status, reviewer: LEAD, review_note: d.note, reviewed_on: d.date });
  }
  await writeFile(path, formatCsv(table.header, table.rows));
}

const D = "2026-11-18";
export const WALK = (r: Row): Decision | undefined =>
  ({ [`${ID}/Q2`]: { status: "rejected", note: "Owner is known to the lead.", date: D }, [`${ID}/Q3`]: { status: "clarify", note: "Ask what counts as the last retry.", date: D } })[r.record_key!];
export const ACCEPT_ALL_PLAIN_ADDS = (r: Row): Decision | undefined => (r.review_status === "" && r.kind === "add" && r.conflict === "" ? { status: "accepted", note: "", date: D } : undefined);
export const REVISIT = (r: Row): Decision | undefined =>
  r.record_key === `${ID}/Q3` ? { status: "accepted", note: `Earlier: clarify by ${LEAD} on ${D}. Scope confirmed.`, date: D } : undefined;

export async function decideAll(reviewDir: string, pick: (row: Row) => Decision | undefined): Promise<void> {
  for (const file of ["review-use-cases.csv", "review-questions.csv"]) await decide(reviewDir, file, pick);
}

export const date = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** Opens a workbook, sets the cells under the headings of row 2 in the row whose first cell is `ref`, and saves it under a new name. */
export async function editWorkbook(from: string, to: string, sheet: string, ref: string, cells: Record<string, unknown>): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(from);
  const ws = wb.getWorksheet(sheet);
  const column: Record<string, number> = {};
  ws.getRow(2).eachCell((cell: { text: string }, index: number) => (column[cell.text] = index));
  let found = false;
  for (let r = 3; r <= ws.rowCount; r++) {
    if (ws.getRow(r).getCell(1).text !== ref) continue;
    found = true;
    for (const [heading, value] of Object.entries(cells)) {
      if (column[heading] === undefined) throw new Error(`${sheet} has no heading "${heading}"`);
      ws.getRow(r).getCell(column[heading]!).value = value;
    }
  }
  if (!found) throw new Error(`${sheet} has no row ${ref}`);
  await mkdir(dirname(to), { recursive: true });
  await wb.xlsx.writeFile(to);
}

/** The sheet names of a workbook, in order, and the row-2 headings of each. */
export async function sheetHeadings(path: string): Promise<Record<string, string[]>> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const out: Record<string, string[]> = {};
  for (const ws of wb.worksheets as { name: string; getRow(n: number): { values: unknown[] } }[]) {
    out[ws.name] = ws.name === "Read Me" || ws.name === "Lists" || ws.name === "Holidays" ? [] : (ws.getRow(2).values as unknown[]).slice(1).map((v) => String(v ?? ""));
  }
  return out;
}

// ---------- reading the master back with the tool's own reader ----------

export async function readMasterFile(path: string) {
  const s = await schema();
  const problems: string[] = [];
  const columns = (await loadMasterColumns(columnsPath, s, problems))!;
  const master = await readMaster(path, columns, s, problems);
  if (!master) throw new Error(problems.join("\n"));
  return master;
}

/** Every non-empty cell of the Use Cases and Questions rows of a master, as `tab,ref,field,value`. */
export async function masterCells(path: string): Promise<string> {
  const s = await schema();
  const master = await readMasterFile(path);
  const out: Row[] = [];
  for (const tab of ["Use Cases", "Questions"]) {
    const key = getTab(s, tab).columns.find((c) => c.key && c.type === "ref")!.column;
    for (const row of master.tables[tab]!.rows) for (const [field, value] of Object.entries(row)) if (value !== "" && field !== key) out.push({ tab, ref: row[key]!, field, value });
  }
  return formatCsv(["tab", "ref", "field", "value"], out);
}

/** What S11 gives: the master written as an export folder, a CSV per tab with the schema's column names, and a manifest. */
export async function exportMaster(masterPath: string, dir: string, exportedAt: string, name: string): Promise<void> {
  const s = await schema();
  const master = await readMasterFile(masterPath);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "manifest.csv"), formatCsv(["scope", "workbook", "exported_at", "exported_by"], [{ scope: "internal", workbook: name, exported_at: exportedAt, exported_by: LEAD }]));
  for (const [tab, table] of Object.entries(master.tables)) {
    const header = getTab(s, tab).columns.map((c) => c.column);
    await writeFile(join(dir, tabFileName(tab)), formatCsv(header, table.rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] ?? ""])))));
  }
}

// ---------- reading a vendor workbook back with the Vendor Workbook Updater's strict reader ----------

/** Every non-empty cell of a vendor workbook's Use Cases, Questions and Identity & Access rows, as `tab,ref,field,value`. */
export async function vendorCells(path: string): Promise<string> {
  const s = await schema();
  const problems: string[] = [];
  const columns = (await loadColumns(columnsPath, editedPath, s, problems))!;
  const data = await readVendorWorkbook(path, columns, "Harborline", problems);
  if (!data) throw new Error(problems.join("\n"));
  const out: Row[] = [];
  for (const [tab, list] of Object.entries(data)) {
    const key = columns[tab]!.find((c) => c.column === keyOf(tab))!.column;
    for (const { row } of list) for (const [field, value] of Object.entries(row)) if (value !== "" && field !== key) out.push({ tab, ref: row[key]!, field, value });
  }
  return formatCsv(["tab", "ref", "field", "value"], out);
}

/** The headings of each sheet of a workbook as `sheet,position,heading`. */
export async function headingsCsv(path: string): Promise<string> {
  const all = await sheetHeadings(path);
  return formatCsv(["sheet", "position", "heading"], Object.entries(all).flatMap(([name, list]) => list.map((heading, i) => ({ sheet: name, position: String(i + 1), heading }))));
}

// ---------- the whole scripted run ----------

export type Walk = { dir: string; out: Record<string, Outcome>; all: Step[] };

/** The first line of a tool's standard output with the sandbox path replaced (the counts line). */
export const countsLine = (o: Outcome, dir: string): string => portable(o.stdout, dir).split("\n")[0]! + "\n";

/**
 * Runs every step of the sheet that code can run, in order, on a new sandbox: the documented commands as written,
 * and the hand and Copilot steps as scripted stand-ins (reference proposals and the same review and workbook cells).
 */
export async function walk(): Promise<Walk> {
  const all = await steps();
  const dir = await sandbox();
  const w = join(dir, "work");
  const out: Record<string, Outcome> = {};
  const go = async (id: string) => {
    out[id] = await runCommand(step(all, id).command, dir);
    if (out[id]!.status !== 0) throw new Error(`${id} exited ${out[id]!.status}: ${out[id]!.stderr}`);
  };
  // S01 stand-in: the reference proposal is what the skill writes.
  await cp(join(dir, "reference-proposals"), join(dir, "proposals"), { recursive: true });
  await go("S03");
  // S04 stand-in: the decisions of the review decisions skill, in three rounds.
  await decideAll(join(w, "review"), WALK);
  await decideAll(join(w, "review"), ACCEPT_ALL_PLAIN_ADDS);
  await decideAll(join(w, "review"), REVISIT);
  await go("S05");
  // S06: the lead releases Q1 and Q3 by hand and saves as master-2.xlsx.
  const release = { Batch: "BT-001", "Released on": date("2026-11-19"), Status: "released" };
  await editWorkbook(join(w, "master-1.xlsx"), join(w, "master-2.xlsx"), "Questions", "QN-0001", release);
  await editWorkbook(join(w, "master-2.xlsx"), join(w, "master-2.xlsx"), "Questions", "QN-0003", release);
  await go("S06b");
  // S07: the vendor stand-in types the answer of Q1 into a copy of its workbook.
  const [answer] = await rows(join(dir, "vendor-answer", "answer.csv"));
  await editWorkbook(join(w, "vendor-1", "Harborline.xlsx"), join(w, "vendor-answered", "Harborline.xlsx"), "Questions", "QN-0001", {
    Answer: answer!.answer,
    "Answer status": answer!.answer_status,
    "Answered on": date(answer!.answered_on!),
    "Answered by": answer!.answered_by,
  });
  await go("S08");
  // S09: the lead accepts Q1 by hand and saves as master-5.xlsx.
  await editWorkbook(join(w, "master-4.xlsx"), join(w, "master-5.xlsx"), "Questions", "QN-0001", { Status: "accepted" });
  // S10 stand-in: the reference proposal of version 2.
  await cp(join(dir, "reference-proposals-v2"), join(w, "proposals-v2"), { recursive: true });
  await go("S10b");
  // S11: the export of the master.
  await exportMaster(join(w, "master-5.xlsx"), join(w, "export-after-answer"), "2026-12-01", "master-5.xlsx");
  await go("S11b");
  await go("S12");
  await go("S13");
  return { dir, out, all };
}
