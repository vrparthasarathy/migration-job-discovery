import { readFile } from "node:fs/promises";
import { parseCsv } from "../../tracker-tables/src/csv.ts";
import { getTab, type Schema } from "../../tracker-tables/src/schema.ts";
import { PROPOSABLE } from "../../tracker-reconciler/src/inputs.ts";
import { looksSecret } from "../../tracker-reconciler/src/secrets.ts";

/** The fixed keys a `Review` row of the headings file may name. */
export const REVIEW_KEYS = ["order", "use_case", "record", "suggested_ref", "record_key", "kind", "conflict", "suggestions", "other_changes", "reason", "evidence", "proposals", "content_digest", "changed_since_review", "review_status", "reviewer", "review_note", "reviewed_on", "applied_on", "suffix_current", "suffix_proposed", "suffix_state"];
export const REQUIRED_KEYS = ["record", "record_key", "kind", "content_digest", "review_status", "suffix_current", "suffix_proposed", "suffix_state"];
export const REVIEW_CELLS = ["review_status", "reviewer", "review_note", "reviewed_on", "applied_on"];
const LEADING = ["order", "use_case", "record", "suggested_ref", "record_key", "kind", "conflict", "suggestions"];
const TRAILING = ["other_changes", "reason", "evidence", "proposals"];

export type Headings = {
  file: string;
  /** Heading of each fixed key; a key the file does not name is headed by itself. */
  labels: Record<string, string>;
  /** Shown schema columns of each proposable tab, in file order, with their headings. */
  shown: Record<string, { column: string; heading: string }[]>;
};

export const label = (h: Headings, key: string): string => h.labels[key] ?? key;

/** The three cells shown for one field. */
export const fieldHeaders = (h: Headings, heading: string): string[] => [`current`, `proposed`, `state`].map((s) => `${heading} (${label(h, `suffix_${s}`)})`);

/** The columns that make up the content digest, in order. */
export function contentHeader(h: Headings, tab: string): string[] {
  const leading = LEADING.slice(1).map((k) => label(h, k));
  const fields = h.shown[tab]!.flatMap((s) => fieldHeaders(h, s.heading));
  return [...leading, ...fields, ...TRAILING.map((k) => label(h, k))];
}

export function fullHeader(h: Headings, tab: string): string[] {
  return [label(h, "order"), ...contentHeader(h, tab), label(h, "content_digest"), label(h, "changed_since_review"), ...REVIEW_CELLS.map((k) => label(h, k))];
}

/** Reads and checks the headings file against the schema, adding each finding to `problems` as `file: line N: message`. */
export async function loadHeadings(file: string, schema: Schema, problems: string[]): Promise<Headings | undefined> {
  const before = problems.length;
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    problems.push(`${file}: cannot read headings file (${(error as NodeJS.ErrnoException).code ?? "error"})`);
    return undefined;
  }
  let table;
  try {
    table = parseCsv(text, file);
  } catch (error) {
    problems.push(`${file}: line 1: ${(error as Error).message.replace(`${file}: `, "")}`);
    return undefined;
  }
  const missing = ["tab", "column", "heading"].filter((c) => !table.header.includes(c));
  if (missing.length > 0) {
    problems.push(`${file}: line 1: missing column "${missing[0]}"`);
    return undefined;
  }
  const h: Headings = { file, labels: {}, shown: Object.fromEntries(Object.keys(PROPOSABLE).map((t) => [t, []])) };
  table.rows.forEach((row, index) => {
    const bad = (message: string) => problems.push(`${file}: line ${index + 2}: ${message}`);
    const { tab, column, heading } = row as Record<string, string>;
    if (Object.values(row).some(looksSecret)) return bad("secret-looking value; remove it from the file");
    if (heading === "") return bad(`heading for "${column}" is empty`);
    if (tab === "Review") {
      if (!REVIEW_KEYS.includes(column!)) bad(`unknown review key "${column}"`);
      else if (column! in h.labels) bad(`duplicate review key "${column}"`);
      else h.labels[column!] = heading!;
      return;
    }
    let columns: string[];
    try {
      columns = getTab(schema, tab!).columns.map((c) => c.column);
    } catch (error) {
      return bad((error as Error).message);
    }
    if (!columns.includes(column!)) return bad(`unknown column "${column}" for tab "${tab}"`);
    if (!PROPOSABLE[tab!]) return;
    if (h.shown[tab!]!.some((s) => s.column === column)) return bad(`duplicate column "${column}" for tab "${tab}"`);
    h.shown[tab!]!.push({ column: column!, heading: heading! });
  });
  for (const key of REQUIRED_KEYS.filter((k) => !(k in h.labels))) problems.push(`${file}: line 1: missing required review key "${key}"`);
  if (problems.length > before) return undefined;
  for (const tab of Object.keys(PROPOSABLE)) {
    const header = fullHeader(h, tab);
    const twice = header.find((name, i) => header.indexOf(name) !== i);
    if (twice !== undefined) problems.push(`${file}: line 1: heading "${twice}" is used twice in tab "${tab}"`);
  }
  return problems.length > before ? undefined : h;
}
