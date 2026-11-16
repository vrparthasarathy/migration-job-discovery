import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, splitList, type Table } from "../../tracker-tables/src/csv.ts";
import { formatFinding, getTab, loadSchema, validateTable, type Schema } from "../../tracker-tables/src/schema.ts";
import { dueOn } from "../../tracker-tables/src/working_days.ts";
import {
  COMPUTED, CONTRACT_TABS, HEADING_TABS, KEY_COLUMN, OMITTED, PROPOSAL_OPERATIONS, PROPOSAL_STATUSES, PROPOSED_COLUMNS,
  TRACE_COLUMNS, TRACE_KINDS, type Visibility,
} from "./layout.ts";

export type Heading = { tab: string; column: string; heading: string; band: string; visibility: Visibility };
export type SampleData = {
  schema: Schema;
  /** The four contract tabs, by the schema's tab name. */
  tables: Record<string, Table>;
  proposals: Table;
  trace: Table;
  headings: Heading[];
};

export class SampleDataError extends Error {
  findings: string[];
  constructor(findings: string[]) {
    super(findings.join("\n"));
    this.findings = findings;
  }
}

const FILES: Record<string, string> = {
  "Use Cases": "use-cases.csv",
  Questions: "questions.csv",
  "Identity & Access": "identity-access.csv",
  Mappings: "mappings.csv",
};

/** Columns whose values must name a row of another tab: [tab, column, target tab, whether the value is a `;` list]. */
const REFERENCES: [string, string, string, boolean][] = [
  ["Questions", "use_case_ref", "Use Cases", false],
  ["Questions", "superseded_by", "Questions", false],
  ["Identity & Access", "use_case_ref", "Use Cases", false],
  ["Identity & Access", "shared_with", "Identity & Access", true],
  ["Identity & Access", "consolidated_request_ref", "Identity & Access", false],
  ["Mappings", "use_case_ref", "Use Cases", false],
  ["Mappings", "blocking_question_refs", "Questions", true],
];

/** Patterns for values that look like a secret. Variable names such as `API_KEY` are allowed. */
const SECRETS = [
  /\b(password|passwd|secret|token|api[_-]?key|credential)s?\s*[:=]\s*\S{6,}/i,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/,
  /\b(ghp|gho|xox[bp]|sk|AKIA)[_-]?[A-Za-z0-9]{16,}/,
  /-----BEGIN/,
  /[A-Za-z0-9+/]{32,}={0,2}/,
];

const read = async (dir: string, file: string): Promise<Table> => parseCsv(await readFile(join(dir, file), "utf8"), file);

export async function loadSampleData(dataDir: string, schemaPath: string): Promise<SampleData> {
  const schema = await loadSchema(schemaPath);
  const tables: Record<string, Table> = {};
  for (const [tab, file] of Object.entries(FILES)) tables[tab] = await read(dataDir, file);
  const data: SampleData = {
    schema,
    tables,
    proposals: await read(dataDir, "proposed-changes.csv"),
    trace: await read(dataDir, "trace.csv"),
    headings: (await read(dataDir, "headings.csv")).rows.map((r) => r as Heading),
  };
  const findings = checkSampleData(data);
  if (findings.length > 0) throw new SampleDataError(findings);
  return data;
}

function checkSampleData(data: SampleData): string[] {
  const out: string[] = [];
  const add = (file: string, row: number, field: string, message: string) =>
    out.push(formatFinding({ severity: "error", file, row, field, message }));
  const keys = (tab: string): Set<string> => new Set(data.tables[tab]!.rows.map((r) => r[KEY_COLUMN[tab]!]!));
  const tabs = Object.fromEntries(CONTRACT_TABS.map((t) => [t, keys(t)]));

  for (const tab of CONTRACT_TABS) {
    const table = data.tables[tab]!;
    for (const finding of validateTable(data.schema, tab, table)) if (finding.severity === "error") out.push(formatFinding(finding));
    const seen = new Set<string>();
    table.rows.forEach((row, i) => {
      const key = row[KEY_COLUMN[tab]!]!;
      if (seen.has(key)) add(table.file, i + 2, KEY_COLUMN[tab]!, `duplicate key "${key}"`);
      seen.add(key);
    });
  }

  for (const [tab, column, target, list] of REFERENCES) {
    const table = data.tables[tab]!;
    table.rows.forEach((row, i) => {
      const values = list ? splitList(row[column]!) : row[column] === "" ? [] : [row[column]!];
      for (const value of values) if (!tabs[target]!.has(value)) add(table.file, i + 2, column, `"${value}" is not a ${target} reference`);
    });
  }

  data.tables.Questions!.rows.forEach((row, i) => {
    const expected = row.released_on === "" ? "" : dueOn(row.released_on!);
    if (row.due_on !== "" && row.due_on !== expected) add("questions.csv", i + 2, "due_on", `"${row.due_on}" is not release plus two working days (${expected})`);
  });
  data.tables.Mappings!.rows.forEach((row, i) => {
    for (const field of ["decision_ref", "decided_by", "decided_on"]) {
      if (row[field] !== "") add("mappings.csv", i + 2, field, "decision fields must be blank in the sample; leads decide");
    }
  });

  checkProposals(data, tabs, add);
  checkTrace(data, tabs, add);
  checkHeadings(data, add);

  const files: [string, Table][] = [...Object.entries(FILES).map(([tab, file]): [string, Table] => [file, data.tables[tab]!]), ["proposed-changes.csv", data.proposals], ["trace.csv", data.trace]];
  for (const [file, table] of files) {
    table.rows.forEach((row, i) => {
      for (const [field, value] of Object.entries(row)) {
        if (SECRETS.some((pattern) => pattern.test(value))) add(file, i + 2, field, "value looks like a secret; use a name or variable reference");
      }
    });
  }
  return out;
}

