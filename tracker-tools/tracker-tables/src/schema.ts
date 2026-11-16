import { readCsv, splitList, writeCsv, type Table } from "./csv.ts";
import { isIsoDate } from "./working_days.ts";

export type Column = {
  column: string;
  key: boolean;
  owner: string;
  visibility: "vendor" | "internal";
  type: string;
  allowed: string[];
};
export type TabSchema = { tab: string; columns: Column[] };
export type Schema = { tabs: TabSchema[] };
export type Finding = {
  severity: "error" | "warning";
  file: string;
  row?: number;
  field: string;
  message: string;
};

const SCHEMA_HEADER = ["tab", "column", "key", "owner", "visibility", "type", "allowed_values"];
const REFERENCE = /^[A-Z]{2}-\d{3,}$/;

export function isReference(value: string): boolean {
  return REFERENCE.test(value);
}

export async function loadSchema(path: string): Promise<Schema> {
  const file = await readCsv(path);
  if (file.header.join(",") !== SCHEMA_HEADER.join(",")) {
    throw new Error(`${path}: schema header must be ${SCHEMA_HEADER.join(",")}`);
  }
  const tabs: TabSchema[] = [];
  for (const row of file.rows) {
    let tab = tabs.find((t) => t.tab === row.tab);
    if (!tab) tabs.push((tab = { tab: row.tab!, columns: [] }));
    tab.columns.push({
      column: row.column!,
      key: row.key === "yes",
      owner: row.owner!,
      visibility: row.visibility === "V" ? "vendor" : "internal",
      type: row.type!,
      allowed: splitList(row.allowed_values!),
    });
  }
  return { tabs };
}

export function getTab(schema: Schema, tab: string): TabSchema {
  const found = schema.tabs.find((t) => t.tab === tab);
  if (!found) {
    throw new Error(`unknown tab "${tab}"; known tabs: ${schema.tabs.map((t) => t.tab).join(", ")}`);
  }
  return found;
}

export function tabFileName(tab: string): string {
  return `${tab.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`;
}

export function orderHeader(schema: Schema, tab: string, header: string[]): string[] {
  const known = getTab(schema, tab).columns.map((c) => c.column);
  return [...known.filter((c) => header.includes(c)), ...header.filter((c) => !known.includes(c))];
}

export async function writeTable(path: string, schema: Schema, tab: string, table: Table): Promise<void> {
  await writeCsv(path, orderHeader(schema, tab, table.header), table.rows);
}

function checkValue(column: Column, value: string): string | undefined {
  if (column.allowed.includes(value)) return undefined;
  if (column.type === "enum") return `"${value}" is not one of ${column.allowed.join(", ")}`;
  if (column.type === "date" && !isIsoDate(value)) return `"${value}" is not a date in YYYY-MM-DD format`;
  if (column.type === "ref" && !isReference(value)) {
    return `"${value}" is not a reference (two capital letters, a hyphen and digits, such as UC-001)`;
  }
  return undefined;
}

export function validateTable(schema: Schema, tab: string, table: Table): Finding[] {
  const { columns } = getTab(schema, tab);
  const { file, header } = table;
  const findings: Finding[] = [];

  for (const column of columns.filter((c) => c.key && !header.includes(c.column))) {
    findings.push({
      severity: "error",
      file,
      field: column.column,
      message: `required column "${column.column}" is missing`,
    });
  }
  for (const name of header.filter((h) => !columns.some((c) => c.column === h))) {
    findings.push({ severity: "warning", file, field: name, message: `unknown column "${name}" is kept as is` });
  }
  table.rows.forEach((row, index) => {
    for (const column of columns.filter((c) => header.includes(c.column))) {
      const value = row[column.column] ?? "";
      const message = value === "" ? undefined : checkValue(column, value);
      if (message) findings.push({ severity: "error", file, row: index + 2, field: column.column, message });
    }
  });
  return findings;
}

export function formatFinding(finding: Finding): string {
  const row = finding.row === undefined ? [] : [`row ${finding.row}`];
  return [finding.file, ...row, finding.field, finding.message].join(": ");
}
