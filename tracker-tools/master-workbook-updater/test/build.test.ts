import assert from "node:assert/strict";
import { test } from "node:test";
import { baseExport, lib, ok, readBack, setup, sheetsOf } from "./support.ts";

test("[B1] a master bootstrapped from an export holds every tab in the sample layout", async () => {
  const env = await setup();
  const w = await lib();
  const sheets = await sheetsOf(env.master);
  assert.deepEqual(sheets.map((s) => s.name), ["Read Me", "Use Cases", "Questions", "Identity & Access", "Workflow Mappings", "Question Groups", "Question Links", "Batches", "Holidays", "Lists"]);
  assert.equal(sheets.every((s) => s.state === "visible"), true);
  const useCases = sheets.find((s) => s.name === "Use Cases")!;
  assert.deepEqual(useCases.header.slice(0, 3), ["Use case ref", "Use case", "Vendor"]);
  assert.equal(useCases.header.includes("proposal_refs") && useCases.header.includes("last_updated"), true);
  assert.equal(useCases.header.includes("Pending change"), false);

  const data = baseExport();
  const master = await readBack(env.master);
  for (const tab of Object.keys(data)) {
    assert.deepEqual(master.tables[tab]!.rows.map((r) => r[Object.keys(r)[0]!]), data[tab]!.map((r) => r[Object.keys(r)[0]!]), tab);
  }
  assert.equal(master.tables.Questions!.rows[0]!.answer, "UTC plus two per the SLA");
  assert.equal(master.tables["Use Cases"]!.rows[0]!.notes_internal, "internal-only-note");
  assert.ok(w.master["Questions"]!.some((c) => c.column === "review_state"));
});

test("[B1] a run on a downloaded master leaves every input untouched", async () => {
  const env = await setup();
  const before = await (await import("node:fs/promises")).readFile(env.master);
  await ok(env);
  assert.deepEqual(await (await import("node:fs/promises")).readFile(env.master), before);
});
