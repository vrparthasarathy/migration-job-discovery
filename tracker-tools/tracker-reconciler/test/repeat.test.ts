import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseCsv, type Row } from "../../tracker-tables/src/csv.ts";
import { getTab, tabFileName } from "../../tracker-tables/src/schema.ts";
import { baseExport } from "./fixtures.ts";
import { cli, examplePath, fixture, MANIFEST, put, reconcile, rows, schema, snapshot, writeExport, writeProposal, type PRow } from "./support.ts";

const busy: PRow[] = [
  { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "current_version", value: "2", base: "1" },
  { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "grouping_impact", value: "unknown", base: "" },
  { tab: "Use Cases", op: "suggest", key: "uc-acme-daily-report", field: "our_owner", value: "Zed" },
  { tab: "Use Cases", op: "set", key: "uc-beta-nightly-sync", field: "current_version", value: "2", base: "0" },
  { tab: "Questions", op: "add", key: "uc-beta-nightly-sync/Q2", field: "use_case_name", value: "Nightly Sync" },
  { tab: "Questions", op: "add", key: "uc-acme-daily-report/Q3", field: "question_text", value: "Which time zone is used by the daily report?" },
  { tab: "Questions", op: "add", key: "uc-acme-daily-report/Q4", field: "use_case_name", value: "Daily Report" },
  { tab: "Questions", op: "set", key: "uc-acme-daily-report/Q1", field: "released_on", value: "2026-12-01", base: "2026-11-12" },
];

test("[B03] the same inputs give byte-identical outputs, including into a directory from an earlier run", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, baseExport());
  await writeProposal(f.proposals, "mr-12", busy);
  assert.equal((await reconcile(f)).status, 0);
  const first = await snapshot(f.out);
  assert.ok(Object.keys(first).length > 4);
  assert.equal((await reconcile(f)).status, 0);
  assert.deepEqual(await snapshot(f.out), first);
  const other = { ...f, out: join(f.root, "elsewhere") };
  assert.equal((await reconcile(other)).status, 0);
  assert.deepEqual(await snapshot(other.out), first);
});

test("[B03] a proposal already reflected in the export, by an equal value or by its update_id in proposal_refs, yields nothing", async () => {
  const data = baseExport();
  data["Use Cases"]![0] = {
    ...data["Use Cases"]![0]!,
    current_version: "2",
    spec_link: "https://lead.example/own-link",
    proposal_refs: "mr-12:Use Cases:uc-acme-daily-report:our_owner;mr-12:Use Cases:uc-acme-daily-report:spec_link",
    our_owner: "Ann",
  };
  data.Questions![0] = { ...data.Questions![0]!, proposal_refs: "mr-12:Questions:uc-acme-daily-report/Q1:status" };
  const f = await fixture();
  await writeExport(f.exportDir, data);
  await writeProposal(f.proposals, "mr-12", [
    { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "current_version", value: "2", base: "1" },
    { tab: "Use Cases", op: "suggest", key: "uc-acme-daily-report", field: "our_owner", value: "Zed" },
    { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "spec_link", value: "https://specs.example/new", base: "https://specs.example/daily" },
    { tab: "Questions", op: "add", key: "uc-acme-daily-report/Q1", field: "use_case_name", value: "Daily Report" },
    { tab: "Questions", op: "add", key: "uc-acme-daily-report/Q1", field: "status", value: "captured" },
  ]);
  assert.equal((await reconcile(f)).status, 0);
  const files = await snapshot(f.out);
  assert.match(files["/reconciliation-report.md"] ?? "", /Reflected in the export: 5\b/);
  assert.deepEqual(await rows(join(f.out, "field-updates.csv")), []);
  assert.deepEqual(await rows(join(f.out, "conflicts.csv")), []);
  assert.deepEqual(await rows(join(f.out, "suggestions.csv")), []);
  assert.equal(Object.keys(files).some((name) => name.includes("additions")), false);
});

