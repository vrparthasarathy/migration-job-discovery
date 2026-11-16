import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { getTab, tabFileName } from "../tracker-tools/tracker-tables/src/schema.ts";
import { revisionOfThreeVendors, sameNamePairExport, threeVendorExport } from "./fixtures.ts";
import { reconcile, rows, schema, snapshot, summarize, text, workspace, writeExport, writeProposal, type Workspace } from "./support.ts";

const VENDORS = ["acme", "beta", "gamma"];
const NAMES = ["Acme", "Beta", "Gamma"];
const own: Record<string, string> = { acme: "Acme", beta: "Beta", gamma: "Gamma" };

/** Runs the reconciler and the summary on the three-vendor fixture; both must succeed. */
async function threeVendorRun(): Promise<Workspace> {
  const w = await workspace();
  await writeExport(w.exportDir, threeVendorExport());
  await writeProposal(w.proposals, "mr-12", revisionOfThreeVendors);
  const reconciled = await reconcile(w);
  assert.equal(reconciled.status, 0, reconciled.stderr);
  const summarized = await summarize(w);
  assert.equal(summarized.status, 0, summarized.stderr);
  return w;
}

test("[B07] each vendor folder holds only vendor-visible columns and that vendor's released question rows", async () => {
  const w = await threeVendorRun();
  const s = await schema();
  assert.deepEqual((await readdir(join(w.out, "vendor")).catch(() => [] as string[])).sort(), VENDORS);
  for (const slug of VENDORS) {
    const dir = join(w.out, "vendor", slug);
    for (const tab of ["Use Cases", "Questions", "Identity & Access", "Batches"]) {
      const table = await rows(join(dir, tabFileName(tab)));
      const visible = getTab(s, tab).columns.filter((c) => c.visibility === "vendor").map((c) => c.column);
      assert.ok(table.every((r) => Object.keys(r).every((column) => visible.includes(column))), `${slug} ${tab} columns are all vendor-visible`);
      assert.ok(table.every((r) => !("vendor" in r) || r.vendor === own[slug]), `${slug} ${tab} rows are the vendor's own`);
    }
    // No tab that is internal only is written for a vendor.
    const files = Object.keys(await snapshot(dir)).sort();
    assert.deepEqual(files, ["batches.csv", "field-updates.csv", "identity-access.csv", "questions.csv", "use-cases.csv"], `${slug} files`);
  }
  assert.deepEqual((await rows(join(w.out, "vendor", "acme", "questions.csv"))).map((r) => r.question_ref), ["QN-0001"], "Acme: the released row only, not QN-0002");
  assert.deepEqual((await rows(join(w.out, "vendor", "beta", "questions.csv"))).map((r) => r.question_ref), ["QN-0003"]);
  assert.deepEqual((await rows(join(w.out, "vendor", "gamma", "questions.csv"))).map((r) => r.question_ref), ["QN-0004"], "Gamma: the released row only, not QN-0005");
});

test("[B07] no vendor output holds an internal column, group, link, mapping, unreleased question row or another vendor's row", async () => {
  const w = await threeVendorRun();
  const internalColumns = ["stage", "our_owner", "notes_internal", "workflow_candidate", "status", "text_review", "proposal_refs", "last_updated", "blocks_mapping", "captured_on", "current_spec_text", "grouping_impact", "affected_workflow"];
  const forbidden: Record<string, string[]> = {
    acme: ["archive retention", "Retry scheduling", "internal-only-note", "QG-001", "QL-000", "MP-001", "WD-001", "Report Builder", "Lead Rae", "Nightly", "Invoice", "Beta", "Gamma", "QN-0002", "QN-0003", "QN-0004", "QN-0005", "UC-002", "UC-003", "weekdays"],
    beta: ["Daily Report", "Invoice", "Acme", "Gamma", "Report Builder", "Lead Rae", "internal-only-note", "UTC plus two", "Retry scheduling", "QG-001", "QL-000", "MP-001", "QN-0001", "QN-0002", "QN-0004", "QN-0005", "UC-001", "UC-003"],
    gamma: ["Daily Report", "Nightly", "Acme", "Beta", "Report Builder", "Lead Rae", "internal-only-note", "credit notes", "QG-001", "QL-000", "MP-001", "QN-0001", "QN-0002", "QN-0003", "QN-0005", "UC-001", "UC-002", "weekdays"],
  };
  for (const slug of VENDORS) {
    const files = await snapshot(join(w.out, "vendor", slug));
    assert.match(files["questions.csv"] ?? "", new RegExp(`${own[slug]!}`), `${slug} has its own released question row, so the checks below are not empty`);
    for (const [name, content] of Object.entries(files)) {
      const header = content.split("\n")[0]!.split(",");
      for (const column of internalColumns) assert.equal(header.includes(column), false, `${slug}/${name} must not have the internal column ${column}`);
    }
    const everything = Object.values(files).join("\n");
    for (const word of forbidden[slug]!) assert.equal(everything.includes(word), false, `${slug} must not contain ${word}`);
  }
});

