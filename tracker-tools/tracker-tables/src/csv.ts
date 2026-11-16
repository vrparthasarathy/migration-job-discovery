import { readFile, writeFile } from "node:fs/promises";

export type Row = Record<string, string>;
export type Table = { file: string; header: string[]; rows: Row[] };

function splitRecords(text: string, file: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let inQuotes = false;

  const endField = () => {
    record.push(field);
    field = "";
    quoted = false;
  };
  const endRecord = () => {
    if (record.length > 0 || field !== "" || quoted) {
      endField();
      records.push(record);
    }
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else inQuotes = false;
    } else if (c === '"' && field === "" && !quoted) {
      inQuotes = true;
      quoted = true;
    } else if (c === ",") {
      endField();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRecord();
    } else {
      field += c;
    }
  }
  if (inQuotes) throw new Error(`${file}: unterminated quoted field`);
  endRecord();
  return records;
}

export function parseCsv(text: string, file: string): Table {
  const records = splitRecords(text.startsWith("﻿") ? text.slice(1) : text, file);
  const header = records.shift() ?? [];
  for (const name of header) {
    if (header.indexOf(name) !== header.lastIndexOf(name)) {
      throw new Error(`${file}: duplicate column "${name}"`);
    }
  }
  const rows = records.map((record, index) => {
    if (record.length > header.length) {
      throw new Error(`${file}: row ${index + 2} has ${record.length} fields but the header has ${header.length}`);
    }
    return Object.fromEntries(header.map((name, i) => [name, record[i] ?? ""]));
  });
  return { file, header, rows };
}

export async function readCsv(path: string): Promise<Table> {
  return parseCsv(await readFile(path, "utf8"), path);
}

function quote(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function formatCsv(header: string[], rows: Row[]): string {
  const lines = [header.map(quote).join(",")];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!header.includes(key)) throw new Error(`row has column "${key}" that is not in the header`);
    }
    const values = header.map((name) => row[name] ?? "");
    lines.push(header.length === 1 && values[0] === "" ? '""' : values.map(quote).join(","));
  }
  return lines.join("\n") + "\n";
}

export async function writeCsv(path: string, header: string[], rows: Row[]): Promise<void> {
  await writeFile(path, formatCsv(header, rows), "utf8");
}

export function splitList(value: string): string[] {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item !== "");
}

export function joinList(items: string[]): string {
  return items.join(";");
}