test("[B03] a list link already present in the export yields nothing and a new item is appended in order", async () => {
  const data = baseExport();
  data.Questions![0] = { ...data.Questions![0]!, source_links: "doc-a;doc-b" };
  const f = await fixture();
  await writeExport(f.exportDir, data);
  await writeProposal(f.proposals, "mr-12", [
    { tab: "Questions", op: "link", key: "uc-acme-daily-report/Q1", field: "source_links", value: "doc-a" },
    { tab: "Questions", op: "link", key: "uc-acme-daily-report/Q1", field: "source_links", value: "doc-c;doc-a", id: "mr-13" },
    { tab: "Questions", op: "link", key: "uc-acme-daily-report/Q1", field: "text_review", value: "none", id: "mr-14" },
  ]);
  assert.equal((await reconcile(f)).status, 0);
  const updates = await rows(join(f.out, "field-updates.csv"));
  assert.deepEqual(updates.map((u) => [u.field, u.current_value, u.proposed_value]), [["source_links", "doc-a;doc-b", "doc-a;doc-b;doc-c"]]);
});

/** Applies the additions as a lead would by hand: the suggested reference, the spec columns, the suggestions copied and the proposal references. */
async function apply(outDir: string, exportDir: string): Promise<number> {
  const s = await schema();
  const data: Record<string, Row[]> = {};
  const dir = join(outDir, "additions");
  let applied = 0;
  for (const file of await readdir(dir)) {
    const table = parseCsv(await readFile(join(dir, file), "utf8"), file);
    const tab = s.tabs.find((t) => tabFileName(t.tab) === file)!.tab;
    const columns = getTab(s, tab).columns;
    const refColumn = columns.find((c) => c.key && c.type === "ref")!.column;
    data[tab] = table.rows.map((row) => {
      const out: Row = { [refColumn]: row.suggested_ref!, proposal_refs: row.suggested_proposal_refs!, last_updated: "2026-11-21" };
      for (const [name, value] of Object.entries(row)) {
        const plain = name.startsWith("suggested_") ? name.slice("suggested_".length) : name;
        if (columns.some((c) => c.column === plain) && !["ref", "proposal_refs"].includes(plain)) out[plain] = value;
      }
      applied++;
      return out;
    });
  }
  await writeExport(exportDir, data, [{ ...MANIFEST[0]!, exported_at: "2026-11-21" }]);
  return applied;
}

test("[B03] the whole example proposal against an empty export gives additions, and after applying them a second run gives none", async () => {
  const f = await fixture();
  await writeExport(f.exportDir, {});
  await put(join(f.proposals, "website-check-example", "tracker-updates.csv"), await readFile(examplePath, "utf8"));
  const first = await reconcile(f);
  assert.equal(first.status, 0, first.stderr);
  const proposed = parseCsv(await readFile(examplePath, "utf8"), examplePath).rows;
  const id = proposed.find((r) => r.tab === "Use Cases")!.record_key!;
  const uc = await rows(join(f.out, "additions", "use-cases.csv"));
  const qn = await rows(join(f.out, "additions", "questions.csv"));
  assert.deepEqual(uc.map((r) => [r.suggested_ref, r.local_key]), [["UC-001", id]]);
  assert.deepEqual(qn.map((r) => [r.suggested_ref, r.local_key]), ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"].map((q, i) => [`QN-000${i + 1}`, `${id}/${q}`]));
  assert.ok(qn.every((r) => r.trace_source!.includes("@v1#q") && r.trace_spec_version === "v1"));
  const links = (await rows(join(f.out, "suggestions.csv"))).filter((r) => r.kind === "link");
  assert.deepEqual(links.map((l) => [l.record, l.related_record, l.review]), [["QN-0004", "QN-0003", "uncertain-review"]], "the two retry questions are similar and nothing else is");
  assert.equal(await apply(f.out, f.exportDir), 7);

  const second = await reconcile(f);
  assert.equal(second.status, 0, second.stderr);
  const files = await snapshot(f.out);
  assert.equal(Object.keys(files).some((name) => name.includes("additions")), false, "no additions the second time");
  for (const name of ["field-updates.csv", "conflicts.csv", "suggestions.csv"]) assert.deepEqual(await rows(join(f.out, name)), [], name);
  assert.match(files["/reconciliation-report.md"]!, /reflected/i);
  assert.equal((await cli("validate", f.exportDir)).status, 0);
});
