import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readCsv, splitList, type Row, type Table } from "../src/csv.ts";
import {
  formatFinding,
  getTab,
  loadSchema,
  orderHeader,
  tabFileName,
  validateTable,
  writeTable,
  type Schema,
} from "../src/schema.ts";

const schemaPath = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));

const dirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "tracker-tables-schema-"));
  dirs.push(dir);
  return dir;
}
after(async () => {
  for (const dir of dirs) await rm(dir, { recursive: true, force: true });
});

let cached: Schema | undefined;
async function schema(): Promise<Schema> {
  cached ??= await loadSchema(schemaPath);
  return cached;
}

function questions(rows: Row[], header?: string[]): Table {
  const columns = header ?? ["question_ref", "use_case_ref", "status", "answer_status", "released_on", "due_on"];
  return { file: "questions.csv", header: columns, rows };
}

test("[B04] the loaded schema matches the tabs, columns, owners and visibility of tracker-schema.csv", async () => {
  const loaded = await schema();
  const file = await readCsv(schemaPath);
  assert.equal(file.rows.length > 50, true);
  const seen: string[] = [];
  for (const row of file.rows) {
    const column = getTab(loaded, row.tab).columns.find((c) => c.column === row.column);
    assert.ok(column, `${row.tab}.${row.column} loaded`);
    assert.equal(column.key, row.key === "yes");
    assert.equal(column.owner, row.owner);
    assert.equal(column.visibility, row.visibility === "V" ? "vendor" : "internal");
    assert.equal(column.type, row.type);
    assert.deepEqual(column.allowed, splitList(row.allowed_values));
    if (!seen.includes(row.tab)) seen.push(row.tab);
  }
  assert.deepEqual(loaded.tabs.map((t) => t.tab), seen);
  assert.equal(loaded.tabs.reduce((n, t) => n + t.columns.length, 0), file.rows.length);
  assert.deepEqual(seen.slice(0, 2), ["Use Cases", "Questions"]);
});

test("[B04] tab file names are kebab-case", () => {
  assert.equal(tabFileName("Use Cases"), "use-cases.csv");
  assert.equal(tabFileName("Identity & Access"), "identity-access.csv");
});

test("[B04] a schema file with the wrong header is an error naming the file", async () => {
  const dir = await tempDir();
  const path = join(dir, "bad-schema.csv");
  await writeFile(path, "tab,column\nUse Cases,use_case_ref\n", "utf8");
  await assert.rejects(() => loadSchema(path), /bad-schema\.csv.*header/);
});

test("[B03] a header without a required column is an error naming the file and column", async () => {
  const findings = validateTable(await schema(), "Questions", questions([], ["use_case_ref", "status"]));
  assert.deepEqual(findings, [
    {
      severity: "error",
      file: "questions.csv",
      field: "question_ref",
      message: 'required column "question_ref" is missing',
    },
  ]);
  assert.equal(formatFinding(findings[0]!), 'questions.csv: question_ref: required column "question_ref" is missing');
});

test("[B03] every required column of a tab is checked", async () => {
  const findings = validateTable(await schema(), "Use Cases", { file: "use-cases.csv", header: ["stage"], rows: [] });
  assert.deepEqual(findings.map((f) => f.field), ["use_case_ref", "use_case_name"]);
});

test("[B03] an unknown column is a warning and is preserved through a write", async () => {
  const loaded = await schema();
  const table = questions(
    [{ question_ref: "QN-0001", lead_note: "keep me", status: "released" }],
    ["lead_note", "status", "question_ref"],
  );
  const findings = validateTable(loaded, "Questions", table);
  assert.deepEqual(findings, [
    { severity: "warning", file: "questions.csv", field: "lead_note", message: 'unknown column "lead_note" is kept as is' },
  ]);
  assert.equal(formatFinding(findings[0]!), 'questions.csv: lead_note: unknown column "lead_note" is kept as is');

  const dir = await tempDir();
  const out = join(dir, "questions.csv");
  await writeTable(out, loaded, "Questions", table);
  assert.equal(await readFile(out, "utf8"), "question_ref,status,lead_note\nQN-0001,released,keep me\n");
});

test("[B02] a table is written in the schema column order, with unknown columns after it", async () => {
  const loaded = await schema();
  assert.deepEqual(orderHeader(loaded, "Questions", ["status", "zzz", "question_ref", "answer", "aaa"]), [
    "question_ref",
    "answer",
    "status",
    "zzz",
    "aaa",
  ]);
});

