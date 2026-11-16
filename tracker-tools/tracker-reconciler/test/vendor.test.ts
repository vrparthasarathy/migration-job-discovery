import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { getTab, tabFileName } from "../../tracker-tables/src/schema.ts";
import { baseExport } from "./fixtures.ts";
import { fixture, MANIFEST, reconcile, rows, schema, snapshot, text, writeExport, writeProposal, type Fixture } from "./support.ts";

async function threeVendors(extraManifest: Record<string, string>[] = []): Promise<Fixture> {
  const data = baseExport();
  data.Questions!.push({ question_ref: "QN-0005", use_case_ref: "UC-001", use_case_name: "Daily Report", vendor: "Acme", spec_refs: "uc-acme-daily-report/Q3@v1", question_text: "Second released Acme question", batch_ref: "BT-001", released_on: "2026-11-12", due_on: "2026-11-16", answer_status: "not-answered", status: "released", notes_internal: "acme-internal-question-note" });
  data.Questions!.push({ question_ref: "QN-0006", use_case_ref: "UC-003", use_case_name: "Invoice Feed", vendor: "Gamma", spec_refs: "uc-gamma-invoice-feed/Q2@v1", question_text: "Unreleased Gamma question", status: "captured" });
  data["Question Links"]!.push({ link_ref: "QL-0002", group_ref: "QG-001", question_ref: "QN-0005", link_status: "suggested" });
  const f = await fixture();
  await writeExport(f.exportDir, data, [...MANIFEST, ...extraManifest]);
  await writeProposal(f.proposals, "mr-12", [
    { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "spec_link", value: "https://specs.example/daily-v2", base: "https://specs.example/daily" },
    { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "grouping_impact", value: "could-affect", base: "" },
    { tab: "Use Cases", op: "set", key: "uc-beta-nightly-sync", field: "current_version", value: "2", base: "1" },
    { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "vendor", value: "Beta", base: "Acme" },
    { tab: "Questions", op: "set", key: "uc-acme-daily-report/Q1", field: "current_spec_text", value: "Which time zone does the daily report use for timestamps?", base: "Which time zone does the daily report use?" },
    { tab: "Questions", op: "set", key: "uc-acme-daily-report/Q2", field: "spec_refs", value: "uc-acme-daily-report/Q2@v2", base: "uc-acme-daily-report/Q2@v1" },
    { tab: "Identity & Access", op: "link", key: "uc-acme-daily-report//api/report/prod", field: "evidence_refs", value: "QN-0002;notes/doc.md" },
    { tab: "Questions", op: "add", key: "uc-acme-daily-report/Q9", field: "use_case_name", value: "Daily Report" },
    { tab: "Questions", op: "add", key: "uc-acme-daily-report/Q9", field: "question_text", value: "How are retries scheduled for the nightly sync?" },
  ]);
  return f;
}

async function ls(dir: string): Promise<string[]> {
  return readdir(dir).catch(() => []);
}

async function listing(dir: string): Promise<string[]> {
  return (await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => [])).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort();
}

test("[B08] each vendor folder holds only that vendor's released question rows and vendor-visible columns and nothing internal", async () => {
  const f = await threeVendors();
  const outcome = await reconcile(f);
  assert.equal(outcome.status, 0, outcome.stderr);
  const s = await schema();
  assert.deepEqual(await ls(join(f.out, "vendor")), ["acme", "beta", "gamma"]);
  for (const slug of ["acme", "beta", "gamma"]) {
    const dir = join(f.out, "vendor", slug);
    const files = await listing(dir);
    assert.deepEqual(files, ["batches.csv", "field-updates.csv", "identity-access.csv", "questions.csv", "use-cases.csv"], `${slug} files`);
    for (const tab of ["Use Cases", "Questions", "Identity & Access", "Batches"]) {
      const table = await rows(join(dir, tabFileName(tab)));
      assert.ok(table.every((r) => Object.keys(r).every((c) => getTab(s, tab).columns.some((col) => col.column === c && col.visibility === "vendor"))), `${slug} ${tab} columns`);
    }
  }
  const acme = await rows(join(f.out, "vendor", "acme", "questions.csv"));
  assert.deepEqual(acme.map((r) => r.question_ref), ["QN-0001", "QN-0005"], "released Acme rows only");
  assert.equal(acme[0]!.answer, "UTC plus two per the SLA", "a vendor's own answer stays on its row");
  assert.deepEqual((await rows(join(f.out, "vendor", "gamma", "questions.csv"))).map((r) => r.question_ref), ["QN-0004"]);

  const forbidden: Record<string, string[]> = {
    acme: ["archive retention", "Retry scheduling", "internal-only-note", "acme-internal-question-note", "QG-001", "QL-000", "MP-001", "Report Builder", "Nightly", "Beta", "Gamma", "Invoice", "tax codes", "retries", "QN-0002", "QN-0003", "QN-0006"],
    beta: ["Daily Report", "Acme", "Gamma", "UTC plus two", "Retry scheduling", "QG-001", "QL-0001", "Unreleased"],
    gamma: ["Daily Report", "Acme", "Beta", "Unreleased Gamma question", "QN-0006", "QG-001", "QL-0001"],
  };
  for (const [slug, words] of Object.entries(forbidden)) {
    const everything = Object.values(await snapshot(join(f.out, "vendor", slug))).join("\n");
    for (const word of words) assert.equal(everything.includes(word), false, `${slug} must not contain ${word}`);
  }
});