test("[B07] the summary is the only place the three tracks appear together", async () => {
  const w = await threeVendorRun();
  const everything = { ...(await snapshot(w.out)), [w.summary]: await text(w.summary) };
  const together = Object.entries(everything)
    .filter(([, content]) => NAMES.every((name) => content.includes(name)))
    .map(([name]) => name);
  assert.deepEqual(together, [w.summary], "only the summary names all three vendors");
  for (const slug of VENDORS) {
    for (const [name, content] of Object.entries(await snapshot(join(w.out, "vendor", slug)))) {
      assert.deepEqual(NAMES.filter((n) => content.includes(n)).length <= 1, true, `${slug}/${name} names at most its own vendor`);
    }
  }
  const summary = await text(w.summary);
  assert.match(summary, /INTERNAL/);
  // The summary counts every track and lists the clarification-requested row (answer complete) as overdue, and the complete answers awaiting review apart.
  const overdue = summary.slice(summary.indexOf("## 2. Overdue questions"), summary.indexOf("## 3."));
  const awaiting = overdue.slice(overdue.indexOf("### Awaiting lead review"));
  const overdueOnly = overdue.slice(0, overdue.indexOf("### Awaiting lead review"));
  assert.match(overdueOnly, /QN-0003/);
  assert.equal(/QN-0001|QN-0004/.test(overdueOnly), false, "a complete answer awaiting review is not vendor-overdue");
  assert.match(awaiting, /QN-0001/);
  assert.match(awaiting, /QN-0004/);
  assert.equal(/QN-0002|QN-0005/.test(summary), false, "unreleased rows are never counted");
});

test("[B07] vendor field updates carry only that vendor's visible rows and nothing is written into the export", async () => {
  const w = await workspace();
  await writeExport(w.exportDir, threeVendorExport());
  await writeProposal(w.proposals, "mr-12", revisionOfThreeVendors);
  const before = await snapshot(w.exportDir);
  assert.equal((await reconcile(w)).status, 0);
  assert.deepEqual(await snapshot(w.exportDir), before, "the export is only read");
  assert.deepEqual((await rows(join(w.out, "vendor", "acme", "field-updates.csv"))).map((u) => [u.record, u.field]), [["UC-001", "spec_link"]]);
  assert.deepEqual((await rows(join(w.out, "vendor", "beta", "field-updates.csv"))).map((u) => [u.record, u.field]), [["UC-002", "current_version"]]);
  assert.deepEqual((await rows(join(w.out, "vendor", "gamma", "field-updates.csv"))).map((u) => [u.record, u.field]), [["UC-003", "current_version"]]);
  const links = (await rows(join(w.out, "suggestions.csv"))).filter((r) => r.kind === "link");
  assert.equal(links.length, 1, "the cross-vendor link suggestion is internal");
  assert.equal(Object.entries(await snapshot(join(w.out, "vendor"))).some(([, content]) => content.includes("similar_to")), false);
});

test("[B07] two vendors' same-named use cases stay apart: each vendor folder holds only its own row, answer and updates", async () => {
  const w = await workspace();
  await writeExport(w.exportDir, sameNamePairExport());
  await writeProposal(w.proposals, "mr-22", [
    { tab: "Use Cases", op: "set", key: "uc-acme-daily-report", field: "current_version", value: "2", base: "1" },
    { tab: "Use Cases", op: "set", key: "uc-beta-daily-report", field: "current_version", value: "2", base: "1" },
  ]);
  const reconciled = await reconcile(w);
  assert.equal(reconciled.status, 0, reconciled.stderr);
  const other: Record<string, string[]> = {
    acme: ["Beta", "beta", "Beta-only answer", "UC-002", "QN-0002", "BT-002"],
    beta: ["Acme", "acme", "Acme-only answer", "UC-001", "QN-0001", "BT-001"],
  };
  for (const [slug, vendor, useCase, question] of [["acme", "Acme", "UC-001", "QN-0001"], ["beta", "Beta", "UC-002", "QN-0002"]] as const) {
    const dir = join(w.out, "vendor", slug);
    assert.deepEqual((await rows(join(dir, "use-cases.csv"))).map((r) => [r.use_case_ref, r.vendor]), [[useCase, vendor]], `${slug}: its own use case row only`);
    assert.deepEqual((await rows(join(dir, "questions.csv"))).map((r) => r.question_ref), [question], `${slug}: its own question row only`);
    assert.deepEqual((await rows(join(dir, "field-updates.csv"))).map((u) => [u.record, u.field]), [[useCase, "current_version"]], `${slug}: its own update only`);
    const everything = Object.values(await snapshot(dir)).join("\n");
    for (const word of other[slug]!) assert.equal(everything.includes(word), false, `${slug} must not contain ${word}`);
  }
});
