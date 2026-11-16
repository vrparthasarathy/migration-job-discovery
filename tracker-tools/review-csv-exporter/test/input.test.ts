import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { cli, exportReview, ok, put, set, setup, snapshot, text, type Fixture } from "./support.ts";

async function fails(f: Fixture, pattern: RegExp, ...more: string[]): Promise<void> {
  const before = await snapshot(f.out);
  const outcome = await exportReview(f, ...more);
  assert.equal(outcome.status, 1, outcome.stdout);
  assert.match(outcome.stderr, pattern);
  assert.deepEqual(await snapshot(f.out), before, "nothing is written");
}

const good = set("Use Cases", "Nightly Sync", "vendor", "Beta Inc", "Beta");

test("[B08] an invalid proposal stops the run, names the file and line and writes nothing", async () => {
  const f = await setup({ "mr-1": [good, set("Use Cases", "Nightly Sync", "no_such_field", "x", "")] });
  await fails(f, /mr-1\/tracker-updates\.csv: line 3: unknown field "no_such_field"/);
});

test("[B08] a secret-looking value in a proposal or the export stops the run without echoing it", async () => {
  const f = await setup({ "mr-1": [set("Use Cases", "Nightly Sync", "vendor", "password: hunter2hunter2", "Beta")] });
  await fails(f, /line 2: secret-looking value in "value"/);
  const g = await setup({ "mr-1": [good] });
  await put(join(g.exportDir, "use-cases.csv"), (await text(join(g.exportDir, "use-cases.csv"))).replace("Beta", "token=abcdef123456"));
  const outcome = await exportReview(g);
  assert.equal(outcome.status, 1);
  assert.match(outcome.stderr, /secret-looking value/);
  assert.doesNotMatch(outcome.stderr, /abcdef123456/);
});

test("[B08] an unknown scope, a missing tracker export or proposals and an overlapping output stop the run", async () => {
  const f = await setup({ "mr-1": [good] });
  await fails(f, /manifest\.csv: no row for scope "nowhere"/, "--scope", "nowhere");
  const missing = { ...f, exportDir: join(f.root, "absent") };
  await fails(missing, /absent\/manifest\.csv: cannot read file \(ENOENT\)/);
  const empty = await setup({});
  await mkdir(empty.proposals, { recursive: true });
  await fails(empty, /no tracker-updates\.csv files found/);
  for (const out of [f.exportDir, join(f.proposals, "mr-1"), f.root]) {
    const outcome = await cli("export-review", "--export", f.exportDir, "--proposals", f.proposals, "--out", out);
    assert.equal(outcome.status, 1);
    assert.match(outcome.stderr, /overlaps the input/);
  }
  await put(join(f.root, "afile"), "x");
  const file = await cli("export-review", "--export", f.exportDir, "--proposals", f.proposals, "--out", join(f.root, "afile"));
  assert.match(file.stderr, /is not a folder/);
  assert.equal(await text(join(f.root, "afile")), "x");
});

test("[B08] bad usage exits 2 and a failure exits 1 with nothing written", async () => {
  for (const args of [[], ["other"], ["export-review"], ["export-review", "--bogus", "x"], ["export-review", "--export"]]) {
    const outcome = await cli(...args);
    assert.equal(outcome.status, 2, args.join(" "));
    assert.match(outcome.stderr, /usage: export-review/);
  }
  const f = await setup({ "mr-1": [good] });
  const outcome = await ok(f);
  assert.equal(outcome.status, 0);
});
