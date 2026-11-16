import { test } from "node:test";
import assert from "node:assert/strict";
import { access, readdir } from "node:fs/promises";
import { join } from "node:path";
import { readWorkbook } from "../src/readback.ts";
import { AS_OF, SHEETS, dataCopy, generate, tempDir } from "./support.ts";

async function run(extra: string[] = []) {
  const out = join(await tempDir(), "out.xlsx");
  const result = generate(["--out", out, "--as-of", AS_OF, ...extra]);
  return { out, result };
}

test("[B1] generate writes one .xlsx with the eight sheets in order", async () => {
  const { out, result } = await run();
  assert.equal(result.status, 0, result.stderr);
  const book = await readWorkbook(out);
  assert.deepEqual(book.sheets.map((s) => s.name), SHEETS);
  assert.deepEqual((await readdir(join(out, ".."))).sort(), ["out.xlsx"], "no temporary file is left behind");
});

test("[B1] bad usage exits 2 and writes no file", async () => {
  const dir = await tempDir();
  const out = join(dir, "out.xlsx");
  for (const args of [[], ["generate"], ["--out", out], ["--out", out, "--as-of", "2026-13-40"], ["--as-of", AS_OF]]) {
    const result = generate(args);
    assert.equal(result.status, 2, args.join(" "));
    assert.match(result.stderr, /usage/i);
  }
  await assert.rejects(access(out));
});

test("[B2] two runs on the same data and as-of date read back identically", async () => {
  const a = await run();
  const b = await run();
  assert.equal(a.result.status, 0, a.result.stderr);
  assert.equal(b.result.status, 0, b.result.stderr);
  const first = await readWorkbook(a.out);
  const second = await readWorkbook(b.out);
  assert.ok(first.sheets[1]!.rows.length > 2, "the sheets hold data");
  assert.ok(Object.keys(first.sheets[2]!.validations).length > 0, "the dropdowns are compared");
  assert.ok(Object.keys(first.sheets[2]!.formats).length > 0, "the formats are compared");
  assert.deepEqual(second, first);
});

test("[B2] a different as-of date changes the computed review columns only", async () => {
  const a = await run();
  const out = join(await tempDir(), "later.xlsx");
  assert.equal(generate(["--out", out, "--as-of", "2026-11-23"]).status, 0);
  const first = (await readWorkbook(a.out)).sheets[2]!;
  const later = (await readWorkbook(out)).sheets[2]!;
  const days = first.rows[1]!.indexOf("Days past original due");
  assert.notDeepEqual(later.rows, first.rows);
  assert.equal(later.rows[3]![days], 8);
  assert.equal(first.rows[3]![days], 3);
});

async function stops(file: string, mutate: (rows: Record<string, string>[]) => void, pattern: RegExp) {
  const data = await dataCopy(file, mutate);
  const { out, result } = await run(["--data", data]);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, pattern);
  assert.equal(result.stdout, "");
  await assert.rejects(access(out), "no file is written");
}

test("[B5] a dangling reference stops generation, names it and writes no file", async () => {
  await stops("questions.csv", (rows) => (rows[0]!.use_case_ref = "UC-999"), /questions\.csv.*use_case_ref.*UC-999/);
});

test("[B5] a value outside the schema's list stops generation, names it and writes no file", async () => {
  await stops("use-cases.csv", (rows) => (rows[0]!.stage = "bogus-stage"), /use-cases\.csv.*stage.*bogus-stage/);
});

test("[B5] a secret-like value stops generation, names the column and writes no file", async () => {
  await stops("use-cases.csv", (rows) => (rows[0]!.notes_internal = "password=hunter2hunter2"), /use-cases\.csv.*notes_internal.*secret/i);
});

test("[B5] an unreadable data folder stops generation with exit 1 and writes no file", async () => {
  const { out, result } = await run(["--data", join(await tempDir(), "missing")]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /error/i);
  await assert.rejects(access(out));
});
