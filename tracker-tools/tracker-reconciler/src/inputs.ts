import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { parseCsv, type Table } from "../../tracker-tables/src/csv.ts";
import { getTab, tabFileName, validateTable, type Schema } from "../../tracker-tables/src/schema.ts";
import { useCaseId } from "../../tracker-tables/src/use_case_id.ts";
import { isIsoDate } from "../../tracker-tables/src/working_days.ts";
import { looksSecret } from "./secrets.ts";

export const PROPOSAL_HEADER = ["update_id", "proposal_id", "tab", "operation", "record_key", "field", "value", "base_value", "source", "reason", "created_on", "author"];
export const OPERATIONS = ["add", "set", "link", "suggest"];
export const PROPOSAL_FILE = "tracker-updates.csv";
const MANIFEST_COLUMNS = ["scope", "workbook", "exported_at", "exported_by"];

/** The tabs a proposal may address, how their local references begin and how central references are numbered. */
export const PROPOSABLE: Record<string, { separator: string; prefix: string; width: number }> = {
  "Use Cases": { separator: "", prefix: "UC", width: 3 },
  Questions: { separator: "/", prefix: "QN", width: 4 },
  Mappings: { separator: "->>", prefix: "MP", width: 3 },
  "Identity & Access": { separator: "/", prefix: "AX", width: 3 },
};

export type Change = {
  file: string;
  line: number;
  update_id: string;
  proposal_id: string;
  tab: string;
  operation: string;
  record_key: string;
  field: string;
  value: string;
  base_value: string;
  source: string;
  reason: string;
  created_on: string;
  author: string;
  /** The ID of the use case this change concerns (uc-<vendor-slug>-<use-case-slug>), empty for a tab that proposals do not address. */
  useCase: string;
};

export type ExportData = { dir: string; manifest: Table; tables: Record<string, Table> };

/** One or more input problems, each already worded as `file: line N: message`. */
export class InputError extends Error {
  messages: string[];
  constructor(messages: string[]) {
    super(messages.join("\n"));
    this.messages = messages;
  }
}

/** The line, counting the header as line 1, on which an unterminated quote was opened. */
function unterminatedLine(text: string): number {
  let line = 1;
  let opened = 1;
  let inQuotes = false;
  let fieldStart = true;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    const newline = c === "\n" || c === "\r";
    if (newline && c === "\r" && text[i + 1] === "\n") i++;
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') i++;
      else if (c === '"') inQuotes = false;
      else if (newline) line++;
    } else if (newline) {
      line++;
      fieldStart = true;
    } else if (c === '"' && fieldStart) {
      inQuotes = true;
      opened = line;
      fieldStart = false;
    } else fieldStart = c === ",";
  }
  return opened;
}

async function readText(path: string, problems: string[], what: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    problems.push(`${path}: cannot read ${what} (${(error as NodeJS.ErrnoException).code ?? "error"})`);
    return undefined;
  }
}

function parseText(file: string, content: string, problems: string[]): Table | undefined {
  try {
    return parseCsv(content, file);
  } catch (error) {
    const message = (error as Error).message.replace(`${file}: `, "");
    const row = /^row (\d+)/.exec(message)?.[1];
    const where = row ?? (message.includes("unterminated") ? unterminatedLine(content) : 1);
    problems.push(`${file}: line ${where}: ${message}`);
    return undefined;
  }
}

function secretProblems(table: Table, problems: string[]): void {
  table.rows.forEach((row, index) => {
    for (const [field, value] of Object.entries(row)) {
      if (looksSecret(value)) problems.push(`${table.file}: line ${index + 2}: secret-looking value in "${field}"; remove it from the file`);
    }
  });
}

async function readIfPresent(path: string, problems: string[]): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") problems.push(`${path}: cannot read file (${(error as NodeJS.ErrnoException).code ?? "error"})`);
    return undefined;
  }
}

