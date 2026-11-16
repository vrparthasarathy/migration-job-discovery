import { test } from "node:test";
import assert from "node:assert/strict";
import { add, ok, set, setup, snapshot } from "./support.ts";

test("[B07] running twice on the same inputs gives identical files, with no timestamp or path in them", async () => {
  const f = await setup({
    "mr-1": [set("Use Cases", "Daily Report", "current_version", "2", "1"), add("Questions", "Daily Report/Q9", "question_text", "Which time zone does the daily report use?"), set("Use Cases", "Invoice Feed", "vendor", "X", "Wrong")],
    "mr-2": [set("Use Cases", "Nightly Sync", "vendor", "Beta Inc", "Beta")],
  });
  const first = await ok(f);
  const files = await snapshot(f.out);
  assert.equal(Object.keys(files).length, 4);
  const second = await ok(f);
  assert.deepEqual(await snapshot(f.out), files);
  assert.equal(second.stdout, first.stdout);
  const all = Object.values(files).join("");
  assert.doesNotMatch(all, new RegExp(f.root.replaceAll("/", "\\/")));
  assert.doesNotMatch(all, /\d{4}-\d{2}-\d{2}T\d/);
  const fresh = await setup({ "mr-1": [set("Use Cases", "Daily Report", "current_version", "2", "1"), add("Questions", "Daily Report/Q9", "question_text", "Which time zone does the daily report use?"), set("Use Cases", "Invoice Feed", "vendor", "X", "Wrong")], "mr-2": [set("Use Cases", "Nightly Sync", "vendor", "Beta Inc", "Beta")] });
  await ok(fresh);
  assert.deepEqual(Object.values(await snapshot(fresh.out)), Object.values(files), "another folder gives the same content");
});
