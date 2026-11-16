import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import type { Row, Table } from "../src/csv.ts";
import { getTab, loadSchema, type Schema } from "../src/schema.ts";
import { vendorView } from "../src/vendor_view.ts";

const schemaPath = fileURLToPath(new URL("../../../tracker-data-contract/tracker-schema.csv", import.meta.url));

function table(schema: Schema, tab: string, rows: Row[], extra: string[] = []): Table {
  const header = [...getTab(schema, tab).columns.map((c) => c.column), ...extra];
  return {
    file: `${tab}.csv`,
    header,
    rows: rows.map((r) => Object.fromEntries(header.map((h) => [h, r[h] ?? ""]))),
  };
}

function tables(schema: Schema): Record<string, Table> {
  return {
    "Use Cases": table(
      schema,
      "Use Cases",
      [
        { use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", notes_internal: "secret-note", stage: "sent", lead_flag: "hush" },
        { use_case_ref: "UC-002", use_case_name: "Nightly Sync", vendor: "Beta", notes_internal: "beta-secret" },
        { use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Acme", acknowledged_version: "v1" },
      ],
      ["lead_flag"],
    ),
    Questions: table(schema, "Questions", [
      { question_ref: "QN-0001", use_case_ref: "UC-001", vendor: "Acme", question_text: "Which time zone?", batch_ref: "BT-001", released_on: "2026-11-16", due_on: "2026-11-18", answer: "UTC", answer_status: "answered", status: "released", resolver: "lead-a", notes_internal: "n1" },
      { question_ref: "QN-0002", use_case_ref: "UC-001", vendor: "Acme", question_text: "Unreleased question", released_on: "", status: "captured" },
      { question_ref: "QN-0003", use_case_ref: "UC-002", vendor: "Beta", question_text: "Beta question", released_on: "2026-11-16" },
      { question_ref: "QN-0004", use_case_ref: "UC-002", vendor: "Acme", question_text: "Crossed", batch_ref: "BT-002", released_on: "2026-11-16", due_on: "2026-11-18", status: "released" },
      { question_ref: "QN-0005", use_case_ref: "UC-003", vendor: "Acme", question_text: "Planned batch", batch_ref: "BT-002", released_on: "2026-11-17", due_on: "2026-11-19" },
    ]),
    "Question Groups": table(schema, "Question Groups", [{ group_ref: "QG-001", canonical_text: "grouped" }]),
    "Question Links": table(schema, "Question Links", [{ link_ref: "QL-0001", group_ref: "QG-001", question_ref: "QN-0001" }]),
    Mappings: table(schema, "Mappings", [{ mapping_ref: "MP-001", use_case_ref: "UC-001" }]),
    "Identity & Access": table(schema, "Identity & Access", [
      { access_ref: "AX-001", vendor: "Acme", use_case_ref: "UC-001", endpoint: "/api", evidence_refs: "QN-0002;doc.md;QN-0001", shared_with: "AX-002", shared_request_flag: "shared", consolidated_request_ref: "AX-002", notes_internal: "ax-secret" },
      { access_ref: "AX-002", vendor: "Beta", use_case_ref: "UC-002", endpoint: "/beta" },
    ]),
    Batches: table(schema, "Batches", [
      { batch_ref: "BT-001", vendor: "Acme", use_case_refs: "UC-001;UC-002;UC-003", released_on: "2026-11-16", due_on: "2026-11-18", status: "released", capacity_notes: "cap-secret" },
      { batch_ref: "BT-002", vendor: "Acme", use_case_refs: "UC-003", released_on: "", status: "planned" },
      { batch_ref: "BT-003", vendor: "Beta", use_case_refs: "UC-002", released_on: "2026-11-16" },
    ]),
  };
}

test("[B06] only the vendor's rows and vendor-visible columns come out", async () => {
  const schema = await loadSchema(schemaPath);
  const view = vendorView(schema, tables(schema), "Acme");
  for (const tab of Object.keys(view)) {
    const vendorColumns = getTab(schema, tab).columns.filter((c) => c.visibility === "vendor").map((c) => c.column);
    assert.deepEqual(view[tab]!.header, vendorColumns, tab);
  }
  assert.deepEqual(view["Use Cases"]!.rows.map((r) => r.use_case_ref), ["UC-001", "UC-003"]);
  assert.deepEqual(view["Identity & Access"]!.rows.map((r) => r.access_ref), ["AX-001"]);
  assert.equal(view["Use Cases"]!.rows[0]!.use_case_name, "Daily Report");
  assert.equal(view["Use Cases"]!.rows[1]!.acknowledged_version, "v1");
  const text = JSON.stringify(view);
  for (const leak of ["Beta", "secret", "hush", "lead_flag", "lead-a", "captured"]) {
    assert.equal(text.includes(leak), false, leak);
  }
});

test("[B06] question rows appear only after release, keep their own answer and keep due_on", async () => {
  const schema = await loadSchema(schemaPath);
  const view = vendorView(schema, tables(schema), "Acme");
  assert.deepEqual(view.Questions!.rows.map((r) => r.question_ref), ["QN-0001", "QN-0004", "QN-0005"]);
  const first = view.Questions!.rows[0]!;
  assert.equal(first.answer, "UTC");
  assert.equal(first.answer_status, "answered");
  assert.equal(first.due_on, "2026-11-18");
  assert.equal(first.released_on, "2026-11-16");
  assert.equal("status" in first, false);
});

test("[B06] no Question Groups, Question Links or Mappings tab comes out", async () => {
  const schema = await loadSchema(schemaPath);
  const view = vendorView(schema, tables(schema), "Acme");
  assert.deepEqual(Object.keys(view), ["Use Cases", "Questions", "Identity & Access", "Batches"]);
  assert.equal(JSON.stringify(view).match(/QG-|QL-|MP-/), null);
});

test("[B06] no reference points to an unreleased row or to another vendor's row", async () => {
  const schema = await loadSchema(schemaPath);
  const view = vendorView(schema, tables(schema), "Acme");
  assert.deepEqual(view.Batches!.rows.map((r) => r.batch_ref), ["BT-001"]);
  assert.equal(view.Batches!.rows[0]!.use_case_refs, "UC-001;UC-003");
  const questions = view.Questions!.rows;
  assert.equal(questions.find((r) => r.question_ref === "QN-0001")!.batch_ref, "BT-001");
  assert.equal(questions.find((r) => r.question_ref === "QN-0004")!.use_case_ref, "");
  assert.equal(questions.find((r) => r.question_ref === "QN-0004")!.batch_ref, "");
  assert.equal(questions.find((r) => r.question_ref === "QN-0005")!.batch_ref, "");
  assert.equal(view["Identity & Access"]!.rows[0]!.evidence_refs, "doc.md;QN-0001");
  const text = JSON.stringify(view);
  for (const gone of ["UC-002", "QN-0002", "QN-0003", "BT-002", "BT-003", "AX-002"]) {
    assert.equal(text.includes(gone), false, gone);
  }
});

test("[B06] a table without a vendor column or without released_on gives no rows, and a missing tab is omitted", async () => {
  const schema = await loadSchema(schemaPath);
  const all = tables(schema);
  const noVendor: Table = { file: "q.csv", header: ["question_ref", "released_on"], rows: [{ question_ref: "QN-0001", released_on: "2026-11-16" }] };
  const noRelease: Table = { file: "q.csv", header: ["question_ref", "vendor"], rows: [{ question_ref: "QN-0001", vendor: "Acme" }] };
  assert.deepEqual(vendorView(schema, { ...all, Questions: noVendor }, "Acme").Questions!.rows, []);
  assert.deepEqual(vendorView(schema, { ...all, Questions: noRelease }, "Acme").Questions!.rows, []);
  const sparse: Table = {
    file: "q.csv",
    header: ["question_ref", "vendor", "released_on"],
    rows: [{ question_ref: "QN-0001", released_on: "2026-11-16" }, { question_ref: "QN-0002", vendor: "Acme" }],
  };
  assert.deepEqual(vendorView(schema, { ...all, Questions: sparse }, "Acme").Questions!.rows, []);
  const { Batches: _omit, ...withoutBatches } = all;
  assert.equal("Batches" in vendorView(schema, withoutBatches, "Acme"), false);
});

test("[B06] an empty vendor name is an error, so unassigned rows are never released", async () => {
  const schema = await loadSchema(schemaPath);
  const all = tables(schema);
  all["Use Cases"]!.rows.push({ ...all["Use Cases"]!.rows[0]!, use_case_ref: "UC-009", vendor: " " });
  assert.throws(() => vendorView(schema, all, ""), /vendor/);
  assert.throws(() => vendorView(schema, all, "  "), /vendor/);
  assert.equal(vendorView(schema, all, "Acme")["Use Cases"]!.rows.some((r) => r.use_case_ref === "UC-009"), false);
});

test("[B06] a vendor with no rows gets empty tabs and the input tables are not changed", async () => {
  const schema = await loadSchema(schemaPath);
  const all = tables(schema);
  const before = JSON.stringify(all);
  const view = vendorView(schema, all, "Nobody");
  assert.deepEqual(Object.values(view).map((t) => t.rows.length), [0, 0, 0, 0]);
  vendorView(schema, all, "Acme");
  assert.equal(JSON.stringify(all), before);
});