export async function loadExport(dir: string, schema: Schema, problems: string[]): Promise<ExportData | undefined> {
  const before = problems.length;
  const manifestPath = join(dir, "manifest.csv");
  const manifestText = await readText(manifestPath, problems, "file");
  const manifest = manifestText === undefined ? undefined : parseText(manifestPath, manifestText, problems);
  if (manifest) {
    for (const column of MANIFEST_COLUMNS.filter((c) => !manifest.header.includes(c))) problems.push(`${manifestPath}: line 1: missing column "${column}"`);
    if (MANIFEST_COLUMNS.every((c) => manifest.header.includes(c))) {
      manifest.rows.forEach((row, index) => {
        if (!isIsoDate(row.exported_at!.slice(0, 10))) problems.push(`${manifestPath}: line ${index + 2}: exported_at "${row.exported_at}" does not start with a date YYYY-MM-DD`);
      });
    }
    secretProblems(manifest, problems);
  }
  const tables: Record<string, Table> = {};
  for (const { tab } of schema.tabs) {
    const path = join(dir, tabFileName(tab));
    const content = await readIfPresent(path, problems);
    if (content === undefined) {
      tables[tab] = { file: path, header: [], rows: [] };
      continue;
    }
    const table = parseText(path, content, problems);
    if (!table) continue;
    tables[tab] = table;
    for (const finding of validateTable(schema, tab, table).filter((f) => f.severity === "error")) {
      problems.push(`${finding.file}: line ${finding.row ?? 1}: ${finding.field}: ${finding.message}`);
    }
    secretProblems(table, problems);
  }
  return problems.length > before || !manifest ? undefined : { dir, manifest, tables };
}

export function loadProposalFile(file: string, content: string, schema: Schema, problems: string[]): Change[] {
  if (content.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/, 1)[0] !== PROPOSAL_HEADER.join(",")) {
    problems.push(`${file}: line 1: header must be ${PROPOSAL_HEADER.join(",")}`);
    return [];
  }
  const table = parseText(file, content, problems);
  if (!table) return [];
  const changes: Change[] = [];
  table.rows.forEach((row, index) => {
    const line = index + 2;
    const before = problems.length;
    const bad = (message: string) => problems.push(`${file}: line ${line}: ${message}`);
    let columns: string[] = [];
    try {
      columns = getTab(schema, row.tab!).columns.map((c) => c.column);
    } catch (error) {
      bad((error as Error).message);
    }
    if (columns.length > 0 && !columns.includes(row.field!)) bad(`unknown field "${row.field}" for tab "${row.tab}"`);
    if (!OPERATIONS.includes(row.operation!)) bad(`operation "${row.operation}" must be one of ${OPERATIONS.join(", ")}`);
    if (row.record_key === "") bad("record_key is empty");
    if (row.source === "") bad("source is empty; every row must be traceable");
    if (!isIsoDate(row.created_on!)) bad(`created_on "${row.created_on}" is not a date in YYYY-MM-DD format`);
    if (row.update_id !== `${row.proposal_id}:${row.tab}:${row.record_key}:${row.field}`) bad(`update_id "${row.update_id}" is not <proposal_id>:<tab>:<record_key>:<field>`);
    for (const [field, value] of Object.entries(row)) {
      if (looksSecret(value)) bad(`secret-looking value in "${field}"; remove it from the file`);
    }
    if (problems.length === before) changes.push({ ...(row as Omit<Change, "file" | "line" | "useCase">), file, line, useCase: "" });
  });
  return changes;
}

/** The kebab-case form of a text: a workflow candidate in a mapping key and a vendor folder name. */
export const slug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The known use case ID that a key equals (Use Cases) or starts with; an ID holds no separator, so at most one matches. */
function useCaseOf(change: Change, ids: string[]): string | undefined {
  const rule = PROPOSABLE[change.tab];
  if (!rule) return "";
  if (rule.separator === "") return ids.includes(change.record_key) ? change.record_key : undefined;
  return ids.find((id) => change.record_key.startsWith(id + rule.separator));
}

async function proposalFiles(dir: string, problems: string[]): Promise<string[]> {
  try {
    const entries = await readdir(dir, { recursive: true });
    return entries.filter((entry) => basename(entry) === PROPOSAL_FILE).sort().map((entry) => join(dir, entry));
  } catch (error) {
    problems.push(`${dir}: cannot read folder (${(error as NodeJS.ErrnoException).code ?? "error"})`);
    return [];
  }
}

