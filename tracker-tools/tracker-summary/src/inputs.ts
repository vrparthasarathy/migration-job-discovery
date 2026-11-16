import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type Table } from "../../tracker-tables/src/csv.ts";
import { tabFileName, validateTable, type Schema } from "../../tracker-tables/src/schema.ts";

/** One or more input problems, each already naming the file (and row and field where there is one). */
export class InputError extends Error {
  messages: string[];
  constructor(messages: string[]) {
    super(messages.join("\n"));
    this.messages = messages;
  }
}

const MANIFEST_COLUMNS = ["scope", "workbook", "exported_at", "exported_by"];

/** The tabs the summary reads and, for each, the columns it needs. */
export const REQUIRED: Record<string, string[]> = {
  "Use Cases": ["use_case_ref", "use_case_name", "vendor", "current_version", "acknowledgement_requested_on", "acknowledged_version", "acknowledged_on", "stage", "blocked_reason", "source_status", "source_owner", "supporting_documents", "grouping_impact", "grouping_impact_lead", "our_owner", "next_action", "next_action_owner", "workflow_candidate"],
  Questions: ["question_ref", "use_case_ref", "vendor", "released_on", "due_on", "answer_status", "answered_on", "status", "resolver", "our_owner", "blocks_mapping"],
  Mappings: ["mapping_ref", "use_case_ref", "workflow_candidate", "mapping_status"],
  "Identity & Access": ["access_ref", "vendor", "use_case_ref", "service", "endpoint", "our_coordinator", "vendor_action_owner", "request_status", "expected_availability", "verification", "affected_workflow", "next_action", "next_action_owner"],
  Batches: ["batch_ref", "vendor", "use_case_refs", "released_on", "status", "provisional_limits", "capacity_notes"],
};

async function readTable(path: string, problems: string[]): Promise<Table | undefined> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    problems.push(`${path}: cannot read file (${(error as NodeJS.ErrnoException).code ?? "error"})`);
    return undefined;
  }
  try {
    return parseCsv(text, path);
  } catch (error) {
    problems.push((error as Error).message);
    return undefined;
  }
}

/** Reads the manifest and the tabs the summary needs; throws every problem found, so no summary is built from a partial export. */
export async function loadExport(dir: string, schema: Schema): Promise<Record<string, Table>> {
  const problems: string[] = [];
  const manifest = await readTable(join(dir, "manifest.csv"), problems);
  if (manifest) for (const column of MANIFEST_COLUMNS.filter((c) => !manifest.header.includes(c))) problems.push(`${manifest.file}: missing column "${column}"`);
  const tables: Record<string, Table> = {};
  for (const [tab, columns] of Object.entries(REQUIRED)) {
    const table = await readTable(join(dir, tabFileName(tab)), problems);
    if (!table) continue;
    tables[tab] = table;
    for (const column of columns.filter((c) => !table.header.includes(c))) problems.push(`${table.file}: missing column "${column}"`);
    for (const finding of validateTable(schema, tab, table).filter((f) => f.row !== undefined)) {
      problems.push(`${finding.file}: row ${finding.row}: ${finding.field}: ${finding.message}`);
    }
  }
  if (problems.length > 0) throw new InputError(problems);
  return tables;
}
