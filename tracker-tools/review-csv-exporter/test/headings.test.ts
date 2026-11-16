import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { exportReview, ok, put, review, set, setup, snapshot, text, type Fixture } from "./support.ts";
import { fileURLToPath } from "node:url";

const DEFAULT = fileURLToPath(new URL("../data/review-headings.csv", import.meta.url));
const change = set("Use Cases", "Nightly Sync", "vendor", "Beta Inc", "Beta");

async function withHeadings(f: Fixture, edit: (text: string) => string): Promise<string> {
  const path = join(f.root, "headings.csv");
  await put(path, edit(await text(DEFAULT)));
  return path;
}

async function rejects(edit: (text: string) => string, pattern: RegExp): Promise<void> {
  const f = await setup({ "mr-1": [change] });
  const path = await withHeadings(f, edit);
  const outcome = await exportReview(f, "--headings", path);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, pattern);
  assert.deepEqual(await snapshot(f.out), {});
}

test("[B01] a changed headings file changes the shown fields and headings with no code change", async () => {
  const f = await setup({ "mr-1": [change, set("Use Cases", "Nightly Sync", "current_version", "2", "1")] });
  const path = await withHeadings(f, (t) => t.replace("Use Cases,vendor,vendor,,", "Use Cases,vendor,Vendor name,,").replace("Use Cases,current_version,current_version,,\n", "").replace("suffix_state,state", "suffix_state,review state").replace("Review,kind,kind", "Review,kind,Type").replace("Review,reason,reason,,\n", ""));
  await ok(f, "--headings", path);
  const [row] = await review(f, "review-use-cases.csv");
  assert.equal(row!.reason, "reason", "a key the file does not name is headed by itself");
  assert.equal(row!["Vendor name (proposed)"], "Beta Inc");
  assert.equal(row!["Vendor name (review state)"], "update");
  assert.equal(row!.Type, "update");
  assert.match(row!.other_changes!, /^current_version: 1 -> 2 \[update\]$/);
});

test("[B08] a headings file naming an unknown tab or column, a duplicate, a missing key or a secret stops the run", async () => {
  await rejects((t) => t + "Nowhere,x,x,,\n", /headings\.csv: line \d+: unknown tab "Nowhere"/);
  await rejects((t) => t + "Use Cases,no_such,x,,\n", /unknown column "no_such" for tab "Use Cases"/);
  await rejects((t) => t + "Use Cases,vendor,again,,\n", /duplicate column "vendor"/);
  await rejects((t) => t + "Review,nonsense,x,,\n", /unknown review key "nonsense"/);
  await rejects((t) => t + "Review,kind,again,,\n", /duplicate review key "kind"/);
  await rejects((t) => t.replace("Review,kind,kind,,\n", ""), /missing required review key "kind"/);
  await rejects((t) => t.replace("Use Cases,stage,stage", "Use Cases,stage,"), /line \d+: heading for "stage" is empty/);
  await rejects((t) => t.replace("Use Cases,stage,stage", "Use Cases,stage,vendor"), /heading "vendor \(current\)" is used twice/);
  await rejects((t) => t + "Use Cases,our_owner,password=hunter2hunter2,,\n", /secret-looking value/);
  await rejects((t) => t.replace("tab,column,heading", "tab,column,title"), /line 1: missing column "heading"/);
  await rejects(() => '"unterminated', /line 1: .*unterminated/);
});

test("[B08] a missing headings file stops the run, and a non-proposable tab in it is ignored", async () => {
  const f = await setup({ "mr-1": [change] });
  const outcome = await exportReview(f, "--headings", join(f.root, "absent.csv"));
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /absent\.csv: cannot read headings file \(ENOENT\)/);
  const path = await withHeadings(f, (t) => t + "Batches,status,status,,\n");
  await ok(f, "--headings", path);
  assert.equal((await review(f, "review-use-cases.csv")).length, 1);
});