/** Reads every proposal file under `dir`; with the export given, also checks that each use case name is known. */
export async function loadProposals(dir: string, schema: Schema, known: ExportData | undefined, problems: string[]): Promise<{ files: string[]; changes: Change[] }> {
  const files = await proposalFiles(dir, problems);
  const changes: Change[] = [];
  for (const file of files) {
    const content = await readText(file, problems, "file");
    if (content !== undefined) changes.push(...loadProposalFile(file, content, schema, problems));
  }
  const seen = new Map<string, Change>();
  for (const change of changes) {
    const first = seen.get(change.update_id);
    if (first) problems.push(`${change.file}: line ${change.line}: duplicate update_id "${change.update_id}" (also in ${first.file} line ${first.line})`);
    else seen.set(change.update_id, change);
  }
  if (known) {
    const ids = new Map<string, string>();
    const useCases = known.tables["Use Cases"]!;
    const lines = new Map<string, number>();
    let duplicate = false;
    useCases.rows.forEach((row, index) => {
      const id = useCaseId(row.vendor!, row.use_case_name!);
      if (id === undefined) return;
      const first = lines.get(id);
      if (first === undefined) lines.set(id, index + 2);
      else {
        duplicate = true;
        problems.push(`${useCases.file}: line ${index + 2}: use case ID ${id} is also derived by line ${first}; make the vendor or the name differ`);
      }
      ids.set(id, row.use_case_name!);
    });
    for (const change of changes.filter((c) => c.tab === "Use Cases" && c.operation === "add")) {
      if (change.field === "use_case_name") ids.set(change.record_key, change.value);
      else if (!ids.has(change.record_key)) ids.set(change.record_key, "");
    }
    for (const change of duplicate ? [] : changes) {
      const id = useCaseOf(change, [...ids.keys()]);
      if (id === undefined) {
        problems.push(`${change.file}: line ${change.line}: unknown use case ID in record_key "${change.record_key}"; expected uc-<vendor-slug>-<use-case-slug> (an ID of a Use Cases row in the export or of a Use Cases add), as in <id>/Q<n>`);
        continue;
      }
      const name = ids.get(id)!;
      if (change.tab === "Questions" && change.field === "use_case_name" && change.value !== "" && name !== "" && change.value !== name) {
        problems.push(`${change.file}: line ${change.line}: use_case_name "${change.value}" does not belong to use case ID ${id}`);
      } else change.useCase = id;
    }
  }
  if (files.length === 0 && problems.length === 0) problems.push(`${dir}: no ${PROPOSAL_FILE} files found`);
  return { files, changes };
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(() => true, () => false);
}

/** Validates one proposal file, or every export and proposal file under a folder; returns the files found valid. */
export async function validatePath(path: string, schema: Schema): Promise<string[]> {
  const problems: string[] = [];
  const valid: string[] = [];
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    throw new InputError([`${path}: cannot read (${(error as NodeJS.ErrnoException).code ?? "error"})`]);
  }
  if (info.isFile()) {
    const content = await readText(path, problems, "file");
    if (content !== undefined) loadProposalFile(path, content, schema, problems);
    valid.push(path);
  } else {
    const entries = await readdir(path, { recursive: true });
    const exports = entries.filter((e) => basename(e) === "manifest.csv").sort().map((e) => dirname(join(path, e)));
    for (const dir of exports) {
      await loadExport(dir, schema, problems);
      valid.push(join(dir, "manifest.csv"));
      for (const { tab } of schema.tabs) if (await exists(join(dir, tabFileName(tab)))) valid.push(join(dir, tabFileName(tab)));
    }
    const proposals = entries.filter((e) => basename(e) === PROPOSAL_FILE).sort().map((e) => join(path, e));
    for (const file of proposals) {
      const content = await readText(file, problems, "file");
      if (content !== undefined) loadProposalFile(file, content, schema, problems);
      valid.push(file);
    }
    if (valid.length === 0) problems.push(`${path}: nothing to validate; no manifest.csv or ${PROPOSAL_FILE} found`);
  }
  if (problems.length > 0) throw new InputError(problems);
  return valid;
}