test("[B05] a bad question status is reported with file, row and field", async () => {
  const findings = validateTable(
    await schema(),
    "Questions",
    questions([
      { question_ref: "QN-0001", status: "released" },
      { question_ref: "QN-0002", status: "done" },
    ]),
  );
  assert.equal(findings.length, 1);
  assert.deepEqual(findings[0], {
    severity: "error",
    file: "questions.csv",
    row: 3,
    field: "status",
    message: '"done" is not one of captured, released, clarification-requested, accepted, incorporated, closed, withdrawn, superseded',
  });
  assert.equal(
    formatFinding(findings[0]!),
    'questions.csv: row 3: status: "done" is not one of captured, released, clarification-requested, accepted, incorporated, closed, withdrawn, superseded',
  );
});

test("[B05] every valid question status and answer status passes", async () => {
  const loaded = await schema();
  const columns = getTab(loaded, "Questions").columns;
  const status = columns.find((c) => c.column === "status")?.allowed ?? [];
  const answer = columns.find((c) => c.column === "answer_status")?.allowed ?? [];
  assert.equal(status.includes("clarification-requested"), true);
  assert.equal(answer.length, 4);
  const rows = status.map((s, i) => ({ question_ref: `QN-${1000 + i}`, status: s, answer_status: answer[i % answer.length]! }));
  assert.deepEqual(validateTable(loaded, "Questions", questions(rows)), []);
});

test("[B05] a bad vendor answer status is reported", async () => {
  const findings = validateTable(await schema(), "Questions", questions([{ question_ref: "QN-0001", answer_status: "maybe" }]));
  assert.deepEqual(findings.map((f) => [f.row, f.field]), [[2, "answer_status"]]);
});

test("[B05] a bad source status and a bad authentication type are reported", async () => {
  const loaded = await schema();
  const useCases = validateTable(loaded, "Use Cases", {
    file: "use-cases.csv",
    header: ["use_case_ref", "use_case_name", "source_status"],
    rows: [{ use_case_ref: "UC-001", use_case_name: "A", source_status: "lost" }],
  });
  assert.deepEqual(useCases.map((f) => [f.file, f.row, f.field]), [["use-cases.csv", 2, "source_status"]]);
  const access = validateTable(loaded, "Identity & Access", {
    file: "identity-access.csv",
    header: ["access_ref", "auth_type"],
    rows: [
      { access_ref: "AX-001", auth_type: "api-credential" },
      { access_ref: "AX-002", auth_type: "password" },
    ],
  });
  assert.deepEqual(access.map((f) => [f.file, f.row, f.field]), [["identity-access.csv", 3, "auth_type"]]);
});

test("[B05] a reference outside the reference format is reported and an empty one is not", async () => {
  const findings = validateTable(
    await schema(),
    "Questions",
    questions([
      { question_ref: "QN-0001", use_case_ref: "UC-001" },
      { question_ref: "QN-0002", use_case_ref: "use case one" },
      { question_ref: "QN-0003", use_case_ref: "" },
      { question_ref: "QN 4", use_case_ref: "UC-002" },
    ]),
  );
  assert.deepEqual(findings.map((f) => [f.row, f.field]), [
    [3, "use_case_ref"],
    [5, "question_ref"],
  ]);
});

test("[B05] a column's own extra allowed value is accepted where the type is a date", async () => {
  const loaded = await schema();
  const table: Table = {
    file: "identity-access.csv",
    header: ["access_ref", "expected_availability"],
    rows: [
      { access_ref: "AX-001", expected_availability: "unknown" },
      { access_ref: "AX-002", expected_availability: "2026-12-01" },
      { access_ref: "AX-003", expected_availability: "soon" },
    ],
  };
  assert.deepEqual(validateTable(loaded, "Identity & Access", table).map((f) => [f.row, f.field]), [[4, "expected_availability"]]);
});

test("[B09] a date that is not YYYY-MM-DD errors with the field name", async () => {
  const findings = validateTable(
    await schema(),
    "Questions",
    questions([
      { question_ref: "QN-0001", released_on: "2026-11-16", due_on: "2026-11-18" },
      { question_ref: "QN-0002", released_on: "16/11/2026" },
      { question_ref: "QN-0003", due_on: "2026-02-30" },
      { question_ref: "QN-0004", released_on: "2026-1-5" },
    ]),
  );
  assert.deepEqual(
    findings.map((f) => [f.severity, f.row, f.field]),
    [
      ["error", 3, "released_on"],
      ["error", 4, "due_on"],
      ["error", 5, "released_on"],
    ],
  );
  assert.match(findings[0]!.message, /YYYY-MM-DD/);
});

test("[B10] an unknown tab name is an error that lists the known tabs", async () => {
  const loaded = await schema();
  const known = "Use Cases, Questions, Question Groups, Question Links, Mappings, Identity & Access, Batches";
  assert.throws(() => getTab(loaded, "Nope"), (e: Error) => e.message === `unknown tab "Nope"; known tabs: ${known}`);
  assert.throws(() => validateTable(loaded, "Nope", questions([])), /unknown tab "Nope"; known tabs: Use Cases/);
});