type Add = (file: string, row: number, field: string, message: string) => void;

function checkProposals(data: SampleData, tabs: Record<string, Set<string>>, add: Add): void {
  data.proposals.rows.forEach((row, i) => {
    const n = i + 2;
    const tab = row.tab!;
    if (!tabs[tab]) return add("proposed-changes.csv", n, "tab", `"${tab}" is not a tracker tab`);
    if (!tabs[tab]!.has(row.record_ref!)) add("proposed-changes.csv", n, "record_ref", `"${row.record_ref}" is not a ${tab} record`);
    if (!PROPOSAL_OPERATIONS.includes(row.operation!)) add("proposed-changes.csv", n, "operation", `"${row.operation}" is not one of ${PROPOSAL_OPERATIONS.join(", ")}`);
    if (!PROPOSAL_STATUSES.includes(row.review_status!)) add("proposed-changes.csv", n, "review_status", `"${row.review_status}" is not one of ${PROPOSAL_STATUSES.join(", ")}`);
    if (!getTab(data.schema, tab).columns.some((c) => c.column === row.field)) return add("proposed-changes.csv", n, "field", `"${row.field}" is not a ${tab} column`);
    const current = data.tables[tab]!.rows.find((r) => r[KEY_COLUMN[tab]!] === row.record_ref);
    if (current && current[row.field!] !== row.current_value) add("proposed-changes.csv", n, "current_value", `"${row.current_value}" is not the accepted value "${current[row.field!]}"`);
  });
}

function checkTrace(data: SampleData, tabs: Record<string, Set<string>>, add: Add): void {
  data.trace.rows.forEach((row, i) => {
    const n = i + 2;
    if (!tabs[row.tab!]) return add("trace.csv", n, "tab", `"${row.tab}" is not a tracker tab`);
    if (!tabs[row.tab!]!.has(row.record_ref!)) add("trace.csv", n, "record_ref", `"${row.record_ref}" is not a ${row.tab} record`);
    if (!TRACE_KINDS.includes(row.kind!)) add("trace.csv", n, "kind", `"${row.kind}" is not one of ${TRACE_KINDS.join(", ")}`);
  });
}

function checkHeadings(data: SampleData, add: Add): void {
  const own: Record<string, string[]> = { "Proposed Changes": PROPOSED_COLUMNS, Trace: TRACE_COLUMNS };
  data.headings.forEach((h, i) => {
    const n = i + 2;
    const schemaColumn = CONTRACT_TABS.includes(h.tab) ? getTab(data.schema, h.tab).columns.find((c) => c.column === h.column) : undefined;
    const computed = COMPUTED[h.tab]?.[h.column] !== undefined;
    if (!HEADING_TABS.includes(h.tab) || !(schemaColumn || computed || own[h.tab]?.includes(h.column))) {
      return add("headings.csv", n, "column", `"${h.tab} > ${h.column}" is not a column of the sample`);
    }
    if (schemaColumn && (schemaColumn.visibility === "vendor" ? "V" : "I") !== h.visibility) add("headings.csv", n, "visibility", `"${h.column}" visibility ${h.visibility} differs from the schema`);
    if (data.headings.findIndex((x) => x.tab === h.tab && x.heading === h.heading) !== i) add("headings.csv", n, "heading", `duplicate heading "${h.heading}" on ${h.tab}`);
  });
  for (const tab of HEADING_TABS) {
    const columns = CONTRACT_TABS.includes(tab) ? getTab(data.schema, tab).columns.map((c) => c.column).filter((c) => !OMITTED.includes(c)) : own[tab]!;
    for (const column of columns) {
      if (!data.headings.some((h) => h.tab === tab && h.column === column)) add("headings.csv", 1, "column", `"${tab} > ${column}" has no heading`);
    }
  }
}