test("[B08] vendor field updates hold only vendor-visible columns of that vendor's visible rows and no hidden reference", async () => {
  const f = await threeVendors();
  assert.equal((await reconcile(f)).status, 0);
  const acme = await rows(join(f.out, "vendor", "acme", "field-updates.csv"));
  assert.deepEqual(acme.map((u) => [u.tab, u.record, u.field, u.current_value, u.proposed_value]), [
    ["Use Cases", "UC-001", "spec_link", "https://specs.example/daily", "https://specs.example/daily-v2"],
    ["Identity & Access", "AX-001", "evidence_refs", "", "notes/doc.md"],
  ]);
  const beta = await rows(join(f.out, "vendor", "beta", "field-updates.csv"));
  assert.deepEqual(beta.map((u) => [u.record, u.field, u.proposed_value]), [["UC-002", "current_version", "2"]]);
  assert.deepEqual(await rows(join(f.out, "vendor", "gamma", "field-updates.csv")), []);
  const internal = await rows(join(f.out, "field-updates.csv"));
  assert.ok(internal.some((u) => u.field === "vendor" && u.proposed_value === "Beta"), "the vendor change is an internal update");
  assert.equal((await text(join(f.out, "vendor", "acme", "field-updates.csv"))).includes("Beta"), false, "another vendor's name never reaches a vendor");
  assert.ok(internal.some((u) => u.field === "evidence_refs" && u.proposed_value === "QN-0002;notes/doc.md"));
  assert.ok(internal.some((u) => u.field === "current_spec_text"));
});

test("[B08] cross-vendor link suggestions and groups appear only in the internal outputs", async () => {
  const f = await threeVendors();
  assert.equal((await reconcile(f)).status, 0);
  const links = (await rows(join(f.out, "suggestions.csv"))).filter((r) => r.kind === "link");
  assert.deepEqual(links.map((l) => [l.related_record, l.review]), [["QN-0003", "likely"]]);
  assert.match(await text(join(f.out, "reconciliation-report.md")), /internal/i);
});

test("[B08] --scope limits the vendor folders to that vendor and an unknown scope stops the run", async () => {
  const f = await threeVendors([{ scope: "acme", workbook: "acme.xlsx", exported_at: "2026-11-20", exported_by: "lead-a" }]);
  assert.equal((await reconcile(f, "--scope", "acme")).status, 0);
  assert.deepEqual(await ls(join(f.out, "vendor")), ["acme"]);
  const bad = await reconcile({ ...f, out: join(f.root, "never") }, "--scope", "zeta");
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /manifest\.csv.*zeta/);
  assert.deepEqual(await snapshot(join(f.root, "never")), {});
});

test("[B08] two vendor names that share a folder name stop the run with nothing written", async () => {
  const data = baseExport();
  data["Use Cases"]![1] = { ...data["Use Cases"]![1]!, vendor: "ACME" };
  const f = await fixture();
  await writeExport(f.exportDir, data);
  await writeProposal(f.proposals, "mr-12", [{ tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "current_version", value: "2", base: "1" }]);
  const outcome = await reconcile(f);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /"Acme".*"ACME"|"ACME".*"Acme"/);
  assert.deepEqual(await snapshot(f.out), {});
});
